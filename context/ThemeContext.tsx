import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { Platform, UIManager } from 'react-native';
import { useThemeStore, computeTheme, CustomThemeConfig } from '../stores/themeStore';
import { Theme, ThemeName } from '../styles/shared';

export type { CustomThemeConfig };

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArchitecture = Boolean((globalThis as any).nativeFabricUIManager) || Boolean((globalThis as any).__turboModuleProxy);
  if (!isNewArchitecture) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName | string;
  setThemeName: (name: string) => void;
  isAutoTheme: boolean;
  setIsAutoTheme: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  customThemes: Record<string, CustomThemeConfig>;
  addCustomTheme: (id: string, config: CustomThemeConfig) => void;
  removeCustomTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const themeName = useThemeStore((s) => s.themeName);
  const isAutoTheme = useThemeStore((s) => s.isAutoTheme);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const customThemes = useThemeStore((s) => s.customThemes);
  const isLoaded = useThemeStore((s) => s.isLoaded);

  const setThemeName = useThemeStore((s) => s.setThemeName);
  const setIsAutoTheme = useThemeStore((s) => s.setIsAutoTheme);
  const setIsDarkMode = useThemeStore((s) => s.setIsDarkMode);
  const addCustomTheme = useThemeStore((s) => s.addCustomTheme);
  const removeCustomTheme = useThemeStore((s) => s.removeCustomTheme);

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
  }, []);

  const theme = useMemo<Theme>(() => {
    return computeTheme(themeName, isDarkMode, customThemes);
  }, [themeName, isDarkMode, customThemes]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      themeName,
      setThemeName,
      isAutoTheme,
      setIsAutoTheme,
      isDarkMode,
      setIsDarkMode,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
    }),
    [
      theme,
      themeName,
      setThemeName,
      isAutoTheme,
      setIsAutoTheme,
      isDarkMode,
      setIsDarkMode,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
    ]
  );

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context) return context;

  // Fallback direct store access if used outside ThemeProvider
  const themeName = useThemeStore.getState().themeName;
  const isAutoTheme = useThemeStore.getState().isAutoTheme;
  const isDarkMode = useThemeStore.getState().isDarkMode;
  const customThemes = useThemeStore.getState().customThemes;

  return {
    theme: computeTheme(themeName, isDarkMode, customThemes),
    themeName,
    setThemeName: useThemeStore.getState().setThemeName,
    isAutoTheme,
    setIsAutoTheme: useThemeStore.getState().setIsAutoTheme,
    isDarkMode,
    setIsDarkMode: useThemeStore.getState().setIsDarkMode,
    customThemes,
    addCustomTheme: useThemeStore.getState().addCustomTheme,
    removeCustomTheme: useThemeStore.getState().removeCustomTheme,
  };
};