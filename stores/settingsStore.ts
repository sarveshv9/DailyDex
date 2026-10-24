import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import { ROUTINE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "../constants/storageKeys";
import type { UserSettings } from "../types/user";

export type Settings = UserSettings;

export const DEFAULT_SETTINGS: Settings = {
  notifications: {
    taskReminders: true,
  },
  hapticsEnabled: true,
  musicPreference: 0,
};

export interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  toggleNotification: (key: keyof Settings["notifications"]) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setMusicPreference: (id: number) => Promise<void>;
}

let userChangedSettings: Partial<Settings> = {};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const diskSettings = JSON.parse(stored);
        set(() => ({
          settings: {
            ...DEFAULT_SETTINGS,
            ...diskSettings,
            ...userChangedSettings,
            notifications: {
              ...DEFAULT_SETTINGS.notifications,
              ...(diskSettings.notifications || {}),
              ...(userChangedSettings.notifications || {}),
            },
          },
          isLoading: false,
        }));
      } else {
        set(() => ({
          settings: {
            ...DEFAULT_SETTINGS,
            ...userChangedSettings,
            notifications: {
              ...DEFAULT_SETTINGS.notifications,
              ...(userChangedSettings.notifications || {}),
            },
          },
          isLoading: false,
        }));
      }
    } catch (e) {
      console.error("Failed to load settings in settingsStore", e);
      set({ isLoading: false });
    }
  },

  toggleNotification: async (key: keyof Settings["notifications"]) => {
    const prev = get().settings;
    const nextVal = !prev.notifications[key];
    const newNotifications = {
      ...prev.notifications,
      [key]: nextVal,
    };
    userChangedSettings = {
      ...userChangedSettings,
      notifications: {
        ...(userChangedSettings.notifications || {}),
        [key]: nextVal,
      },
    };
    const newSettings: Settings = {
      ...prev,
      notifications: newNotifications,
    };

    set({ settings: newSettings });
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings)).catch((e) =>
      console.error("Failed to save settings local", e)
    );

    if (key === "taskReminders") {
      if (!nextVal) {
        import("../utils/notifications").then(({ cancelAllRoutineNotifications }) => {
          cancelAllRoutineNotifications();
        });
      } else {
        AsyncStorage.getItem(ROUTINE_STORAGE_KEY).then((data) => {
          if (data) {
            try {
              const routines = JSON.parse(data);
              import("../utils/notifications").then(({ scheduleRoutineNotifications }) => {
                scheduleRoutineNotifications(routines);
              });
            } catch {}
          }
        });
      }
    }
  },

  setHapticsEnabled: async (enabled: boolean) => {
    userChangedSettings = { ...userChangedSettings, hapticsEnabled: enabled };
    const newSettings: Settings = { ...get().settings, hapticsEnabled: enabled };
    set({ settings: newSettings });
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings)).catch((e) =>
      console.error("Failed to save settings local", e)
    );
  },

  setMusicPreference: async (id: number) => {
    userChangedSettings = { ...userChangedSettings, musicPreference: id };
    const newSettings: Settings = { ...get().settings, musicPreference: id };
    set({ settings: newSettings });
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings)).catch((e) =>
      console.error("Failed to save settings local", e)
    );
  },
}));

/* ---------------------- FINE-GRAINED SELECTORS ------------------------ */
export const useHapticsEnabled = () =>
  useSettingsStore((s) => s.settings.hapticsEnabled);

export const useMusicPreference = () =>
  useSettingsStore((s) => s.settings.musicPreference);

export const useTaskReminders = () =>
  useSettingsStore((s) => s.settings.notifications.taskReminders);

export const useSettingsLoading = () =>
  useSettingsStore((s) => s.isLoading);

export const useSettingsActions = () => {
  const toggleNotification = useSettingsStore((s) => s.toggleNotification);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setMusicPreference = useSettingsStore((s) => s.setMusicPreference);
  return { toggleNotification, setHapticsEnabled, setMusicPreference };
};
