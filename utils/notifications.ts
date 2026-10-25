import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { RoutineItem, timeToMinutes } from "./utils";
import { SETTINGS_STORAGE_KEY } from "../constants/storageKeys";

// Configure how notifications appear while app is in the foreground
// Skip on web - expo-notifications doesn't work on web
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
      handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
      }),
  });
}

const CHANNEL_ID = "zen-routine";
const NOTIFICATION_ID_PREFIX = "zen-routine-";
export const FOCUS_CHANNEL_ID = "zen-focus-alarms";
export const FOCUS_NOTIFICATION_ID = "zen-focus-timer";

/**
 * Request user permission for local notifications.
 * Should be called on app startup.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: "Zen Routine Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
        await Notifications.setNotificationChannelAsync(FOCUS_CHANNEL_ID, {
            name: "Focus Timer Alarms",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: "#4DA6FF",
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
};

/**
 * Schedule a daily local notification for each routine item.
 * Cancels any prev scheduled zen-routine notifications first.
 */
export const scheduleRoutineNotifications = async (
    routines: RoutineItem[]
): Promise<void> => {
    if (Platform.OS === 'web') return;
    // Cancel all existing routine notifications
    await cancelAllRoutineNotifications();

    // Respect user's notification setting
    try {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            if (parsed?.notifications?.taskReminders === false) {
                return;
            }
        }
    } catch {}

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    for (const item of routines) {
        if (item.isSkipped) continue;

        const minutes = timeToMinutes(item.time);
        if (minutes === Number.MAX_SAFE_INTEGER) continue; // skip invalid times

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        const emoji = item.imageKey === "wakeup" ? "🌅"
            : item.imageKey === "water" ? "💧"
                : item.imageKey === "yoga" ? "🧘"
                    : item.imageKey === "tea_journal" ? "🍵"
                        : item.imageKey === "breakfast" ? "🥣"
                            : item.imageKey === "study" ? "📚"
                                : item.imageKey === "lunch" ? "🍱"
                                    : item.imageKey === "walk" ? "🚶"
                                        : item.imageKey === "reflect" ? "📓"
                                            : item.imageKey === "dinner" ? "🍽️"
                                                : item.imageKey === "prepare_sleep" ? "🌙"
                                                    : item.imageKey === "sleep" ? "😴"
                                                        : "⭐";

        const title = `Time for ${item.task}! ${emoji}`;
        const body = item.description || "Your Zen routine awaits.";

        // Case 1: Specific one-off date ("YYYY-MM-DD")
        if (item.date) {
            const [y, m, d] = item.date.split('-').map(Number);
            const targetDate = new Date(y, m - 1, d, hours, mins, 0);
            if (targetDate.getTime() > Date.now()) {
                await Notifications.scheduleNotificationAsync({
                    identifier: `${NOTIFICATION_ID_PREFIX}${item.id}`,
                    content: {
                        title,
                        body,
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: targetDate,
                        channelId: FOCUS_CHANNEL_ID,
                    },
                });
            }
            continue;
        }

        // Case 2: Specific days of week (daysOfWeek: 0 = Sun, 1 = Mon ... 6 = Sat)
        if (item.daysOfWeek && item.daysOfWeek.length > 0 && item.daysOfWeek.length < 7) {
            for (const day of item.daysOfWeek) {
                // expo-notifications weekday: 1 (Sun) through 7 (Sat)
                const weekday = day + 1;
                await Notifications.scheduleNotificationAsync({
                    identifier: `${NOTIFICATION_ID_PREFIX}${item.id}_${day}`,
                    content: {
                        title,
                        body,
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                        weekday,
                        hour: hours,
                        minute: mins,
                        channelId: FOCUS_CHANNEL_ID,
                    },
                });
            }
            continue;
        }

        // Case 3: Daily repeating routine
        await Notifications.scheduleNotificationAsync({
            identifier: `${NOTIFICATION_ID_PREFIX}${item.id}`,
            content: {
                title,
                body,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: mins,
                channelId: FOCUS_CHANNEL_ID,
            },
        });
    }
};

/**
 * Cancel all previously scheduled routine notifications.
 */
export const cancelAllRoutineNotifications = async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
        if (notif.identifier.startsWith(NOTIFICATION_ID_PREFIX)) {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
    }
};

/**
 * Schedule a high-priority alarm notification for the end of a focus timer.
 */
export const scheduleFocusTimerAlarm = async (
    title: string,
    body: string,
    seconds: number
): Promise<void> => {
    if (Platform.OS === 'web' || seconds <= 0) return;
    try {
        await cancelFocusTimerAlarm();
        await Notifications.scheduleNotificationAsync({
            identifier: FOCUS_NOTIFICATION_ID,
            content: {
                title,
                body,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: Math.max(1, Math.round(seconds)),
                channelId: FOCUS_CHANNEL_ID,
            },
        });
    } catch (e) {
        console.error("Failed to schedule focus timer notification", e);
    }
};

/**
 * Cancel any scheduled focus timer alarm notification.
 */
export const cancelFocusTimerAlarm = async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
        await Notifications.cancelScheduledNotificationAsync(FOCUS_NOTIFICATION_ID);
    } catch {
        // ignore cancellation failure
    }
};
