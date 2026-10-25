import AsyncStorage from "@react-native-async-storage/async-storage";
import { LayoutAnimation, Platform } from "react-native";
import { create } from "zustand";
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
  theme: Theme;
  isLoaded: boolean;

  loadTheme: () => Promise<void>;
  setThemeName: (name: string) => Promise<void>;
  setIsAutoTheme: (val: boolean) => Promise<void>;
  setIsDarkMode: (val: boolean) => Promise<void>;
  addCustomTheme: (id: string, config: CustomThemeConfig) => Promise<void>;
  removeCustomTheme: (id: string) => Promise<void>;
}

const initialTheme = computeTheme("pokeball", false, {});

let themeRevision = 0;

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: "pokeball",
  isAutoTheme: false,
  isDarkMode: false,
  customThemes: {},
  theme: initialTheme,
  isLoaded: false,

  loadTheme: async () => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      set({ isLoaded: true });
      return;
    }
    const startRevision = themeRevision;
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

      const computed = computeTheme(localThemeName, localIsDarkMode, localCustomThemes);

      set((state) => {
        if (themeRevision > startRevision) {
          return { isLoaded: true };
        }
        return {
          themeName: localThemeName,
          isAutoTheme: localIsAutoTheme,
          isDarkMode: localIsDarkMode,
          customThemes: localCustomThemes,
          theme: computed,
          isLoaded: true,
        };
      });
    } catch (e) {
      console.error("Failed to load theme in themeStore", e);
      set({ isLoaded: true });
    }
  },

  setThemeName: async (name: string) => {
    themeRevision++;
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isDark = get().isDarkMode;
    const customs = get().customThemes;
    set({ themeName: name, theme: computeTheme(name, isDark, customs) });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  },

  setIsAutoTheme: async (val: boolean) => {
    themeRevision++;
    set({ isAutoTheme: val });
    try {
      await AsyncStorage.setItem(AUTO_THEME_STORAGE_KEY, String(val));
    } catch (e) {
      console.error("Failed to save auto theme", e);
    }
  },

  setIsDarkMode: async (val: boolean) => {
    themeRevision++;
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const name = get().themeName;
    const customs = get().customThemes;
    set({ isDarkMode: val, theme: computeTheme(name, val, customs) });
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(val));
    } catch (e) {
      console.error("Failed to save dark mode toggle", e);
    }
  },

  addCustomTheme: async (id: string, config: CustomThemeConfig) => {
    themeRevision++;
    const updated = { ...get().customThemes, [id]: config };
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isDark = get().isDarkMode;
    set({
      customThemes: updated,
      themeName: `custom_${id}`,
      theme: computeTheme(`custom_${id}`, isDark, updated),
    });
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(THEME_STORAGE_KEY, `custom_${id}`);
    } catch (e) {
      console.error("Failed to save custom themes", e);
    }
  },

  removeCustomTheme: async (id: string) => {
    themeRevision++;
    const updated = { ...get().customThemes };
    delete updated[id];
    const name = get().themeName;
    const isDark = get().isDarkMode;
    set({
      customThemes: updated,
      theme: computeTheme(name, isDark, updated),
    });
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to remove custom theme from storage", e);
    }
  },
}));

/* ---------------------- FINE-GRAINED SELECTORS ------------------------ */
/** Selects only the active Theme object directly from the store (referentially stable) */
export const useThemeOnly = (): Theme => useThemeStore((s) => s.theme);

/** Selects isDarkMode (primitive boolean) */
export const useIsDarkMode = (): boolean => useThemeStore((s) => s.isDarkMode);

/** Selects active Theme and dark mode flag with cached referential stability */
export const useAppTheme = (): { theme: Theme; isDarkMode: boolean } => {
  const theme = useThemeStore((s) => s.theme);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  return { theme, isDarkMode };
};

/** Selects only custom themes dictionary (used exclusively by ThemeSelectionModal) */
export const useCustomThemes = () => useThemeStore((s) => s.customThemes);

/** Selects themeName */
export const useThemeName = () => useThemeStore((s) => s.themeName);

/** Selects isAutoTheme */
export const useIsAutoTheme = () => useThemeStore((s) => s.isAutoTheme);

/** Selects theme loading state */
export const useThemeLoaded = () => useThemeStore((s) => s.isLoaded);
