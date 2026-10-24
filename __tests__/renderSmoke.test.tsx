import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { AudioProvider } from "../context/AudioContext";
import { TimerProvider } from "../context/TimerContext";

import HomeScreen from "../app/(tabs)/index";
import TodoScreen from "../app/(tabs)/todo";
import FocusScreen from "../app/focus";
import RoutineScreen from "../app/routine";
import SetupScreen from "../app/setup";
import ProfileScreen from "../app/(tabs)/profile";

jest.mock("lucide-react-native", () => ({}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  }),
  useSegments: () => ["(tabs)"],
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = callback();
      return () => {
        if (typeof cleanup === "function") cleanup();
      };
    }, []);
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(),
  }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("id"),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const createAnimMock = () => {
  const obj: any = {};
  obj.duration = () => obj;
  obj.delay = () => obj;
  obj.springify = () => obj;
  obj.damping = () => obj;
  obj.stiffness = () => obj;
  obj.withCallback = () => obj;
  return obj;
};

jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: (toVal: any) => toVal,
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
    FadeIn: createAnimMock(),
    FadeOut: createAnimMock(),
    FadeInDown: createAnimMock(),
    FadeInUp: createAnimMock(),
    SlideInRight: createAnimMock(),
    SlideInLeft: createAnimMock(),
    SlideInDown: createAnimMock(),
    SlideOutDown: createAnimMock(),
    SlideOutLeft: createAnimMock(),
    SlideOutRight: createAnimMock(),
    LinearTransition: createAnimMock(),
    interpolate: () => 0,
    interpolateColor: () => "transparent",
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  };
});

jest.mock("react-native-pager-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { FlatList } = require("react-native");
  return {
    FlashList: (props: any) => <FlatList {...props} />,
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
  };
});

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success", Warning: "Warning", Error: "Error" },
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
  isLoaded: () => true,
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: any) => <View>{children}</View>,
    SafeAreaView: ({ children, style }: any) => <View style={style}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

describe("Screen Render Smoke Tests (Fails on Error, SSR window crash, or Maximum update depth)", () => {
  let consoleErrors: string[] = [];
  let originalError: typeof console.error;
  let testQueryClient: QueryClient;

  beforeAll(() => {
    originalError = console.error;
  });

  beforeEach(() => {
    consoleErrors = [];
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    jest.spyOn(console, "error").mockImplementation((...args: any[]) => {
      const message = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" ");
      consoleErrors.push(message);
      originalError(...args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();

    // Any console.error, getSnapshot loop, or Maximum update depth warning is a hard failure
    const fatalErrors = consoleErrors.filter(
      (err) =>
        err.includes("Maximum update depth") ||
        err.includes("getSnapshot") ||
        err.includes("ReferenceError") ||
        err.includes("window is not defined") ||
        err.includes("Error:")
    );
    expect(fatalErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  const renderWithProviders = (Component: React.ComponentType) => {
    return render(
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider>
          <SettingsProvider>
            <AudioProvider>
              <TimerProvider>
                <Component />
              </TimerProvider>
            </AudioProvider>
          </SettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  it("renders HomeScreen (Today index) without thrown errors or update loops", () => {
    const screen = renderWithProviders(HomeScreen);
    expect(screen).toBeDefined();
  });

  it("renders TodoScreen without thrown errors or update loops", () => {
    const screen = renderWithProviders(TodoScreen);
    expect(screen).toBeDefined();
  });

  it("renders FocusScreen without thrown errors or update loops", () => {
    const screen = renderWithProviders(FocusScreen);
    expect(screen).toBeDefined();
  });

  it("renders RoutineScreen without thrown errors or update loops", () => {
    const screen = renderWithProviders(RoutineScreen);
    expect(screen).toBeDefined();
  });

  it("renders SetupScreen without thrown errors or update loops", () => {
    const screen = renderWithProviders(SetupScreen);
    expect(screen).toBeDefined();
  });

  it("renders ProfileScreen without thrown errors or update loops", () => {
    const screen = renderWithProviders(ProfileScreen);
    expect(screen).toBeDefined();
  });
});
