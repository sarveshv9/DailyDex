// context/SettingsContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { ROUTINE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '../constants/storageKeys';

import type { UserSettings } from "../types/user";

export type Settings = UserSettings;

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
  },
  hapticsEnabled: true,
  musicPreference: 0,
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        } else {
          setSettings(DEFAULT_SETTINGS);
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
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
        .catch(e => console.error('Failed to save settings local', e));
    }
  }, [settings, isLoading]);

  const toggleNotification = useCallback((key: keyof Settings['notifications']) => {
    setSettings(prev => {
      const nextVal = !prev.notifications[key];
      if (key === 'taskReminders') {
        if (!nextVal) {
          import('../utils/notifications').then(({ cancelAllRoutineNotifications }) => {
            cancelAllRoutineNotifications();
          });
        } else {
          AsyncStorage.getItem(ROUTINE_STORAGE_KEY).then(data => {
            if (data) {
              try {
                const routines = JSON.parse(data);
                import('../utils/notifications').then(({ scheduleRoutineNotifications }) => {
                  scheduleRoutineNotifications(routines);
                });
              } catch {}
            }
          });
        }
      }
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: nextVal,
        },
      };
    });
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
