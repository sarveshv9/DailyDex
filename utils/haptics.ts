/**
 * Cross-platform haptics wrapper.
 * On web, all haptic calls are silently no-oped.
 * On iOS/Android, they proxy to expo-haptics.
 */
import { Platform } from "react-native";

// Re-export the types so consumers can still reference them
export { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";

import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";

export const selectionAsync = async (): Promise<void> => {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  return Haptics.selectionAsync();
};

export const impactAsync = async (
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium
): Promise<void> => {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  return Haptics.impactAsync(style);
};

export const notificationAsync = async (
  type: NotificationFeedbackType = NotificationFeedbackType.Success
): Promise<void> => {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  return Haptics.notificationAsync(type);
};
