import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { darkThemes, lightThemes, Theme, ThemeName } from '../constants/shared';
import { supabase } from '../lib/supabase';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
        const savedTheme = await AsyncStorage.getItem('@zen_theme');
        if (savedTheme) {
          if (savedTheme.startsWith('light-')) {
            const stripped = savedTheme.replace('light-', '');
            localThemeName = (stripped === 'default' ? 'pokeball' : stripped);
            localIsDarkMode = false;
          } else {
            localThemeName = savedTheme === 'default' ? 'pokeball' : savedTheme;
          }
        }

        const autoTheme = await AsyncStorage.getItem('@zen_auto_theme');
        if (autoTheme !== null) {
          localIsAutoTheme = autoTheme === 'true';
        }

        const darkMode = await AsyncStorage.getItem('@zen_dark_mode');
        if (darkMode !== null) {
          localIsDarkMode = darkMode === 'true';
        }

        const customCfg = await AsyncStorage.getItem('@zen_custom_themes');
        if (customCfg) {
          try {
            localCustomThemes = JSON.parse(customCfg);
          } catch (e) {}
        } else {
             const oldCustomCfg = await AsyncStorage.getItem('@zen_custom_theme');
             if (oldCustomCfg) {
                 try {
                     const parsed = JSON.parse(oldCustomCfg);
                     if (parsed && parsed.pokemonId) {
                         localCustomThemes = { [parsed.pokemonId]: parsed };
                     }
                 } catch(e) {}
             }
        }

        // 2. Fetch Remote State
        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth?.user) {
           const { data: remote, error } = await supabase.from('user_themes').select('*').eq('id', userAuth.user.id).single();
           if (!error && remote) {
               // Use remote state as truth
               localThemeName = remote.active_theme;
               localIsDarkMode = remote.is_dark_mode;
               localIsAutoTheme = remote.auto_theme;
               localCustomThemes = remote.custom_themes || {};

               // Sync down to local storage
               await AsyncStorage.setItem('@zen_theme', localThemeName);
               await AsyncStorage.setItem('@zen_auto_theme', String(localIsAutoTheme));
               await AsyncStorage.setItem('@zen_dark_mode', String(localIsDarkMode));
               await AsyncStorage.setItem('@zen_custom_themes', JSON.stringify(localCustomThemes));
           } else {
               // Push local state up to Supabase to initialize
               await supabase.from('user_themes').upsert({
                    id: userAuth.user.id,
                    active_theme: localThemeName,
                    is_dark_mode: localIsDarkMode,
                    auto_theme: localIsAutoTheme,
                    custom_themes: localCustomThemes
                });
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

  // 3. Sync to cloud on local changes
  useEffect(() => {
    if (!isLoaded) return;
    const syncToCloud = async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user) {
        await supabase.from('user_themes').upsert({
          id: userAuth.user.id,
          active_theme: themeName,
          is_dark_mode: isDarkMode,
          auto_theme: isAutoTheme,
          custom_themes: customThemes
        });
      }
    };
    syncToCloud();
  }, [themeName, isAutoTheme, isDarkMode, customThemes, isLoaded]);

  const setThemeName = async (name: string) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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