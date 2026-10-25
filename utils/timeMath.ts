/**
 * Pure time calculation utilities for timers, countdowns, and drift prevention.
 */

/**
 * Calculates remaining seconds from a future target end timestamp.
 * Avoids interval drift by computing directly against real clock time.
 *
 * @param targetEndTime - Epoch timestamp in milliseconds when timer expires
 * @param now - Current epoch timestamp in milliseconds (defaults to Date.now())
 * @returns Non-negative remaining seconds, rounded up to next whole second
 */
export function calculateRemainingSeconds(
  targetEndTime: number | null | undefined,
  now = Date.now()
): number {
  if (!targetEndTime || typeof targetEndTime !== 'number') {
    return 0;
  }
  return Math.max(0, Math.ceil((targetEndTime - now) / 1000));
}

/**
 * Formats a duration in seconds into MM:SS display format.
 */
export function formatSecondsToMMSS(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
