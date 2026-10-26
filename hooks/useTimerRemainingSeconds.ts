import { useSyncExternalStore } from "react";
import { useTimerStore } from "../stores/timerStore";
import { calculateRemainingSeconds } from "../utils/timeMath";

function subscribe(callback: () => void) {
  // Subscribe to Zustand timer store mutations (start, pause, resume, stop)
  const unsubscribeStore = useTimerStore.subscribe(() => {
    callback();
  });

  // High-frequency 500ms ticker for real-time second updates during active countdown
  const interval = setInterval(() => {
    const { isActive, targetEndTime } = useTimerStore.getState();
    if (isActive && targetEndTime) {
      callback();
    }
  }, 500);

  return () => {
    unsubscribeStore();
    clearInterval(interval);
  };
}

function getSnapshot(): number {
  const { targetEndTime, isActive, pausedTimeRemaining, isCompleted, duration } =
    useTimerStore.getState();

  if (isCompleted) return 0;
  if (isActive && targetEndTime) {
    return calculateRemainingSeconds(targetEndTime);
  }
  return pausedTimeRemaining ?? duration ?? 0;
}

/**
 * High-performance hook that computes countdown seconds for display in real-time.
 * Uses React 18/19 useSyncExternalStore to avoid setState-in-effect and guarantee
 * exact, lag-free countdown updates across all platforms.
 */
export function useTimerRemainingSeconds(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
