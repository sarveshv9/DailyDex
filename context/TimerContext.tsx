import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type PomodoroPhase = "work" | "shortBreak" | "longBreak";

const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};
const SESSIONS_BEFORE_LONG_BREAK = 4;

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
    pomodoroSession: number; // 1-4
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
    const [pomodoroMode, setPomodoroMode] = useState(false);
    const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
    const [pomodoroSession, setPomodoroSession] = useState(1);

    const pomodoroRef = useRef({ mode: false, phase: "work" as PomodoroPhase, session: 1 });
    pomodoroRef.current = { mode: pomodoroMode, phase: pomodoroPhase, session: pomodoroSession };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive && !isCompleted) {
            setIsActive(false);
            setIsCompleted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (pomodoroRef.current.mode) {
                // Auto advance pomodoro phase
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
                    // Fire a break notification
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: nextPhase === "longBreak" ? "Long Break Time! 🏖️" : "Short Break! ☕",
                            body: nextPhase === "longBreak" ? "You've earned a 15-minute rest!" : "Take a 5-minute breather.",
                            sound: true,
                        },
                        trigger: null, // immediate
                    }).catch(() => { });
                } else {
                    // Coming off a break, back to work
                    nextPhase = "work";
                    if (phase === "longBreak") {
                        nextSession = 1; // reset cycle
                    } else {
                        nextSession = session + 1;
                    }
                }

                setPomodoroPhase(nextPhase);
                setPomodoroSession(nextSession);
                const nextDuration = POMODORO_DURATIONS[nextPhase];
                setTimeout(() => {
                    setDuration(nextDuration);
                    setTimeLeft(nextDuration);
                    setIsCompleted(false);
                    setIsActive(true);
                }, 1500); // small pause before next phase
            } else {
                // Regular session analytics
                if (duration > 0) {
                    import("../utils/stats").then(({ addFocusSession }) => {
                        addFocusSession(Math.floor(duration / 60));
                    });
                }
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, isCompleted]);

    const startTimer = (id: string, name: string, seconds: number) => {
        setPomodoroMode(false);
        setTaskId(id);
        setTaskName(name);
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(true);
        setIsCompleted(false);
    };

    const startPomodoro = useCallback((id: string, name: string) => {
        const dur = POMODORO_DURATIONS.work;
        setPomodoroMode(true);
        setPomodoroPhase("work");
        setPomodoroSession(1);
        setTaskId(id);
        setTaskName(name);
        setDuration(dur);
        setTimeLeft(dur);
        setIsActive(true);
        setIsCompleted(false);
    }, []);

    const advancePomodoroPhase = useCallback(() => {
        // Manual skip to next phase
        const { phase, session } = pomodoroRef.current;
        let nextPhase: PomodoroPhase = "work";
        let nextSession = session;
        if (phase === "work") {
            nextPhase = session >= SESSIONS_BEFORE_LONG_BREAK ? "longBreak" : "shortBreak";
        } else {
            nextPhase = "work";
            nextSession = phase === "longBreak" ? 1 : session + 1;
        }
        const nextDuration = POMODORO_DURATIONS[nextPhase];
        setPomodoroPhase(nextPhase);
        setPomodoroSession(nextSession);
        setDuration(nextDuration);
        setTimeLeft(nextDuration);
        setIsCompleted(false);
        setIsActive(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const pauseTimer = () => setIsActive(false);
    const resumeTimer = () => { if (timeLeft > 0) setIsActive(true); };

    const stopTimer = () => {
        setIsActive(false);
        setPomodoroMode(false);
        setPomodoroPhase("work");
        setPomodoroSession(1);
        setTaskId(null);
        setTaskName(null);
        setTimeLeft(0);
        setDuration(0);
        setIsCompleted(false);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
        setIsCompleted(false);
    };

    return (
        <TimerContext.Provider
            value={{
                taskId, taskName, timeLeft, duration,
                isActive, isCompleted,
                startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer,
                pomodoroMode, pomodoroPhase, pomodoroSession,
                startPomodoro, advancePomodoroPhase,
            }}
        >
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) throw new Error("useTimer must be used within a TimerProvider");
    return context;
};
