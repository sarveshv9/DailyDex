/**
 * Canonical single-source-of-truth storage keys used throughout Zen app.
 * All AsyncStorage (and future MMKV) access should reference these constants
 * to guarantee backwards-compatibility and prevent key drift.
 */

export const STORAGE_KEYS = {
  /** Active countdown or Pomodoro timer state */
  ACTIVE_TIMER: "@zen_active_timer",

  /** Routine steps list and schedule */
  ROUTINE: "@zen_routine",

  /** Active task list (todos) */
  TASKS: "@zen_tasks",

  /** Legacy task list key for backwards compatibility and migrations */
  LEGACY_TASKS: "@todo_tasks",

  /** Onboarding wizard completion flag */
  SETUP_COMPLETE: "@zen_setup_complete",

  /** User profile information (name, avatar, role, bio) */
  USER_PROFILE: "@zen_user_profile",

  /** User preferences and app settings v2 */
  USER_SETTINGS: "@zen_user_settings_v2",

  /** Historical focus and task completion statistics */
  STATS: "@zen_stats",

  /** Active theme name */
  THEME: "@zen_theme",

  /** Auto theme (time-of-day matching) toggle */
  AUTO_THEME: "@zen_auto_theme",

  /** Dark mode toggle */
  DARK_MODE: "@zen_dark_mode",

  /** User-created custom Pokemon theme configurations */
  CUSTOM_THEMES: "@zen_custom_themes",

  /** Legacy single custom theme configuration */
  LEGACY_CUSTOM_THEME: "@zen_custom_theme",

  /** Profile setup modal completed flag */
  PROFILE_SETUP_COMPLETE: "@zen_profile_setup_complete",
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/** Convenience aliases */
export const TIMER_STORAGE_KEY = STORAGE_KEYS.ACTIVE_TIMER;
export const ROUTINE_STORAGE_KEY = STORAGE_KEYS.ROUTINE;
export const TASKS_STORAGE_KEY = STORAGE_KEYS.TASKS;
export const SETUP_STORAGE_KEY = STORAGE_KEYS.SETUP_COMPLETE;
export const USER_PROFILE_STORAGE_KEY = STORAGE_KEYS.USER_PROFILE;
export const SETTINGS_STORAGE_KEY = STORAGE_KEYS.USER_SETTINGS;
export const STATS_STORAGE_KEY = STORAGE_KEYS.STATS;
export const THEME_STORAGE_KEY = STORAGE_KEYS.THEME;
export const AUTO_THEME_STORAGE_KEY = STORAGE_KEYS.AUTO_THEME;
export const DARK_MODE_STORAGE_KEY = STORAGE_KEYS.DARK_MODE;
export const CUSTOM_THEMES_STORAGE_KEY = STORAGE_KEYS.CUSTOM_THEMES;
export const PROFILE_SETUP_STORAGE_KEY = STORAGE_KEYS.PROFILE_SETUP_COMPLETE;
