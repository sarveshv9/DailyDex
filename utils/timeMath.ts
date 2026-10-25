/**
 * Pure time calculation utilities for timers, countdowns, schedules, and drift prevention.
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
  if (!targetEndTime || typeof targetEndTime !== "number") {
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
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Formats duration in minutes to human readable string (e.g. "25m", "1h", "1h 30m").
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Parses a 12-hour or 24-hour time string into hours, minutes, and validity flag.
 */
export function parseTime(
  timeStr: string
): { hours: number; minutes: number; isValid: boolean } {
  if (!timeStr || typeof timeStr !== "string") {
    return { hours: 0, minutes: 0, isValid: false };
  }

  const cleanTime = timeStr.trim().toUpperCase();
  const timeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/;
  const match = cleanTime.match(timeRegex);

  if (!match) {
    return { hours: 0, minutes: 0, isValid: false };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const ampm = match[3];

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { hours: 0, minutes: 0, isValid: false };
  }

  if (ampm) {
    if (hours < 1 || hours > 12) {
      return { hours: 0, minutes: 0, isValid: false };
    }

    if (ampm === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes, isValid: true };
}

/**
 * Converts a time string to minutes from start of day.
 * Shifts late-night times (before 4 AM) by +24h so they logically order at the end of the daily routine.
 */
export function timeToMinutes(timeStr: string): number {
  const { hours, minutes, isValid } = parseTime(timeStr);
  if (!isValid) {
    return Number.MAX_SAFE_INTEGER;
  }
  const adjustedHours = hours < 4 ? hours + 24 : hours;
  return adjustedHours * 60 + minutes;
}

/**
 * Converts minutes count to formatted 12-hour AM/PM string (e.g. "8:00 AM", "11:30 PM").
 */
export function minutesToTimeStr(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Adds minutes to an existing time string and returns formatted result.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const { hours, minutes, isValid } = parseTime(timeStr);
  if (!isValid) return timeStr;
  const total = hours * 60 + minutes + minutesToAdd;
  return minutesToTimeStr(total);
}
