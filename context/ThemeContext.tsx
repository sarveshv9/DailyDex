import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { lightThemes, Theme, ThemeName, themes } from '../constants/shared';

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.default,
  themeName: 'default',
  setThemeName: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@zen_theme');
        if (savedTheme) {
          setThemeNameState(savedTheme as ThemeName);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
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

  const theme = useMemo<Theme>(() => {
    if (typeof themeName === 'string' && themeName.startsWith('light-')) {
      const light = lightThemes[themeName];
      if (light) return light;
      const suffix = themeName.replace('light-', '');
      return themes[suffix as keyof typeof themes] || themes.default;
    }
    return themes[themeName as keyof typeof themes] || themes.default;
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);