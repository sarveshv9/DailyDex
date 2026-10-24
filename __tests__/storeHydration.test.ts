jest.mock("lucide-react-native", () => ({}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettingsStore, DEFAULT_SETTINGS } from "../stores/settingsStore";
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
    it("hydrates successfully from old persisted JSON shape under SETTINGS_STORAGE_KEY", async () => {
      const oldPersistedSettings = {
        notifications: {
          taskReminders: false,
        },
        hapticsEnabled: false,
        musicPreference: 2,
      };

      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(oldPersistedSettings)
      );

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.settings.hapticsEnabled).toBe(false);
      expect(state.settings.musicPreference).toBe(2);
      expect(state.settings.notifications.taskReminders).toBe(false);
    });

    it("falls back to DEFAULT_SETTINGS when storage is empty", async () => {
      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
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
