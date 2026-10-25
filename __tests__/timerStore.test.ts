import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTimerStore, TIMER_STORAGE_KEY } from "../stores/timerStore";
import * as notifications from "../utils/notifications";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue("mock-notification-id"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../utils/haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success", Warning: "Warning" },
}));

jest.mock("../utils/notifications", () => ({
  scheduleFocusTimerAlarm: jest.fn().mockResolvedValue("mock-alarm-id"),
  cancelFocusTimerAlarm: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../utils/stats", () => ({
  addFocusSession: jest.fn().mockResolvedValue(undefined),
}));

describe("Zustand Timer Store", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useTimerStore.getState().stopTimer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes with default idle state", () => {
    const state = useTimerStore.getState();
    expect(state.taskId).toBeNull();
    expect(state.taskName).toBeNull();
    expect(state.duration).toBe(0);
    expect(state.targetEndTime).toBeNull();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(false);
    expect(state.pomodoroMode).toBe(false);
  });

  it("starts a regular focus timer and schedules native alarm", () => {
    const now = 1000000;
    jest.setSystemTime(now);

    useTimerStore.getState().startTimer("task-123", "Deep Work", 1500);

    const state = useTimerStore.getState();
    expect(state.taskId).toBe("task-123");
    expect(state.taskName).toBe("Deep Work");
    expect(state.duration).toBe(1500);
    expect(state.targetEndTime).toBe(now + 1500 * 1000);
    expect(state.isActive).toBe(true);
    expect(state.isCompleted).toBe(false);
    expect(state.pomodoroMode).toBe(false);

    expect(notifications.scheduleFocusTimerAlarm).toHaveBeenCalledWith(
      "Focus Session Finished! 🎉",
      'Great job completing your focus session on "Deep Work".',
      1500
    );
  });

  it("pauses the timer and stores remaining time without global ticks", () => {
    const now = 1000000;
    jest.setSystemTime(now);

    useTimerStore.getState().startTimer("task-123", "Deep Work", 100);

    // Advance 30 seconds
    jest.setSystemTime(now + 30 * 1000);

    useTimerStore.getState().pauseTimer();

    const state = useTimerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.targetEndTime).toBeNull();
    expect(state.pausedTimeRemaining).toBe(70);
    expect(notifications.cancelFocusTimerAlarm).toHaveBeenCalled();
  });

  it("resumes the timer from paused state", () => {
    const now = 1000000;
    jest.setSystemTime(now);

    useTimerStore.getState().startTimer("task-123", "Deep Work", 100);
    jest.setSystemTime(now + 30 * 1000);
    useTimerStore.getState().pauseTimer();

    // 10 seconds later, user resumes
    const resumeTime = now + 40 * 1000;
    jest.setSystemTime(resumeTime);

    useTimerStore.getState().resumeTimer();

    const state = useTimerStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.targetEndTime).toBe(resumeTime + 70 * 1000);
    expect(state.pausedTimeRemaining).toBeNull();
    expect(notifications.scheduleFocusTimerAlarm).toHaveBeenCalledWith(
      "Focus Session Finished! 🎉",
      'Great job completing your focus session on "Deep Work".',
      70
    );
  });

  it("stops and clears timer state and storage", async () => {
    useTimerStore.getState().startTimer("task-123", "Deep Work", 100);
    useTimerStore.getState().stopTimer();

    const state = useTimerStore.getState();
    expect(state.taskId).toBeNull();
    expect(state.isActive).toBe(false);
    expect(state.targetEndTime).toBeNull();
    expect(notifications.cancelFocusTimerAlarm).toHaveBeenCalled();

    const saved = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
    expect(saved).toBeNull();
  });

  it("drives timer completion via single setTimeout", () => {
    const now = 1000000;
    jest.setSystemTime(now);

    useTimerStore.getState().startTimer("task-123", "Quick Task", 10);

    expect(useTimerStore.getState().isActive).toBe(true);
    expect(useTimerStore.getState().isCompleted).toBe(false);

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10 * 1000);

    const completedState = useTimerStore.getState();
    expect(completedState.isActive).toBe(false);
    expect(completedState.isCompleted).toBe(true);
    expect(completedState.targetEndTime).toBeNull();
  });

  it("preserves pomodoro auto-cascade to break phase after 1.5s delay", () => {
    const now = 1000000;
    jest.setSystemTime(now);

    useTimerStore.getState().startPomodoro("task-pomo", "Pomodoro Task");

    expect(useTimerStore.getState().pomodoroMode).toBe(true);
    expect(useTimerStore.getState().pomodoroPhase).toBe("work");
    expect(useTimerStore.getState().pomodoroSession).toBe(1);

    // Complete the work session (25 minutes = 1500s)
    jest.advanceTimersByTime(1500 * 1000);

    // Completed state immediately shows completed
    expect(useTimerStore.getState().isCompleted).toBe(true);
    expect(useTimerStore.getState().pomodoroPhase).toBe("shortBreak");

    // After 1.5s delay, auto-advances into the break phase
    jest.advanceTimersByTime(1500);

    const breakState = useTimerStore.getState();
    expect(breakState.isActive).toBe(true);
    expect(breakState.isCompleted).toBe(false);
    expect(breakState.pomodoroPhase).toBe("shortBreak");
    expect(breakState.duration).toBe(5 * 60);
  });

  it("hydrates from storage on cold start with an expired timer showing completion state indefinitely", async () => {
    const expiredTimestamp = 500000;
    const now = 1000000;
    jest.setSystemTime(now);

    const oldSavedTimer = {
      taskId: "task-old",
      taskName: "Old Task",
      duration: 1500,
      targetEndTime: expiredTimestamp,
      timeLeft: 0,
      isActive: true,
      isCompleted: false,
      pomodoroMode: false,
      pomodoroPhase: "work",
      pomodoroSession: 1,
    };
    await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(oldSavedTimer));

    // Force re-initialization
    useTimerStore.setState({ isInitialized: false });
    await useTimerStore.getState().initialize();

    const state = useTimerStore.getState();
    expect(state.taskId).toBe("task-old");
    expect(state.taskName).toBe("Old Task");
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(true);
    expect(state.targetEndTime).toBeNull();
    expect(notifications.cancelFocusTimerAlarm).toHaveBeenCalled();
  });
});
