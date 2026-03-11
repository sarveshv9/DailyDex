import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { darkThemes, lightThemes, Theme, ThemeName } from '../constants/shared';

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  isAutoTheme: boolean;
  setIsAutoTheme: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightThemes.default,
  themeName: 'default',
  setThemeName: () => { },
  isAutoTheme: false,
  setIsAutoTheme: () => { },
  isDarkMode: false,
  setIsDarkMode: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');
  const [isAutoTheme, setIsAutoThemeState] = useState<boolean>(false);
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@zen_theme');
        if (savedTheme) {
          // Backward compatibility: If it starts with light-, strip it and turn off dark mode
          if (savedTheme.startsWith('light-')) {
            const stripped = savedTheme.replace('light-', '');
            setThemeNameState((stripped === 'default' ? 'default' : stripped));
            setIsDarkModeState(false);
          } else {
            setThemeNameState(savedTheme);
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
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeName = async (name: ThemeName) => {
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

  const theme = useMemo<Theme>(() => {
    // Determine the active theme palette mapping based on dark mode setting.
    const activePalette = isDarkMode ? darkThemes : lightThemes;
    return activePalette[themeName] || activePalette.default;
  }, [themeName, isDarkMode]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);