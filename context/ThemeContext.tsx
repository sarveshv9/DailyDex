import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { darkThemes, lightThemes, Theme, ThemeName } from '../constants/shared';

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
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@zen_theme');
        if (savedTheme) {
          // Backward compatibility: If it starts with light-, strip it and turn off dark mode
          if (savedTheme.startsWith('light-')) {
            const stripped = savedTheme.replace('light-', '');
            setThemeNameState((stripped === 'default' ? 'pokeball' : stripped));
            setIsDarkModeState(false);
          } else {
            setThemeNameState(savedTheme === 'default' ? 'pokeball' : savedTheme);
            // By default backwards compat, non-light- strings were 'heavy' mode, 
            // but now we need an explicit dark mode.
          }
        }

        const autoTheme = await AsyncStorage.getItem('@zen_auto_theme');
        if (autoTheme !== null) {
          setIsAutoThemeState(autoTheme === 'true');
        }

        const darkMode = await AsyncStorage.getItem('@zen_dark_mode');
        if (darkMode !== null) {
          setIsDarkModeState(darkMode === 'true');
        }

        const customCfg = await AsyncStorage.getItem('@zen_custom_themes');
        if (customCfg) {
          try {
            setCustomThemesState(JSON.parse(customCfg));
          } catch (e) {
            console.error('Failed to parse custom themes dict', e);
          }
        } else {
             // Backward compatibility migration for users with single old key
             const oldCustomCfg = await AsyncStorage.getItem('@zen_custom_theme');
             if (oldCustomCfg) {
                 try {
                     const parsed = JSON.parse(oldCustomCfg);
                     if (parsed && parsed.pokemonId) {
                         setCustomThemesState({ [parsed.pokemonId]: parsed });
                     }
                 } catch(e) {}
             }
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeName = async (name: string) => {
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem('@zen_theme', name);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const setIsAutoTheme = async (val: boolean) => {
    setIsAutoThemeState(val);
    try {
      await AsyncStorage.setItem('@zen_auto_theme', String(val));
    } catch (e) {
      console.error('Failed to save auto theme', e);
    }
  };

  const setIsDarkMode = async (val: boolean) => {
    setIsDarkModeState(val);
    try {
      await AsyncStorage.setItem('@zen_dark_mode', String(val));
    } catch (e) {
      console.error('Failed to save dark mode toggle', e);
    }
  }

  const addCustomTheme = async (id: string, config: CustomThemeConfig) => {
    const updated = { ...customThemes, [id]: config };
    setCustomThemesState(updated);
    // Explicitly set the new themeName before await
    setThemeNameState(`custom_${id}`);
    try {
      await AsyncStorage.setItem('@zen_custom_themes', JSON.stringify(updated));
      await AsyncStorage.setItem('@zen_theme', `custom_${id}`);
    } catch (e) {
      console.error('Failed to save custom themes', e);
    }
  };

  const removeCustomTheme = async (id: string) => {
    const updated = { ...customThemes };
    delete updated[id];
    setCustomThemesState(updated);
    try {
      await AsyncStorage.setItem('@zen_custom_themes', JSON.stringify(updated));
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