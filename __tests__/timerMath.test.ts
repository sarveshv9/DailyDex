import { calculateRemainingSeconds, formatSecondsToMMSS } from "../utils/timeMath";

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
});
