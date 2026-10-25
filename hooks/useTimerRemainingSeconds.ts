import { useEffect, useState } from "react";
import { useTimerStore } from "../stores/timerStore";
import { calculateRemainingSeconds } from "../utils/timeMath";

/**
 * Local hook that computes countdown seconds for display.
 * Driven by an internal 1-second interval against `targetEndTime`
 * without triggering any global state changes in timerStore.
 */
export function useTimerRemainingSeconds(): number {
  const targetEndTime = useTimerStore((s) => s.targetEndTime);
  const isActive = useTimerStore((s) => s.isActive);
  const pausedTimeRemaining = useTimerStore((s) => s.pausedTimeRemaining);
  const isCompleted = useTimerStore((s) => s.isCompleted);
  const duration = useTimerStore((s) => s.duration);

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isActive || !targetEndTime) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, targetEndTime]);

  if (isCompleted) return 0;
  if (isActive && targetEndTime) {
    return calculateRemainingSeconds(targetEndTime);
  }
  return pausedTimeRemaining ?? duration ?? 0;
}
