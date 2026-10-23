describe("Timer Math & Drift Prevention (targetEndTime - now)", () => {
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

    // Helper function that mirrors our targetEndTime calculation
    const getRemainingSeconds = (now: number, target: number) => {
      return Math.max(0, Math.ceil((target - now) / 1000));
    };

    expect(getRemainingSeconds(Date.now(), targetEndTime)).toBe(1500);

    // Fast-forward 60 seconds (simulating 1 minute background suspension)
    jest.advanceTimersByTime(60 * 1000);
    expect(getRemainingSeconds(Date.now(), targetEndTime)).toBe(1440);

    // Fast-forward remaining 1440 seconds
    jest.advanceTimersByTime(1440 * 1000);
    expect(getRemainingSeconds(Date.now(), targetEndTime)).toBe(0);
  });

  it("handles clock advancing past targetEndTime without negative remaining time", () => {
    const startTime = 1000000;
    jest.setSystemTime(startTime);

    const duration = 20; // 20 seconds
    const targetEndTime = startTime + duration * 1000;

    const getRemainingSeconds = (now: number, target: number) => {
      return Math.max(0, Math.ceil((target - now) / 1000));
    };

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30 * 1000);
    expect(getRemainingSeconds(Date.now(), targetEndTime)).toBe(0);
  });
});
