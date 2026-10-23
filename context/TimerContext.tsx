import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import * as Haptics from "../utils/haptics";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cancelFocusTimerAlarm, scheduleFocusTimerAlarm } from "../utils/notifications";
import { calculateRemainingSeconds } from "../utils/timeMath";

export type PomodoroPhase = "work" | "shortBreak" | "longBreak";

const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};
const SESSIONS_BEFORE_LONG_BREAK = 4;
const STORAGE_KEY = "@zen_active_timer";

interface StoredTimer {
    taskId: string | null;
    taskName: string | null;
    duration: number;
    targetEndTime: number | null;
    timeLeft: number;
    isActive: boolean;
    isCompleted: boolean;
    pomodoroMode: boolean;
    pomodoroPhase: PomodoroPhase;
    pomodoroSession: number;
}

interface TimerContextType {
    taskId: string | null;
    taskName: string | null;
    timeLeft: number;
    duration: number;
    isActive: boolean;
    isCompleted: boolean;
    startTimer: (id: string, name: string, seconds: number) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
    // Pomodoro
    pomodoroMode: boolean;
    pomodoroPhase: PomodoroPhase;
    pomodoroSession: number;
    startPomodoro: (id: string, name: string) => void;
    advancePomodoroPhase: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskName, setTaskName] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);

    // Pomodoro state
    const [pomodoroMode, setPomodoroMode] = useState<boolean>(false);
    const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
    const [pomodoroSession, setPomodoroSession] = useState<number>(1);

    // Target end timestamp in ms (avoids timer drift & handles Android background sleep)
    const targetEndTimeRef = useRef<number | null>(null);
    const pomodoroRef = useRef({ mode: false, phase: "work" as PomodoroPhase, session: 1 });
    const timerInfoRef = useRef({ taskId, taskName, duration });

    useEffect(() => {
        pomodoroRef.current = { mode: pomodoroMode, phase: pomodoroPhase, session: pomodoroSession };
    }, [pomodoroMode, pomodoroPhase, pomodoroSession]);

    useEffect(() => {
        timerInfoRef.current = { taskId, taskName, duration };
    }, [taskId, taskName, duration]);

    // Helper to persist timer state
    const persistState = useCallback(async (state: Partial<StoredTimer>) => {
        try {
            const data: StoredTimer = {
                taskId: timerInfoRef.current.taskId,
                taskName: timerInfoRef.current.taskName,
                duration: timerInfoRef.current.duration,
                targetEndTime: targetEndTimeRef.current,
                timeLeft,
                isActive,
                isCompleted,
                pomodoroMode: pomodoroRef.current.mode,
                pomodoroPhase: pomodoroRef.current.phase,
                pomodoroSession: pomodoroRef.current.session,
                ...state,
            };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // ignore storage failure
        }
    }, [timeLeft, isActive, isCompleted]);

    // Restore timer state on initial mount
    useEffect(() => {
        const restoreTimer = async () => {
            try {
                const savedStr = await AsyncStorage.getItem(STORAGE_KEY);
                if (!savedStr) return;

                const saved: StoredTimer = JSON.parse(savedStr);
                const now = Date.now();

                setTaskId(saved.taskId);
                setTaskName(saved.taskName);
                setDuration(saved.duration);
                setPomodoroMode(saved.pomodoroMode);
                setPomodoroPhase(saved.pomodoroPhase);
                setPomodoroSession(saved.pomodoroSession);

                if (saved.isActive && saved.targetEndTime) {
                    const remaining = calculateRemainingSeconds(saved.targetEndTime, now);
                    if (remaining > 0) {
                        targetEndTimeRef.current = saved.targetEndTime;
                        setTimeLeft(remaining);
                        setIsActive(true);
                        setIsCompleted(false);
                    } else {
                        // Timer completed while app was closed
                        targetEndTimeRef.current = null;
                        setTimeLeft(0);
                        setIsActive(false);
                        setIsCompleted(true);
                        await cancelFocusTimerAlarm();
                    }
                } else if (!saved.isActive && saved.timeLeft > 0 && !saved.isCompleted) {
                    // Was paused
                    targetEndTimeRef.current = null;
                    setTimeLeft(saved.timeLeft);
                    setIsActive(false);
                    setIsCompleted(false);
                }
            } catch {
                // ignore restore error
            }
        };

        restoreTimer();
    }, []);

    // Completion handler
    const handleTimerCompletion = useCallback(() => {
        setIsActive(false);
        setIsCompleted(true);
        targetEndTimeRef.current = null;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        cancelFocusTimerAlarm();

        if (pomodoroRef.current.mode) {
            const { phase, session } = pomodoroRef.current;
            let nextPhase: PomodoroPhase;
            let nextSession = session;

            if (phase === "work") {
                if (session >= SESSIONS_BEFORE_LONG_BREAK) {
                    nextPhase = "longBreak";
                    nextSession = session;
                } else {
                    nextPhase = "shortBreak";
                }

                // Push alert for break
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: nextPhase === "longBreak" ? "Long Break Time" : "Short Break",
                        body: nextPhase === "longBreak" ? "You've earned a 15-minute rest!" : "Take a 5-minute breather.",
                        sound: true,
                    },
                    trigger: null,
                }).catch(() => {});
            } else {
                if (phase === "longBreak" || session >= SESSIONS_BEFORE_LONG_BREAK) {
                    // Full Pomodoro cycle complete!
                    setIsActive(false);
                    setIsCompleted(true);
                    targetEndTimeRef.current = null;
                    persistState({ isActive: false, isCompleted: true, targetEndTime: null });
                    import("../utils/stats").then(({ addFocusSession }) => {
                        addFocusSession(4 * 25);
                    });
                    return;
                }
                nextPhase = "work";
                nextSession = session + 1;
            }

            setPomodoroPhase(nextPhase);
            setPomodoroSession(nextSession);
            const nextDuration = POMODORO_DURATIONS[nextPhase];

            setTimeout(() => {
                const targetEnd = Date.now() + nextDuration * 1000;
                targetEndTimeRef.current = targetEnd;
                setDuration(nextDuration);
                setTimeLeft(nextDuration);
                setIsCompleted(false);
                setIsActive(true);

                const alertTitle = nextPhase === "work" ? "Break Over" : "Break Finished";
                const alertBody = nextPhase === "work" ? "Ready for your next focused session?" : "Break has ended.";
                scheduleFocusTimerAlarm(alertTitle, alertBody, nextDuration);
            }, 1500);
        } else {
            // Free session analytics
            const dur = timerInfoRef.current.duration;
            if (dur > 0) {
                import("../utils/stats").then(({ addFocusSession }) => {
                    addFocusSession(Math.floor(dur / 60));
                });
            }
        }

        persistState({ isActive: false, isCompleted: true, targetEndTime: null });
    }, [persistState]);

    // Foreground 1-second interval based on target end timestamp
    useEffect(() => {
        if (!isActive || !targetEndTimeRef.current) return;

        const interval = setInterval(() => {
            if (!targetEndTimeRef.current) return;
            const remaining = calculateRemainingSeconds(targetEndTimeRef.current);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                handleTimerCompletion();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, handleTimerCompletion]);

    // AppState sync: recalculate remaining time when waking from Android background / screen lock
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === "active" && isActive && targetEndTimeRef.current) {
                const remaining = calculateRemainingSeconds(targetEndTimeRef.current);
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    handleTimerCompletion();
                }
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);
        return () => sub.remove();
    }, [isActive, handleTimerCompletion]);

    // Timer Actions
    const startTimer = useCallback((id: string, name: string, seconds: number) => {
        const targetEnd = Date.now() + seconds * 1000;
        targetEndTimeRef.current = targetEnd;

        setPomodoroMode(false);
        setTaskId(id);
        setTaskName(name);
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(true);
        setIsCompleted(false);

        scheduleFocusTimerAlarm(
            "Focus Session Finished! 🎉",
            `Great job completing your focus session on "${name}".`,
            seconds
        );

        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            taskId: id,
            taskName: name,
            duration: seconds,
            targetEndTime: targetEnd,
            timeLeft: seconds,
            isActive: true,
            isCompleted: false,
            pomodoroMode: false,
            pomodoroPhase: "work",
            pomodoroSession: 1,
        })).catch(() => {});
    }, []);

    const startPomodoro = useCallback((id: string, name: string) => {
        const dur = POMODORO_DURATIONS.work;
        const targetEnd = Date.now() + dur * 1000;
        targetEndTimeRef.current = targetEnd;

        setPomodoroMode(true);
        setPomodoroPhase("work");
        setPomodoroSession(1);
        setTaskId(id);
        setTaskName(name);
        setDuration(dur);
        setTimeLeft(dur);
        setIsActive(true);
        setIsCompleted(false);

        scheduleFocusTimerAlarm(
            "Work Session Complete! ☕",
            "Time for a well-deserved break.",
            dur
        );

        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            taskId: id,
            taskName: name,
            duration: dur,
            targetEndTime: targetEnd,
            timeLeft: dur,
            isActive: true,
            isCompleted: false,
            pomodoroMode: true,
            pomodoroPhase: "work",
            pomodoroSession: 1,
        })).catch(() => {});
    }, []);

    const advancePomodoroPhase = useCallback(() => {
        const { phase, session } = pomodoroRef.current;
        let nextPhase: PomodoroPhase = "work";
        let nextSession = session;

        if (phase === "work") {
            nextPhase = session >= SESSIONS_BEFORE_LONG_BREAK ? "longBreak" : "shortBreak";
        } else {
            if (phase === "longBreak" || session >= SESSIONS_BEFORE_LONG_BREAK) {
                // Completed the entire Pomodoro cycle!
                setIsActive(false);
                setIsCompleted(true);
                targetEndTimeRef.current = null;
                cancelFocusTimerAlarm();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                persistState({ isActive: false, isCompleted: true, targetEndTime: null });
                import("../utils/stats").then(({ addFocusSession }) => {
                    addFocusSession(4 * 25);
                });
                return;
            }
            nextPhase = "work";
            nextSession = session + 1;
        }

        const nextDuration = POMODORO_DURATIONS[nextPhase];
        const targetEnd = Date.now() + nextDuration * 1000;
        targetEndTimeRef.current = targetEnd;

        setPomodoroPhase(nextPhase);
        setPomodoroSession(nextSession);
        setDuration(nextDuration);
        setTimeLeft(nextDuration);
        setIsCompleted(false);
        setIsActive(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const alertTitle = nextPhase === "work" ? "Break Over" : "Break Finished";
        const alertBody = nextPhase === "work" ? "Ready for your next focused session?" : "Break has ended.";
        scheduleFocusTimerAlarm(alertTitle, alertBody, nextDuration);
    }, [persistState]);

    const pauseTimer = useCallback(() => {
        setIsActive(false);
        targetEndTimeRef.current = null;
        cancelFocusTimerAlarm();
        persistState({ isActive: false, targetEndTime: null });
    }, [persistState]);

    const resumeTimer = useCallback(() => {
        if (timeLeft <= 0) return;
        const targetEnd = Date.now() + timeLeft * 1000;
        targetEndTimeRef.current = targetEnd;
        setIsActive(true);

        const name = timerInfoRef.current.taskName || "Focus Session";
        const alertTitle = pomodoroRef.current.mode
            ? (pomodoroRef.current.phase === "work" ? "Work Session Complete! ☕" : "Break Finished! 🚀")
            : "Focus Session Finished! 🎉";
        const alertBody = pomodoroRef.current.mode
            ? (pomodoroRef.current.phase === "work" ? "Time for a break." : "Time to refocus.")
            : `Great job completing your focus session on "${name}".`;

        scheduleFocusTimerAlarm(alertTitle, alertBody, timeLeft);
        persistState({ isActive: true, targetEndTime: targetEnd });
    }, [timeLeft, persistState]);

    const stopTimer = useCallback(() => {
        setIsActive(false);
        setPomodoroMode(false);
        setPomodoroPhase("work");
        setPomodoroSession(1);
        setTaskId(null);
        setTaskName(null);
        setTimeLeft(0);
        setDuration(0);
        setIsCompleted(false);
        targetEndTimeRef.current = null;
        cancelFocusTimerAlarm();
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }, []);

    const resetTimer = useCallback(() => {
        setIsActive(false);
        setTimeLeft(duration);
        setIsCompleted(false);
        targetEndTimeRef.current = null;
        cancelFocusTimerAlarm();
        persistState({ isActive: false, targetEndTime: null, timeLeft: duration, isCompleted: false });
    }, [duration, persistState]);

    const value = useMemo(() => ({
        taskId, taskName, timeLeft, duration,
        isActive, isCompleted,
        startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer,
        pomodoroMode, pomodoroPhase, pomodoroSession,
        startPomodoro, advancePomodoroPhase,
    }), [
        taskId, taskName, timeLeft, duration, isActive, isCompleted,
        startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer,
        pomodoroMode, pomodoroPhase, pomodoroSession, startPomodoro, advancePomodoroPhase
    ]);

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) throw new Error("useTimer must be used within a TimerProvider");
    return context;
};
