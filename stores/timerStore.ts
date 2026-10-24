import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { create } from "zustand";
import * as Haptics from "../utils/haptics";
import * as Notifications from "expo-notifications";
import { cancelFocusTimerAlarm, scheduleFocusTimerAlarm } from "../utils/notifications";
import { calculateRemainingSeconds } from "../utils/timeMath";

export type PomodoroPhase = "work" | "shortBreak" | "longBreak";

export const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const SESSIONS_BEFORE_LONG_BREAK = 4;
export const TIMER_STORAGE_KEY = "@zen_active_timer";

export interface StoredTimerState {
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
  pausedTimeRemaining?: number | null;
}

export interface TimerState {
  // State
  taskId: string | null;
  taskName: string | null;
  duration: number;
  targetEndTime: number | null;
  pausedTimeRemaining: number | null;
  isActive: boolean;
  isCompleted: boolean;
  pomodoroMode: boolean;
  pomodoroPhase: PomodoroPhase;
  pomodoroSession: number;
  isInitialized: boolean;

  // Actions
  startTimer: (id: string, name: string, seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  startPomodoro: (id: string, name: string) => void;
  advancePomodoroPhase: () => void;
  initialize: () => Promise<void>;
  _handleTimerCompletion: () => void;
}

let completionTimeout: ReturnType<typeof setTimeout> | null = null;
let pomodoroAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function clearScheduledTimeouts() {
  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }
  if (pomodoroAdvanceTimeout) {
    clearTimeout(pomodoroAdvanceTimeout);
    pomodoroAdvanceTimeout = null;
  }
}

export function cleanupTimerStore() {
  clearScheduledTimeouts();
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

function scheduleCompletion(targetEndTime: number, onComplete: () => void) {
  clearScheduledTimeouts();
  const delayMs = targetEndTime - Date.now();
  if (delayMs <= 0) {
    onComplete();
  } else {
    completionTimeout = setTimeout(onComplete, delayMs);
  }
}

async function persistToStorage(state: {
  taskId: string | null;
  taskName: string | null;
  duration: number;
  targetEndTime: number | null;
  pausedTimeRemaining: number | null;
  isActive: boolean;
  isCompleted: boolean;
  pomodoroMode: boolean;
  pomodoroPhase: PomodoroPhase;
  pomodoroSession: number;
}) {
  try {
    const remaining = state.targetEndTime
      ? calculateRemainingSeconds(state.targetEndTime)
      : (state.pausedTimeRemaining ?? 0);

    const payload: StoredTimerState = {
      taskId: state.taskId,
      taskName: state.taskName,
      duration: state.duration,
      targetEndTime: state.targetEndTime,
      timeLeft: remaining,
      isActive: state.isActive,
      isCompleted: state.isCompleted,
      pomodoroMode: state.pomodoroMode,
      pomodoroPhase: state.pomodoroPhase,
      pomodoroSession: state.pomodoroSession,
      pausedTimeRemaining: state.pausedTimeRemaining,
    };
    await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence error
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  taskId: null,
  taskName: null,
  duration: 0,
  targetEndTime: null,
  pausedTimeRemaining: null,
  isActive: false,
  isCompleted: false,
  pomodoroMode: false,
  pomodoroPhase: "work",
  pomodoroSession: 1,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          const { isActive, targetEndTime, _handleTimerCompletion } = get();
          if (isActive && targetEndTime) {
            const remaining = calculateRemainingSeconds(targetEndTime);
            if (remaining <= 0) {
              _handleTimerCompletion();
            } else {
              scheduleCompletion(targetEndTime, _handleTimerCompletion);
            }
          }
        }
      });
    }

    try {
      const savedStr = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (!savedStr) {
        set({ isInitialized: true });
        return;
      }

      const saved: StoredTimerState = JSON.parse(savedStr);
      const now = Date.now();

      const baseState = {
        taskId: saved.taskId,
        taskName: saved.taskName,
        duration: saved.duration,
        pomodoroMode: saved.pomodoroMode,
        pomodoroPhase: saved.pomodoroPhase,
        pomodoroSession: saved.pomodoroSession,
        isInitialized: true,
      };

      if (saved.isActive && saved.targetEndTime) {
        const remaining = calculateRemainingSeconds(saved.targetEndTime, now);
        if (remaining > 0) {
          set({
            ...baseState,
            targetEndTime: saved.targetEndTime,
            pausedTimeRemaining: null,
            isActive: true,
            isCompleted: false,
          });
          scheduleCompletion(saved.targetEndTime, () => get()._handleTimerCompletion());
        } else {
          // Timer expired while closed — keep completion state indefinitely (known behavior preserved)
          set({
            ...baseState,
            targetEndTime: null,
            pausedTimeRemaining: 0,
            isActive: false,
            isCompleted: true,
          });
          cancelFocusTimerAlarm().catch(() => {});
        }
      } else if (!saved.isActive && (saved.timeLeft > 0 || (saved.pausedTimeRemaining && saved.pausedTimeRemaining > 0)) && !saved.isCompleted) {
        set({
          ...baseState,
          targetEndTime: null,
          pausedTimeRemaining: saved.pausedTimeRemaining ?? saved.timeLeft,
          isActive: false,
          isCompleted: false,
        });
      } else {
        set({
          ...baseState,
          targetEndTime: null,
          pausedTimeRemaining: saved.pausedTimeRemaining ?? 0,
          isActive: false,
          isCompleted: Boolean(saved.isCompleted),
        });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  startTimer: (id: string, name: string, seconds: number) => {
    clearScheduledTimeouts();
    const targetEnd = Date.now() + seconds * 1000;

    const nextState = {
      taskId: id,
      taskName: name,
      duration: seconds,
      targetEndTime: targetEnd,
      pausedTimeRemaining: null,
      isActive: true,
      isCompleted: false,
      pomodoroMode: false,
      pomodoroPhase: "work" as PomodoroPhase,
      pomodoroSession: 1,
    };

    set(nextState);

    scheduleFocusTimerAlarm(
      "Focus Session Finished! 🎉",
      `Great job completing your focus session on "${name}".`,
      seconds
    );

    scheduleCompletion(targetEnd, () => get()._handleTimerCompletion());
    persistToStorage({ ...get(), ...nextState });
  },

  startPomodoro: (id: string, name: string) => {
    clearScheduledTimeouts();
    const dur = POMODORO_DURATIONS.work;
    const targetEnd = Date.now() + dur * 1000;

    const nextState = {
      taskId: id,
      taskName: name,
      duration: dur,
      targetEndTime: targetEnd,
      pausedTimeRemaining: null,
      isActive: true,
      isCompleted: false,
      pomodoroMode: true,
      pomodoroPhase: "work" as PomodoroPhase,
      pomodoroSession: 1,
    };

    set(nextState);

    scheduleFocusTimerAlarm(
      "Work Session Complete! ☕",
      "Time for a well-deserved break.",
      dur
    );

    scheduleCompletion(targetEnd, () => get()._handleTimerCompletion());
    persistToStorage({ ...get(), ...nextState });
  },

  pauseTimer: () => {
    clearScheduledTimeouts();
    const { targetEndTime, pausedTimeRemaining, duration, isActive } = get();
    if (!isActive) return;

    const remaining = targetEndTime
      ? calculateRemainingSeconds(targetEndTime)
      : (pausedTimeRemaining ?? duration);

    cancelFocusTimerAlarm();

    const nextState = {
      isActive: false,
      targetEndTime: null,
      pausedTimeRemaining: remaining,
    };

    set(nextState);
    persistToStorage({ ...get(), ...nextState });
  },

  resumeTimer: () => {
    clearScheduledTimeouts();
    const { pausedTimeRemaining, duration, taskName, pomodoroMode, pomodoroPhase } = get();
    const remaining = pausedTimeRemaining ?? duration;
    if (remaining <= 0) return;

    const targetEnd = Date.now() + remaining * 1000;

    const name = taskName || "Focus Session";
    const alertTitle = pomodoroMode
      ? (pomodoroPhase === "work" ? "Work Session Complete! ☕" : "Break Finished! 🚀")
      : "Focus Session Finished! 🎉";
    const alertBody = pomodoroMode
      ? (pomodoroPhase === "work" ? "Time for a break." : "Time to refocus.")
      : `Great job completing your focus session on "${name}".`;

    scheduleFocusTimerAlarm(alertTitle, alertBody, remaining);

    const nextState = {
      isActive: true,
      targetEndTime: targetEnd,
      pausedTimeRemaining: null,
      isCompleted: false,
    };

    set(nextState);
    scheduleCompletion(targetEnd, () => get()._handleTimerCompletion());
    persistToStorage({ ...get(), ...nextState });
  },

  stopTimer: () => {
    clearScheduledTimeouts();
    cancelFocusTimerAlarm();

    const nextState = {
      taskId: null,
      taskName: null,
      duration: 0,
      targetEndTime: null,
      pausedTimeRemaining: null,
      isActive: false,
      isCompleted: false,
      pomodoroMode: false,
      pomodoroPhase: "work" as PomodoroPhase,
      pomodoroSession: 1,
    };

    set(nextState);
    AsyncStorage.removeItem(TIMER_STORAGE_KEY).catch(() => {});
  },

  resetTimer: () => {
    clearScheduledTimeouts();
    cancelFocusTimerAlarm();
    const { duration } = get();

    const nextState = {
      isActive: false,
      targetEndTime: null,
      pausedTimeRemaining: duration,
      isCompleted: false,
    };

    set(nextState);
    persistToStorage({ ...get(), ...nextState });
  },

  advancePomodoroPhase: () => {
    clearScheduledTimeouts();
    const { pomodoroPhase, pomodoroSession } = get();
    let nextPhase: PomodoroPhase = "work";
    let nextSession = pomodoroSession;

    if (pomodoroPhase === "work") {
      nextPhase = pomodoroSession >= SESSIONS_BEFORE_LONG_BREAK ? "longBreak" : "shortBreak";
    } else {
      if (pomodoroPhase === "longBreak" || pomodoroSession >= SESSIONS_BEFORE_LONG_BREAK) {
        // Complete full cycle
        cancelFocusTimerAlarm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const finalState = {
          isActive: false,
          isCompleted: true,
          targetEndTime: null,
          pausedTimeRemaining: 0,
        };
        set(finalState);
        persistToStorage({ ...get(), ...finalState });
        import("../utils/stats").then(({ addFocusSession }) => {
          addFocusSession(4 * 25);
        }).catch(() => {});
        return;
      }
      nextPhase = "work";
      nextSession = pomodoroSession + 1;
    }

    const nextDuration = POMODORO_DURATIONS[nextPhase];
    const targetEnd = Date.now() + nextDuration * 1000;

    const nextState = {
      pomodoroPhase: nextPhase,
      pomodoroSession: nextSession,
      duration: nextDuration,
      targetEndTime: targetEnd,
      pausedTimeRemaining: null,
      isCompleted: false,
      isActive: true,
    };

    set(nextState);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const alertTitle = nextPhase === "work" ? "Break Over" : "Break Finished";
    const alertBody = nextPhase === "work" ? "Ready for your next focused session?" : "Break has ended.";
    scheduleFocusTimerAlarm(alertTitle, alertBody, nextDuration);

    scheduleCompletion(targetEnd, () => get()._handleTimerCompletion());
    persistToStorage({ ...get(), ...nextState });
  },

  _handleTimerCompletion: () => {
    clearScheduledTimeouts();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cancelFocusTimerAlarm();

    const { pomodoroMode, pomodoroPhase, pomodoroSession, duration } = get();

    if (pomodoroMode) {
      let nextPhase: PomodoroPhase;
      let nextSession = pomodoroSession;

      if (pomodoroPhase === "work") {
        if (pomodoroSession >= SESSIONS_BEFORE_LONG_BREAK) {
          nextPhase = "longBreak";
          nextSession = pomodoroSession;
        } else {
          nextPhase = "shortBreak";
        }

        Notifications.scheduleNotificationAsync({
          content: {
            title: nextPhase === "longBreak" ? "Long Break Time" : "Short Break",
            body: nextPhase === "longBreak" ? "You've earned a 15-minute rest!" : "Take a 5-minute breather.",
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      } else {
        if (pomodoroPhase === "longBreak" || pomodoroSession >= SESSIONS_BEFORE_LONG_BREAK) {
          // Full cycle complete
          const finalState = {
            isActive: false,
            isCompleted: true,
            targetEndTime: null,
            pausedTimeRemaining: 0,
          };
          set(finalState);
          persistToStorage({ ...get(), ...finalState });
          import("../utils/stats").then(({ addFocusSession }) => {
            addFocusSession(4 * 25);
          }).catch(() => {});
          return;
        }
        nextPhase = "work";
        nextSession = pomodoroSession + 1;
      }

      set({
        isActive: false,
        isCompleted: true,
        targetEndTime: null,
        pausedTimeRemaining: 0,
        pomodoroPhase: nextPhase,
        pomodoroSession: nextSession,
      });

      const nextDuration = POMODORO_DURATIONS[nextPhase];

      // Auto-cascade to next phase after 1.5s delay (exact preserved quirk)
      pomodoroAdvanceTimeout = setTimeout(() => {
        const targetEnd = Date.now() + nextDuration * 1000;
        const advancedState = {
          duration: nextDuration,
          targetEndTime: targetEnd,
          pausedTimeRemaining: null,
          isCompleted: false,
          isActive: true,
        };
        set(advancedState);

        const alertTitle = nextPhase === "work" ? "Break Over" : "Break Finished";
        const alertBody = nextPhase === "work" ? "Ready for your next focused session?" : "Break has ended.";
        scheduleFocusTimerAlarm(alertTitle, alertBody, nextDuration);

        scheduleCompletion(targetEnd, () => get()._handleTimerCompletion());
        persistToStorage({ ...get(), ...advancedState });
      }, 1500);

      persistToStorage({
        ...get(),
        isActive: false,
        isCompleted: true,
        targetEndTime: null,
        pausedTimeRemaining: 0,
      });
    } else {
      // Free session stats
      if (duration > 0) {
        import("../utils/stats").then(({ addFocusSession }) => {
          addFocusSession(Math.floor(duration / 60));
        }).catch(() => {});
      }

      const completedState = {
        isActive: false,
        isCompleted: true,
        targetEndTime: null,
        pausedTimeRemaining: 0,
      };
      set(completedState);
      persistToStorage({ ...get(), ...completedState });
    }
  },
}));

// Auto-initialize store on import
useTimerStore.getState().initialize();
