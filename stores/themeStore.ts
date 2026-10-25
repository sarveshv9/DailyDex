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
import { createTheme } from "../constants/themeGenerator";
import { DEFAULT_THEME_NAME, THEME_ACCENTS } from "../constants/themeRegistry";
import { Theme } from "../styles/shared";

export interface CustomThemeConfig {
  id?: string;
  pokemonId: string;
  primaryColor: string;
  accentHex?: string;
  name: string;
}

export function computeTheme(
  themeName: string,
  isDarkMode: boolean,
  customThemes: Record<string, CustomThemeConfig> = {}
): Theme {
  const mode = isDarkMode ? "dark" : "light";

  // 1. Custom user-created theme
  if (themeName && themeName.startsWith("custom_")) {
    const customId = themeName.replace("custom_", "");
    const config = customThemes[customId];
    if (config) {
      const accent = config.accentHex || config.primaryColor || THEME_ACCENTS[DEFAULT_THEME_NAME].accent;
      return createTheme(accent, mode);
    }
  }

  // 2. Preset theme from registry
  const preset = THEME_ACCENTS[themeName as keyof typeof THEME_ACCENTS];
  if (preset) {
    return createTheme(preset.accent, mode);
  }

  // 3. Fallback gracefully (e.g. pokeball accent), never undefined
  const fallbackAccent = THEME_ACCENTS[DEFAULT_THEME_NAME]?.accent || "#FF3333";
  return createTheme(fallbackAccent, mode);
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

const initialTheme = computeTheme(DEFAULT_THEME_NAME, false, {});

let themeRevision = 0;

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: DEFAULT_THEME_NAME,
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
      let localThemeName = DEFAULT_THEME_NAME;
      let localIsDarkMode = false;
      let localIsAutoTheme = false;
      let localCustomThemes: Record<string, CustomThemeConfig> = {};

      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        if (savedTheme.startsWith("light-")) {
          const stripped = savedTheme.replace("light-", "");
          localThemeName = stripped === "default" ? DEFAULT_THEME_NAME : stripped;
          localIsDarkMode = false;
        } else {
          localThemeName = savedTheme === "default" ? DEFAULT_THEME_NAME : savedTheme;
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
          const parsed = JSON.parse(customCfg);
          if (parsed && typeof parsed === "object") {
            // Normalize customThemes: ensure accentHex exists and strip any stored full theme palettes
            for (const [id, cfg] of Object.entries(parsed as Record<string, any>)) {
              if (cfg && typeof cfg === "object") {
                const accent = cfg.accentHex || cfg.primaryColor || "#FF3333";
                localCustomThemes[id] = {
                  id: String(cfg.id || cfg.pokemonId || id),
                  pokemonId: String(cfg.pokemonId || cfg.id || id),
                  primaryColor: accent,
                  accentHex: accent,
                  name: String(cfg.name || "Custom"),
                };
              }
            }
          }
        } catch {}
      } else {
        const oldCustomCfg = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_CUSTOM_THEME);
        if (oldCustomCfg) {
          try {
            const parsed = JSON.parse(oldCustomCfg);
            if (parsed && parsed.pokemonId) {
              const accent = parsed.accentHex || parsed.primaryColor || "#FF3333";
              localCustomThemes = {
                [parsed.pokemonId]: {
                  id: String(parsed.pokemonId),
                  pokemonId: String(parsed.pokemonId),
                  primaryColor: accent,
                  accentHex: accent,
                  name: String(parsed.name || "Custom"),
                },
              };
            }
          } catch {}
        }
      }

      const computed = computeTheme(localThemeName, localIsDarkMode, localCustomThemes);

      set(() => {
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
    const accent = config.accentHex || config.primaryColor;
    const normalizedConfig: CustomThemeConfig = {
      id: String(id),
      pokemonId: String(config.pokemonId || id),
      primaryColor: accent,
      accentHex: accent,
      name: config.name,
    };
    const updated = { ...get().customThemes, [id]: normalizedConfig };
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isDark = get().isDarkMode;
    set({
      customThemes: updated,
      themeName: `custom_${id}`,
      theme: computeTheme(`custom_${id}`, isDark, updated),
    });
    try {
      // Store ONLY inputs: id, name, accentHex, pokemonId. NEVER the computed theme object!
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
export const useThemeOnly = (): Theme => useThemeStore((s) => s.theme);
export const useIsDarkMode = (): boolean => useThemeStore((s) => s.isDarkMode);
export const useAppTheme = (): { theme: Theme; isDarkMode: boolean } => {
  const theme = useThemeStore((s) => s.theme);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  return { theme, isDarkMode };
};
export const useCustomThemes = () => useThemeStore((s) => s.customThemes);
export const useThemeName = () => useThemeStore((s) => s.themeName);
export const useIsAutoTheme = () => useThemeStore((s) => s.isAutoTheme);
export const useThemeLoaded = () => useThemeStore((s) => s.isLoaded);
