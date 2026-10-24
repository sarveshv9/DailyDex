import { useCallback, useContext } from "react";
import { SettingsContext } from "../context/SettingsContext";
import * as Haptics from "../utils/haptics";
import { ImpactFeedbackStyle, NotificationFeedbackType } from "../utils/haptics";

export { ImpactFeedbackStyle, NotificationFeedbackType };

/**
 * App-wide haptic feedback hook that automatically checks user settings
 * before firing haptic impulses. Silently no-ops if the user has disabled
 * haptics in Settings, or when running on the Web.
 */
export function useAppHaptics() {
  const context = useContext(SettingsContext);
  const isEnabled = context?.settings?.hapticsEnabled ?? true;

  const impact = useCallback(
    async (style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium) => {
      if (!isEnabled) return;
      return Haptics.impactAsync(style);
    },
    [isEnabled]
  );

  const light = useCallback(() => impact(ImpactFeedbackStyle.Light), [impact]);
  const medium = useCallback(() => impact(ImpactFeedbackStyle.Medium), [impact]);
  const heavy = useCallback(() => impact(ImpactFeedbackStyle.Heavy), [impact]);

  const selection = useCallback(async () => {
    if (!isEnabled) return;
    return Haptics.selectionAsync();
  }, [isEnabled]);

  const notification = useCallback(
    async (type: NotificationFeedbackType = NotificationFeedbackType.Success) => {
      if (!isEnabled) return;
      return Haptics.notificationAsync(type);
    },
    [isEnabled]
  );

  const success = useCallback(
    () => notification(NotificationFeedbackType.Success),
    [notification]
  );
  const warning = useCallback(
    () => notification(NotificationFeedbackType.Warning),
    [notification]
  );
  const error = useCallback(
    () => notification(NotificationFeedbackType.Error),
    [notification]
  );

  return {
    isEnabled,
    impact,
    light,
    medium,
    heavy,
    selection,
    notification,
    success,
    warning,
    error,
  };
}
