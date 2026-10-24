import React, { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTimerRemainingSeconds } from "../hooks/useTimerRemainingSeconds";
import { PomodoroPhase, useTimerStore } from "../stores/timerStore";

export type { PomodoroPhase };

export interface TimerContextType {
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
  pomodoroMode: boolean;
  pomodoroPhase: PomodoroPhase;
  pomodoroSession: number;
  startPomodoro: (id: string, name: string) => void;
  advancePomodoroPhase: () => void;
}

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

/**
 * Convenience hook that provides timer state and actions.
 * NOTE: HomeScreen and TodoScreen should avoid this broad hook and
 * subscribe selectively to `useTimerStore` / `ActiveTimerBadge` to prevent 1Hz re-renders.
 */
export const useTimer = (): TimerContextType => {
  const storeState = useTimerStore(
    useShallow((s) => ({
      taskId: s.taskId,
      taskName: s.taskName,
      duration: s.duration,
      isActive: s.isActive,
      isCompleted: s.isCompleted,
      pomodoroMode: s.pomodoroMode,
      pomodoroPhase: s.pomodoroPhase,
      pomodoroSession: s.pomodoroSession,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resumeTimer: s.resumeTimer,
      stopTimer: s.stopTimer,
      resetTimer: s.resetTimer,
      startPomodoro: s.startPomodoro,
      advancePomodoroPhase: s.advancePomodoroPhase,
    }))
  );

  const timeLeft = useTimerRemainingSeconds();

  return useMemo(
    () => ({
      ...storeState,
      timeLeft,
    }),
    [storeState, timeLeft]
  );
};
