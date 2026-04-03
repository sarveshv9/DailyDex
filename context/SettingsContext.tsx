// context/SettingsContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Settings {
  notifications: {
    taskReminders: boolean;
    dailySummary: boolean;
    achievements: boolean;
    news: boolean;
  };
  hapticsEnabled: boolean;
  musicPreference: number;
}

interface SettingsContextType {
  settings: Settings;
  toggleNotification: (key: keyof Settings['notifications']) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setMusicPreference: (id: number) => void;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  notifications: {
    taskReminders: true,
    dailySummary: true,
    achievements: false,
    news: false,
  },
  hapticsEnabled: true,
  musicPreference: 0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let finalSettings: Settings | null = null;
        let localSettings: Settings | null = null;

        // 1. Load local
        const stored = await AsyncStorage.getItem('@zen_user_settings_v2');
        if (stored) {
          try { localSettings = JSON.parse(stored); } catch(e){}
        }

        // 2. Fetch remote if auth
        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth?.user) {
          const { data: remote, error } = await supabase.from('user_settings').select('preferences').eq('id', userAuth.user.id).single();
          if (!error && remote?.preferences) {
            finalSettings = { ...DEFAULT_SETTINGS, ...remote.preferences };
            await AsyncStorage.setItem('@zen_user_settings_v2', JSON.stringify(finalSettings));
          } else if (localSettings) {
            // Push local to remote
            finalSettings = localSettings;
            await supabase.from('user_settings').upsert({ id: userAuth.user.id, preferences: localSettings });
          }
        }

        // 3. Fallback
        if (!finalSettings && localSettings) {
          finalSettings = localSettings;
        }

        if (finalSettings) {
           setSettings(finalSettings);
        } else {
           // Provide ultimate default to remote if available
           setSettings(DEFAULT_SETTINGS);
           if (userAuth?.user) {
              await supabase.from('user_settings').upsert({ id: userAuth.user.id, preferences: DEFAULT_SETTINGS });
           }
        }

      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings on change
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('@zen_user_settings_v2', JSON.stringify(settings))
        .catch(e => console.error('Failed to save settings local', e));
      
      // Sync to cloud
      supabase.auth.getUser().then(async ({ data: userAuth }: { data: any }) => {
         if (userAuth?.user) {
            const { error } = await supabase.from('user_settings').upsert({ id: userAuth.user.id, preferences: settings });
            if (error) console.error('Failed to sync settings', error);
         }
      });
    }
  }, [settings, isLoading]);

  const toggleNotification = useCallback((key: keyof Settings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, hapticsEnabled: enabled }));
  }, []);

  const setMusicPreference = useCallback((id: number) => {
    setSettings(prev => ({ ...prev, musicPreference: id }));
  }, []);

  const value = useMemo(() => ({
    settings,
    toggleNotification,
    setHapticsEnabled,
    setMusicPreference,
    isLoading,
  }), [settings, isLoading, toggleNotification, setHapticsEnabled, setMusicPreference]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
