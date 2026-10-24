/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("lucide-react-native", () => ({}));
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: any) => <View {...props} testID={props.name} />,
    MaterialCommunityIcons: (props: any) => <View {...props} testID={props.name} />,
    FontAwesome5: (props: any) => <View {...props} testID={props.name} />,
  };
});

jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => {
  const { View, Text } = require("react-native");
  const ReanimatedMock = {
    View,
    Text,
    createAnimatedComponent: (c: any) => c,
  };
  return {
    __esModule: true,
    default: ReanimatedMock,
    View,
    Text,
    createAnimatedComponent: (c: any) => c,
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: (toVal: any, _config?: any, cb?: (fin: boolean) => void) => {
      if (cb) setTimeout(() => cb(true), 0);
      return toVal;
    },
    withSpring: (toVal: any) => toVal,
    withRepeat: (anim: any) => anim,
    withSequence: (...anims: any[]) => anims[0],
    withDelay: (_delayMs: any, anim: any) => anim,
    Easing: {
      linear: () => {},
      ease: () => {},
      bezier: () => {},
      inOut: () => {},
    },
    interpolate: () => 0,
    interpolateColor: () => "transparent",
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  };
});

jest.mock("../utils/haptics", () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

import { useThemeStore } from "../stores/themeStore";
import { ThemeProvider } from "../context/ThemeContext";
import { StepTime } from "../components/SetupTimeSteps";

describe("StepTime Navigation Buttons", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useThemeStore.setState({ isLoaded: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fires onNext and onBack on Step 2 (mode=night) without being blocked by busy state", () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    const onUpdateWake = jest.fn();
    const onUpdateSleep = jest.fn();
    const onSkip = jest.fn();
    const skyProgress = { value: 0 };

    let testRenderer: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ThemeProvider>
          <StepTime
            mode="day"
            wakeTime="07:00 AM"
            sleepTime="10:30 PM"
            onUpdateWake={onUpdateWake}
            onUpdateSleep={onUpdateSleep}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
            skyProgress={skyProgress as any}
          />
        </ThemeProvider>
      );
    });

    // Re-render into step 2 (mode="night")
    act(() => {
      testRenderer.update(
        <ThemeProvider>
          <StepTime
            mode="night"
            wakeTime="07:00 AM"
            sleepTime="10:30 PM"
            onUpdateWake={onUpdateWake}
            onUpdateSleep={onUpdateSleep}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
            skyProgress={skyProgress as any}
          />
        </ThemeProvider>
      );
    });

    // Fast-forward animation timers (safety timeout & completion callbacks)
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    const root = testRenderer!.root;
    const pressableNodes = root.findAll((node) => typeof node.props.onPress === "function");

    const backBtn = pressableNodes.find((node) => {
      const textNodes = node.findAllByType("Text" as any);
      return textNodes.some((t) => typeof t.props.children === "string" && t.props.children.includes("Back"));
    });

    const nextBtn = pressableNodes.find((node) => {
      const textNodes = node.findAllByType("Text" as any);
      return textNodes.some((t) => typeof t.props.children === "string" && t.props.children.includes("Next Step"));
    });

    expect(nextBtn).toBeDefined();
    expect(backBtn).toBeDefined();

    // Verify Next button works on Step 2
    act(() => {
      nextBtn!.props.onPress();
    });
    expect(onNext).toHaveBeenCalledTimes(1);

    // Verify Back button works on Step 2
    act(() => {
      backBtn!.props.onPress();
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
