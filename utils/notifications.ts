import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { RoutineItem, timeToMinutes } from "./utils";

// Configure how notifications appear while app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

const CHANNEL_ID = "zen-routine";
const NOTIFICATION_ID_PREFIX = "zen-routine-";

/**
 * Request user permission for local notifications.
 * Should be called on app startup.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: "Zen Routine Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
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
    // Cancel all existing routine notifications
    await cancelAllRoutineNotifications();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    for (const item of routines) {
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

        await Notifications.scheduleNotificationAsync({
            identifier: `${NOTIFICATION_ID_PREFIX}${item.id}`,
            content: {
                title: `Time for ${item.task}! ${emoji}`,
                body: item.description || "Your Zen routine awaits.",
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: mins,
            },
        });
    }
};

/**
 * Cancel all previously scheduled routine notifications.
 */
export const cancelAllRoutineNotifications = async (): Promise<void> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
        if (notif.identifier.startsWith(NOTIFICATION_ID_PREFIX)) {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
    }
};
