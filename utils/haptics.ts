/**
 * Cross-platform haptics wrapper.
 * On web, all haptic calls are silently no-oped.
 * On iOS/Android, they proxy to expo-haptics.
 */
import { Platform } from "react-native";

import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";

// Re-export the types so consumers can still reference them
export { ImpactFeedbackStyle, NotificationFeedbackType };

export const selectionAsync = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.selectionAsync();
  } catch {}
};

export const impactAsync = async (
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium
): Promise<void> => {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.impactAsync(style);
  } catch {}
};

export const notificationAsync = async (
  type: NotificationFeedbackType = NotificationFeedbackType.Success
): Promise<void> => {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.notificationAsync(type);
  } catch {}
};

