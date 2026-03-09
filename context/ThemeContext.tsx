import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { lightThemes, Theme, ThemeName, themes } from '../constants/shared';

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  isAutoTheme: boolean;
  setIsAutoTheme: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.default,
  themeName: 'default',
  setThemeName: () => { },
  isAutoTheme: false,
  setIsAutoTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');
  const [isAutoTheme, setIsAutoThemeState] = useState<boolean>(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@zen_theme');
        if (savedTheme) {
          if (savedTheme === 'light-default') {
            setThemeNameState('default');
            await AsyncStorage.setItem('@zen_theme', 'default');
          } else {
            setThemeNameState(savedTheme as ThemeName);
          }
        }
        const autoTheme = await AsyncStorage.getItem('@zen_auto_theme');
        if (autoTheme !== null) {
          setIsAutoThemeState(autoTheme === 'true');
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

  const setIsAutoTheme = async (val: boolean) => {
    setIsAutoThemeState(val);
    try {
      await AsyncStorage.setItem('@zen_auto_theme', String(val));
    } catch (e) {
      console.error('Failed to save auto theme', e);
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
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);