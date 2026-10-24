// context/SettingsContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore, Settings, DEFAULT_SETTINGS } from '../stores/settingsStore';

export type { Settings };

interface SettingsContextType {
  settings: Settings;
  toggleNotification: (key: keyof Settings['notifications']) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setMusicPreference: (id: number) => void;
  isLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settings = useSettingsStore((s) => s.settings);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const toggleNotification = useSettingsStore((s) => s.toggleNotification);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setMusicPreference = useSettingsStore((s) => s.setMusicPreference);

  const value = useMemo(
    () => ({
      settings,
      toggleNotification,
      setHapticsEnabled,
      setMusicPreference,
      isLoading,
    }),
    [settings, isLoading, toggleNotification, setHapticsEnabled, setMusicPreference]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const storeSettings = useSettingsStore((s) => s.settings);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const toggleNotification = useSettingsStore((s) => s.toggleNotification);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setMusicPreference = useSettingsStore((s) => s.setMusicPreference);

  return {
    settings: storeSettings,
    toggleNotification,
    setHapticsEnabled,
    setMusicPreference,
    isLoading,
  };
};

export {
  useHapticsEnabled,
  useMusicPreference,
  useTaskReminders,
  useSettingsLoading,
  useSettingsActions,
} from '../stores/settingsStore';
