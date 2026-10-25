import React from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, act } from "@testing-library/react-native";
import RootLayout from "../app/_layout";
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  _resetUserChangedSettings,
  useHapticsEnabled,
  useMusicPreference,
  useTaskReminders,
} from "../stores/settingsStore";
import { useThemeStore } from "../stores/themeStore";
import {
  SETTINGS_STORAGE_KEY,
  THEME_STORAGE_KEY,
  DARK_MODE_STORAGE_KEY,
  AUTO_THEME_STORAGE_KEY,
  STORAGE_KEYS,
  SETUP_STORAGE_KEY,
} from "../constants/storageKeys";

jest.mock("lucide-react-native", () => ({}));

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../utils/notifications", () => ({
  cancelAllRoutineNotifications: jest.fn(),
  scheduleRoutineNotifications: jest.fn(),
  requestNotificationPermissions: jest.fn(),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
}));

jest.mock("expo-router", () => {
  const mockReact = jest.requireActual("react");
  const mockRN = jest.requireActual("react-native");
  const Stack: any = ({ children }: any) =>
    mockReact.createElement(mockRN.View, { testID: "root-layout-stack" }, children);
  const StackScreen = () => null;
  StackScreen.displayName = "StackScreen";
  Stack.Screen = StackScreen;
  return {
    Stack,
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      setParams: jest.fn(),
    }),
    useSegments: () => ["(tabs)"],
  };
});

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-blur", () => ({
  BlurView: "BlurView",
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

describe("Store Hydration from Legacy Storage Shapes", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    _resetUserChangedSettings();
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS, isLoading: true });
    useThemeStore.setState({
      themeName: "default",
      isDarkMode: true,
      isAutoTheme: false,
      isLoaded: false,
      customThemes: {},
    });
  });

  describe("SettingsStore Hydration", () => {
    it("hydrates successfully from real old-format persisted payload under @zen_user_settings_v2 and verifies via selectors", async () => {
      expect(SETTINGS_STORAGE_KEY).toBe("@zen_user_settings_v2");

      // Payload matching the exact shape written by legacy SettingsContext
      const realOldPayload = {
        notifications: {
          taskReminders: false,
        },
        hapticsEnabled: false,
        musicPreference: 2,
      };

      await AsyncStorage.setItem(
        "@zen_user_settings_v2",
        JSON.stringify(realOldPayload)
      );

      await useSettingsStore.getState().loadSettings();

      // Assert state structure
      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.settings.hapticsEnabled).toBe(false);
      expect(state.settings.musicPreference).toBe(2);
      expect(state.settings.notifications.taskReminders).toBe(false);

      const captured: { haptics?: boolean; music?: number; reminders?: boolean } = {};

      const Consumer = () => {
        captured.haptics = useHapticsEnabled();
        captured.music = useMusicPreference();
        captured.reminders = useTaskReminders();
        return <View />;
      };

      await act(async () => {
        render(<Consumer />);
      });

      expect(captured.haptics).toBe(false);
      expect(captured.music).toBe(2);
      expect(captured.reminders).toBe(false);
    });

    it("falls back to DEFAULT_SETTINGS when storage is empty", async () => {
      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
    });

    it("forces hydration to reject and asserts real RootLayout renders content without a blank screen", async () => {
      await AsyncStorage.setItem(SETUP_STORAGE_KEY, "true");
      const originalLoadTheme = useThemeStore.getState().loadTheme;
      const originalLoadSettings = useSettingsStore.getState().loadSettings;
      useThemeStore.setState({
        loadTheme: jest.fn().mockRejectedValue(new Error("AsyncStorage read error")),
      });
      useSettingsStore.setState({
        loadSettings: jest.fn().mockRejectedValue(new Error("Storage disk error")),
      });
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      try {
        let screenResult: any;
        await act(async () => {
          screenResult = await render(<RootLayout />);
        });

        // Assert that RootLayout does NOT return null (blank screen) and actually renders content
        const stack = await screenResult.findByTestId("root-layout-stack");
        expect(stack).toBeTruthy();

        expect(warnSpy).toHaveBeenCalledWith(
          "Hydration failed, using fallback theme/settings:",
          expect.any(Error)
        );
      } finally {
        useThemeStore.setState({ loadTheme: originalLoadTheme });
        useSettingsStore.setState({ loadSettings: originalLoadSettings });
        warnSpy.mockRestore();
      }
    });

    it("guarantees that a delayed hydration cannot overwrite in-flight user changes and preserves untouched saved keys", async () => {
      // Seed disk with saved settings: non-default musicPreference and disabled reminders
      const savedDiskPayload = {
        notifications: { taskReminders: false },
        hapticsEnabled: false,
        musicPreference: 3,
      };

      let resolveDiskRead!: (val: string | null) => void;
      const delayedDiskPromise = new Promise<string | null>((resolve) => {
        resolveDiskRead = resolve;
      });

      jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(() => delayedDiskPromise);

      // Start hydration (in-flight)
      const loadPromise = useSettingsStore.getState().loadSettings();

      // User makes an intentional setting change ONLY to haptics before disk read resolves
      await useSettingsStore.getState().setHapticsEnabled(true);

      // Disk read finishes later with saved disk data
      resolveDiskRead(JSON.stringify(savedDiskPayload));
      await loadPromise;

      const state = useSettingsStore.getState();
      // 1. User modification must survive
      expect(state.settings.hapticsEnabled).toBe(true);
      // 2. Untouched saved key from disk must survive (not replaced by DEFAULT_SETTINGS 0)
      expect(state.settings.musicPreference).toBe(3);
      // 3. Untouched saved nested key from disk must survive (not replaced by DEFAULT_SETTINGS true)
      expect(state.settings.notifications.taskReminders).toBe(false);
    });

    it("deep-merges the nested notifications object preserving defaults for untouched keys and user changes for modified keys", async () => {
      const partialDiskPayload = {
        notifications: {},
        hapticsEnabled: true,
        musicPreference: 1,
      };

      let resolveDiskRead!: (val: string | null) => void;
      const delayedDiskPromise = new Promise<string | null>((resolve) => {
        resolveDiskRead = resolve;
      });

      jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(() => delayedDiskPromise);

      const loadPromise = useSettingsStore.getState().loadSettings();

      // User modifies taskReminders in-flight
      await useSettingsStore.getState().toggleNotification("taskReminders");

      resolveDiskRead(JSON.stringify(partialDiskPayload));
      await loadPromise;

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      // taskReminders was true by default, toggled to false by user
      expect(state.settings.notifications.taskReminders).toBe(false);
    });

    it("falls back to defaults and sets isLoading: false when storage contains corrupted JSON", async () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, "INVALID_CORRUPTED_JSON_{{[}");

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
      expect(errSpy).toHaveBeenCalledWith(
        "Corrupted settings JSON in storage, resetting to defaults",
        expect.any(SyntaxError)
      );
      errSpy.mockRestore();
    });

    it("clears userChangedSettings on hydrate completion so a second hydrate after a restore loads new disk values cleanly", async () => {
      // 1. First hydrate with user change in-flight
      let resolveFirstDiskRead!: (val: string | null) => void;
      const firstDiskPromise = new Promise<string | null>((resolve) => {
        resolveFirstDiskRead = resolve;
      });
      jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(() => firstDiskPromise);

      const firstLoad = useSettingsStore.getState().loadSettings();
      await useSettingsStore.getState().setHapticsEnabled(false);
      resolveFirstDiskRead(JSON.stringify({ hapticsEnabled: true, musicPreference: 1 }));
      await firstLoad;

      expect(useSettingsStore.getState().settings.hapticsEnabled).toBe(false);

      // 2. Simulate backup restore: write completely new data to disk
      const restoredPayload = {
        notifications: { taskReminders: false },
        hapticsEnabled: true, // Should be true now from restore
        musicPreference: 5,
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(restoredPayload));

      // 3. Second hydrate (triggered after backup restore)
      await useSettingsStore.getState().loadSettings();

      const finalState = useSettingsStore.getState();
      expect(finalState.isLoading).toBe(false);
      expect(finalState.settings.hapticsEnabled).toBe(true); // Restored value survives, not clobbered by stale change
      expect(finalState.settings.musicPreference).toBe(5);
      expect(finalState.settings.notifications.taskReminders).toBe(false);
    });
  });

  describe("ThemeStore Hydration & Zero Theme Flash Guard", () => {
    it("hydrates successfully from legacy 'light-' prefixed theme strings", async () => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, "light-gengar");
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, "false");
      await AsyncStorage.setItem(AUTO_THEME_STORAGE_KEY, "true");

      await useThemeStore.getState().loadTheme();

      const state = useThemeStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.themeName).toBe("gengar");
      expect(state.isDarkMode).toBe(false);
      expect(state.isAutoTheme).toBe(true);
    });

    it("migrates legacy single custom theme into customThemes dictionary", async () => {
      const legacyCustom = {
        pokemonId: "25",
        primaryColor: "#FFCC00",
        name: "Pikachu Special",
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.LEGACY_CUSTOM_THEME,
        JSON.stringify(legacyCustom)
      );

      await useThemeStore.getState().loadTheme();

      const state = useThemeStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.customThemes["25"]).toBeDefined();
      expect(state.customThemes["25"].name).toBe("Pikachu Special");
      expect(state.customThemes["25"].primaryColor).toBe("#FFCC00");
    });

    it("holds isLoaded as true after hydration completes to prevent splash flash", async () => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, "charizard");
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, "true");

      await useThemeStore.getState().loadTheme();

      const state = useThemeStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.themeName).toBe("charizard");
      expect(state.isDarkMode).toBe(true);
    });
  });
});
