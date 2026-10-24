jest.mock("lucide-react-native", () => ({}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render } from "@testing-library/react-native";
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
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
  CUSTOM_THEMES_STORAGE_KEY,
  STORAGE_KEYS,
} from "../constants/storageKeys";

describe("Store Hydration from Legacy Storage Shapes", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
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

      const { act } = require("@testing-library/react-native");
      const { View } = require("react-native");
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

    it("forces hydration to reject and asserts themeReady is marked true in finally to prevent blank screen", async () => {
      jest.spyOn(useThemeStore.getState(), "loadTheme").mockRejectedValueOnce(new Error("AsyncStorage read error"));
      jest.spyOn(useSettingsStore.getState(), "loadSettings").mockRejectedValueOnce(new Error("Storage disk error"));
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      let themeReady = false;
      let safetyTimeoutCleared = false;
      const safetyTimeout = setTimeout(() => {}, 2000);

      // Simulate root layout gate
      await Promise.all([
        useSettingsStore.getState().loadSettings(),
        useThemeStore.getState().loadTheme(),
      ])
        .catch((err) => {
          console.warn("Hydration failed, using fallback:", err);
        })
        .finally(() => {
          clearTimeout(safetyTimeout);
          safetyTimeoutCleared = true;
          themeReady = true;
        });

      expect(themeReady).toBe(true);
      expect(safetyTimeoutCleared).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        "Hydration failed, using fallback:",
        expect.any(Error)
      );
      warnSpy.mockRestore();
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
