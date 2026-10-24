import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import {
  AUTO_THEME_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY,
  DARK_MODE_STORAGE_KEY,
  STORAGE_KEYS,
  THEME_STORAGE_KEY,
} from '../constants/storageKeys';
import { darkThemes, lightThemes, Theme, ThemeName } from '../styles/shared';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArchitecture = Boolean((globalThis as any).nativeFabricUIManager) || Boolean((globalThis as any).__turboModuleProxy);
  if (!isNewArchitecture) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export interface CustomThemeConfig {
  pokemonId: string;
  primaryColor: string;
  name: string;
}

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName | string; // Allow custom strings like "custom_pikachu"
  setThemeName: (name: string) => void;
  isAutoTheme: boolean;
  setIsAutoTheme: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  customThemes: Record<string, CustomThemeConfig>;
  addCustomTheme: (id: string, config: CustomThemeConfig) => void;
  removeCustomTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightThemes.pokeball,
  themeName: 'pokeball',
  setThemeName: () => { },
  isAutoTheme: false,
  setIsAutoTheme: () => { },
  isDarkMode: false,
  setIsDarkMode: () => { },
  customThemes: {},
  addCustomTheme: () => { },
  removeCustomTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<string>('pokeball');
  const [isAutoTheme, setIsAutoThemeState] = useState<boolean>(false);
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);
  const [customThemes, setCustomThemesState] = useState<Record<string, CustomThemeConfig>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Inject gentle color transition for Web platform globally
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        div, span {
          transition-property: background-color, border-color, color;
          transition-duration: 0.3s;
          transition-timing-function: ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }

    const loadTheme = async () => {
      try {
        let localThemeName = 'pokeball';
        let localIsDarkMode = false;
        let localIsAutoTheme = false;
        let localCustomThemes: Record<string, CustomThemeConfig> = {};

        // 1. Load Local State
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          if (savedTheme.startsWith('light-')) {
            const stripped = savedTheme.replace('light-', '');
            localThemeName = (stripped === 'default' ? 'pokeball' : stripped);
            localIsDarkMode = false;
          } else {
            localThemeName = savedTheme === 'default' ? 'pokeball' : savedTheme;
          }
        }

        const autoTheme = await AsyncStorage.getItem(AUTO_THEME_STORAGE_KEY);
        if (autoTheme !== null) {
          localIsAutoTheme = autoTheme === 'true';
        }

        const darkMode = await AsyncStorage.getItem(DARK_MODE_STORAGE_KEY);
        if (darkMode !== null) {
          localIsDarkMode = darkMode === 'true';
        }

        const customCfg = await AsyncStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
        if (customCfg) {
          try {
            localCustomThemes = JSON.parse(customCfg);
          } catch (e) {}
        } else {
             const oldCustomCfg = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_CUSTOM_THEME);
             if (oldCustomCfg) {
                 try {
                     const parsed = JSON.parse(oldCustomCfg);
                     if (parsed && parsed.pokemonId) {
                         localCustomThemes = { [parsed.pokemonId]: parsed };
                     }
                 } catch(e) {}
             }
        }

        setThemeNameState(localThemeName);
        setIsAutoThemeState(localIsAutoTheme);
        setIsDarkModeState(localIsDarkMode);
        setCustomThemesState(localCustomThemes);

      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeName = async (name: string) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const setIsAutoTheme = async (val: boolean) => {
    setIsAutoThemeState(val);
    try {
      await AsyncStorage.setItem(AUTO_THEME_STORAGE_KEY, String(val));
    } catch (e) {
      console.error('Failed to save auto theme', e);
    }
  };

  const setIsDarkMode = async (val: boolean) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkModeState(val);
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(val));
    } catch (e) {
      console.error('Failed to save dark mode toggle', e);
    }
  }

  const addCustomTheme = async (id: string, config: CustomThemeConfig) => {
    const updated = { ...customThemes, [id]: config };
    setCustomThemesState(updated);
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeNameState(`custom_${id}`);
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(THEME_STORAGE_KEY, `custom_${id}`);
    } catch (e) {
      console.error('Failed to save custom themes', e);
    }
  };

  const removeCustomTheme = async (id: string) => {
    const updated = { ...customThemes };
    delete updated[id];
    setCustomThemesState(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove custom theme from storage', e);
    }
  };

  const theme = useMemo<Theme>(() => {
    // Determine the active theme palette mapping based on dark mode setting.
    const activePalette = isDarkMode ? darkThemes : lightThemes;
    
    if (themeName.startsWith('custom_')) {
      const customId = themeName.replace('custom_', '');
      const config = customThemes[customId];
      if (config) {
        const baseObj = activePalette.pokeball || activePalette.default;
        return {
          ...baseObj,
          colors: {
            ...baseObj.colors,
            primary: config.primaryColor,
          }
        };
      }
    }
    
    // Fallback if custom ID is missing, or return valid theme
    return activePalette[themeName as ThemeName] || activePalette.pokeball || activePalette.default;
  }, [themeName, isDarkMode, customThemes]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode, customThemes, addCustomTheme, removeCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);