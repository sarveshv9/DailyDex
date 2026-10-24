import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { useAppHaptics } from "../hooks/useAppHaptics";
import { SettingsContext } from "../context/SettingsContext";
import * as Haptics from "../utils/haptics";

jest.mock("../utils/haptics", () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "Light",
    Medium: "Medium",
    Heavy: "Heavy",
  },
  NotificationFeedbackType: {
    Success: "Success",
    Warning: "Warning",
    Error: "Error",
  },
}));

describe("useAppHaptics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("triggers haptic calls when haptics are enabled in settings", async () => {
    let hookResult: ReturnType<typeof useAppHaptics> | null = null;

    const TestComponent = () => {
      hookResult = useAppHaptics();
      return <></>;
    };

    const mockContext = {
      settings: {
        hapticsEnabled: true,
        notifications: { taskReminders: true },
        musicPreference: 0,
      },
      toggleNotification: jest.fn(),
      setHapticsEnabled: jest.fn(),
      setMusicPreference: jest.fn(),
      isLoading: false,
    };

    await act(async () => {
      renderer.create(
        <SettingsContext.Provider value={mockContext}>
          <TestComponent />
        </SettingsContext.Provider>
      );
    });

    expect(hookResult!.isEnabled).toBe(true);

    await act(async () => {
      await hookResult!.light();
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith("Light");

    await act(async () => {
      await hookResult!.selection();
    });
    expect(Haptics.selectionAsync).toHaveBeenCalled();

    await act(async () => {
      await hookResult!.success();
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("Success");
  });

  it("suppresses haptic calls when haptics are disabled in settings", async () => {
    let hookResult: ReturnType<typeof useAppHaptics> | null = null;

    const TestComponent = () => {
      hookResult = useAppHaptics();
      return <></>;
    };

    const mockContext = {
      settings: {
        hapticsEnabled: false,
        notifications: { taskReminders: true },
        musicPreference: 0,
      },
      toggleNotification: jest.fn(),
      setHapticsEnabled: jest.fn(),
      setMusicPreference: jest.fn(),
      isLoading: false,
    };

    await act(async () => {
      renderer.create(
        <SettingsContext.Provider value={mockContext}>
          <TestComponent />
        </SettingsContext.Provider>
      );
    });

    expect(hookResult!.isEnabled).toBe(false);

    await act(async () => {
      await hookResult!.heavy();
    });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await act(async () => {
      await hookResult!.selection();
    });
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
