import AsyncStorage from "@react-native-async-storage/async-storage";
import { LayoutAnimation, Platform } from "react-native";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  AUTO_THEME_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY,
  DARK_MODE_STORAGE_KEY,
  STORAGE_KEYS,
  THEME_STORAGE_KEY,
} from "../constants/storageKeys";
import { darkThemes, lightThemes, Theme, ThemeName } from "../styles/shared";

export interface CustomThemeConfig {
  pokemonId: string;
  primaryColor: string;
  name: string;
}

export function computeTheme(
  themeName: string,
  isDarkMode: boolean,
  customThemes: Record<string, CustomThemeConfig>
): Theme {
  const activePalette = isDarkMode ? darkThemes : lightThemes;

  if (themeName.startsWith("custom_")) {
    const customId = themeName.replace("custom_", "");
    const config = customThemes[customId];
    if (config) {
      const baseObj = activePalette.pokeball || activePalette.default;
      return {
        ...baseObj,
        colors: {
          ...baseObj.colors,
          primary: config.primaryColor,
        },
      };
    }
  }

  return (
    activePalette[themeName as ThemeName] ||
    activePalette.pokeball ||
    activePalette.default
  );
}

export interface ThemeState {
  themeName: string;
  isAutoTheme: boolean;
  isDarkMode: boolean;
  customThemes: Record<string, CustomThemeConfig>;
  isLoaded: boolean;

  loadTheme: () => Promise<void>;
  setThemeName: (name: string) => Promise<void>;
  setIsAutoTheme: (val: boolean) => Promise<void>;
  setIsDarkMode: (val: boolean) => Promise<void>;
  addCustomTheme: (id: string, config: CustomThemeConfig) => Promise<void>;
  removeCustomTheme: (id: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: "pokeball",
  isAutoTheme: false,
  isDarkMode: false,
  customThemes: {},
  isLoaded: false,

  loadTheme: async () => {
    try {
      let localThemeName = "pokeball";
      let localIsDarkMode = false;
      let localIsAutoTheme = false;
      let localCustomThemes: Record<string, CustomThemeConfig> = {};

      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        if (savedTheme.startsWith("light-")) {
          const stripped = savedTheme.replace("light-", "");
          localThemeName = stripped === "default" ? "pokeball" : stripped;
          localIsDarkMode = false;
        } else {
          localThemeName = savedTheme === "default" ? "pokeball" : savedTheme;
        }
      }

      const autoTheme = await AsyncStorage.getItem(AUTO_THEME_STORAGE_KEY);
      if (autoTheme !== null) {
        localIsAutoTheme = autoTheme === "true";
      }

      const darkMode = await AsyncStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (darkMode !== null) {
        localIsDarkMode = darkMode === "true";
      }

      const customCfg = await AsyncStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
      if (customCfg) {
        try {
          localCustomThemes = JSON.parse(customCfg);
        } catch {}
      } else {
        const oldCustomCfg = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_CUSTOM_THEME);
        if (oldCustomCfg) {
          try {
            const parsed = JSON.parse(oldCustomCfg);
            if (parsed && parsed.pokemonId) {
              localCustomThemes = { [parsed.pokemonId]: parsed };
            }
          } catch {}
        }
      }

      set({
        themeName: localThemeName,
        isAutoTheme: localIsAutoTheme,
        isDarkMode: localIsDarkMode,
        customThemes: localCustomThemes,
        isLoaded: true,
      });
    } catch (e) {
      console.error("Failed to load theme in themeStore", e);
      set({ isLoaded: true });
    }
  },

  setThemeName: async (name: string) => {
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set({ themeName: name });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  },

  setIsAutoTheme: async (val: boolean) => {
    set({ isAutoTheme: val });
    try {
      await AsyncStorage.setItem(AUTO_THEME_STORAGE_KEY, String(val));
    } catch (e) {
      console.error("Failed to save auto theme", e);
    }
  },

  setIsDarkMode: async (val: boolean) => {
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set({ isDarkMode: val });
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(val));
    } catch (e) {
      console.error("Failed to save dark mode toggle", e);
    }
  },

  addCustomTheme: async (id: string, config: CustomThemeConfig) => {
    const updated = { ...get().customThemes, [id]: config };
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set({ customThemes: updated, themeName: `custom_${id}` });
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(THEME_STORAGE_KEY, `custom_${id}`);
    } catch (e) {
      console.error("Failed to save custom themes", e);
    }
  },

  removeCustomTheme: async (id: string) => {
    const updated = { ...get().customThemes };
    delete updated[id];
    set({ customThemes: updated });
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to remove custom theme from storage", e);
    }
  },
}));

// Hydrate store immediately
useThemeStore.getState().loadTheme();

/* ---------------------- FINE-GRAINED SELECTORS ------------------------ */
/** Pure selector for theme and dark mode */
export const selectAppTheme = (s: ThemeState): { theme: Theme; isDarkMode: boolean } => ({
  theme: computeTheme(s.themeName, s.isDarkMode, s.customThemes),
  isDarkMode: s.isDarkMode,
});

/** Selects only the active Theme object and dark mode flag using a single shallow-compared selector */
export const useAppTheme = (): { theme: Theme; isDarkMode: boolean } =>
  useThemeStore(useShallow(selectAppTheme));

/** Selects only custom themes dictionary (used exclusively by ThemeSelectionModal) */
export const useCustomThemes = () => useThemeStore((s) => s.customThemes);

/** Selects themeName */
export const useThemeName = () => useThemeStore((s) => s.themeName);

/** Selects isDarkMode */
export const useIsDarkMode = () => useThemeStore((s) => s.isDarkMode);

/** Selects isAutoTheme */
export const useIsAutoTheme = () => useThemeStore((s) => s.isAutoTheme);

/** Selects theme loading state */
export const useThemeLoaded = () => useThemeStore((s) => s.isLoaded);
