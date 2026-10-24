import {
  addMinutesToTime,
  calculateRemainingSeconds,
  formatDuration,
  formatSecondsToMMSS,
  parseTime,
  timeToMinutes,
} from "../utils/timeMath";

describe("Timer Math & Drift Prevention (calculateRemainingSeconds)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calculates remaining seconds accurately without drift when time elapses", () => {
    const startTime = 1000000;
    jest.setSystemTime(startTime);

    const duration = 25 * 60; // 25 minutes (1500 seconds)
    const targetEndTime = startTime + duration * 1000;

    expect(calculateRemainingSeconds(targetEndTime)).toBe(1500);

    // Fast-forward 60 seconds (simulating 1 minute background suspension)
    jest.advanceTimersByTime(60 * 1000);
    expect(calculateRemainingSeconds(targetEndTime)).toBe(1440);

    // Fast-forward remaining 1440 seconds
    jest.advanceTimersByTime(1440 * 1000);
    expect(calculateRemainingSeconds(targetEndTime)).toBe(0);
  });

  it("handles clock advancing past targetEndTime without negative remaining time", () => {
    const startTime = 1000000;
    jest.setSystemTime(startTime);

    const duration = 20; // 20 seconds
    const targetEndTime = startTime + duration * 1000;

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30 * 1000);
    expect(calculateRemainingSeconds(targetEndTime)).toBe(0);
  });

  it("handles null or undefined targetEndTime safely", () => {
    expect(calculateRemainingSeconds(null)).toBe(0);
    expect(calculateRemainingSeconds(undefined)).toBe(0);
  });

  it("formats seconds to MM:SS correctly", () => {
    expect(formatSecondsToMMSS(1500)).toBe("25:00");
    expect(formatSecondsToMMSS(65)).toBe("01:05");
    expect(formatSecondsToMMSS(0)).toBe("00:00");
    expect(formatSecondsToMMSS(-10)).toBe("00:00");
  });

  it("formats duration in minutes correctly", () => {
    expect(formatDuration(15)).toBe("15m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(125)).toBe("2h 5m");
  });

  it("parses 12h and 24h time strings correctly", () => {
    expect(parseTime("8:30 AM")).toEqual({ hours: 8, minutes: 30, isValid: true });
    expect(parseTime("12:00 PM")).toEqual({ hours: 12, minutes: 0, isValid: true });
    expect(parseTime("11:45 PM")).toEqual({ hours: 23, minutes: 45, isValid: true });
    expect(parseTime("12:15 AM")).toEqual({ hours: 0, minutes: 15, isValid: true });
    expect(parseTime("invalid")).toEqual({ hours: 0, minutes: 0, isValid: false });
  });

  it("converts time string to chronological day minutes with late-night shift", () => {
    // 8:00 AM = 480
    expect(timeToMinutes("8:00 AM")).toBe(480);
    // 1:00 AM (late night) shifts by +24h to logically appear at end of day (1500 min)
    expect(timeToMinutes("1:00 AM")).toBe((1 + 24) * 60);
  });

  it("adds minutes to time string correctly", () => {
    expect(addMinutesToTime("8:00 AM", 45)).toBe("8:45 AM");
    expect(addMinutesToTime("11:30 AM", 60)).toBe("12:30 PM");
    expect(addMinutesToTime("11:00 PM", 90)).toBe("12:30 AM");
  });
});
