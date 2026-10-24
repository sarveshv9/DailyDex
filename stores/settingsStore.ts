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

let settingsRevision = 0;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const startRevision = settingsRevision;
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        set((state) => ({
          settings: {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored),
            ...(settingsRevision > startRevision ? state.settings : {}),
          },
          isLoading: false,
        }));
      } else {
        set({ settings: DEFAULT_SETTINGS, isLoading: false });
      }
    } catch (e) {
      console.error("Failed to load settings in settingsStore", e);
      set({ isLoading: false });
    }
  },

  toggleNotification: async (key: keyof Settings["notifications"]) => {
    settingsRevision++;
    const prev = get().settings;
    const nextVal = !prev.notifications[key];
    const newSettings: Settings = {
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: nextVal,
      },
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
    settingsRevision++;
    const newSettings: Settings = { ...get().settings, hapticsEnabled: enabled };
    set({ settings: newSettings });
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings)).catch((e) =>
      console.error("Failed to save settings local", e)
    );
  },

  setMusicPreference: async (id: number) => {
    settingsRevision++;
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
