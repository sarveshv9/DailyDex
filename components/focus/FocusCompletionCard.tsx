import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export interface FocusCompletionCardProps {
  durationMinutes: number;
  onComplete: () => void;
  onRestart: () => void;
  pomodoroMode?: boolean;
  pomodoroPhase?: "work" | "shortBreak" | "longBreak";
  pomodoroSession?: number;
  onStartNextPomoPhase?: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusCompletionCardComponent: React.FC<FocusCompletionCardProps> = ({
  durationMinutes,
  onComplete,
  onRestart,
  pomodoroMode = false,
  pomodoroPhase,
  pomodoroSession = 1,
  onStartNextPomoPhase,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const isPomoInCycle = Boolean(
    pomodoroMode &&
    onStartNextPomoPhase &&
    (pomodoroPhase === "shortBreak" ||
      pomodoroPhase === "longBreak" ||
      (pomodoroPhase === "work" && pomodoroSession > 1))
  );

  const isRestPhase = pomodoroPhase === "shortBreak" || pomodoroPhase === "longBreak";

  // Dynamic content based on session type
  let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";
  let title = "Session Accomplished";
  let message =
    "Take a calming breath. Your mindful presence and dedicated focus have nurtured clarity.";
  let primaryButtonText = "Complete & Return to Tasks";
  let primaryButtonIcon: keyof typeof Ionicons.glyphMap =
    "checkmark-done-circle-outline";
  let primaryButtonAction = onComplete;
  let secondaryButtonText = "Start Another Session";
  let secondaryButtonIcon: keyof typeof Ionicons.glyphMap = "refresh-outline";
  let secondaryButtonAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRestart();
  };

  if (isPomoInCycle) {
    if (pomodoroPhase === "shortBreak") {
      iconName = "cafe-outline";
      title = "Focus Sprint Complete";
      message = "Great work! Step away, stretch, and take a 5-minute breather.";
      primaryButtonText = "Start 5m Rest";
      primaryButtonIcon = "cafe-outline";
      primaryButtonAction = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStartNextPomoPhase?.();
      };
      secondaryButtonText = "End Session Early";
      secondaryButtonIcon = "close-circle-outline";
      secondaryButtonAction = onComplete;
    } else if (pomodoroPhase === "longBreak") {
      iconName = "cafe-outline";
      title = "4 Sprints Accomplished";
      message = "Incredible focus! You've earned a restorative 15-minute rest.";
      primaryButtonText = "Start 15m Long Rest";
      primaryButtonIcon = "cafe-outline";
      primaryButtonAction = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStartNextPomoPhase?.();
      };
      secondaryButtonText = "Finish Session";
      secondaryButtonIcon = "checkmark-circle-outline";
      secondaryButtonAction = onComplete;
    } else if (pomodoroPhase === "work") {
      iconName = "flame-outline";
      title = "Rest Period Complete";
      message = `Whenever you're ready, dive into Cycle ${pomodoroSession} of 4.`;
      primaryButtonText = "Start Focus Sprint (25m)";
      primaryButtonIcon = "play";
      primaryButtonAction = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStartNextPomoPhase?.();
      };
      secondaryButtonText = "End Session Early";
      secondaryButtonIcon = "close-circle-outline";
      secondaryButtonAction = onComplete;
    }
  }

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15).mass(0.8)}
      style={styles.completionSection}
    >
      <View style={styles.completionCard}>
        <Animated.View
          entering={ZoomIn.delay(120).springify().damping(12)}
          style={styles.completionIconCircle}
        >
          <Ionicons
            name={iconName}
            size={36}
            color={theme.colors.primaryText}
          />
        </Animated.View>
        <Text style={styles.completionTitle}>{title}</Text>
        <Text style={styles.completionMessage}>{message}</Text>

        <View style={styles.completionPill}>
          <Ionicons
            name="time-outline"
            size={15}
            color={theme.colors.primaryText}
          />
          <Text style={styles.completionPillText}>
            {durationMinutes} minutes logged to your journey
          </Text>
        </View>
      </View>

      {/* Primary Action Button */}
      <Pressable
        onPress={primaryButtonAction}
        accessibilityRole="button"
        accessibilityLabel={primaryButtonText}
        style={({ pressed }) => [
          styles.primaryActionButton,
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons
          name={primaryButtonIcon}
          size={22}
          color={theme.colors.onPrimary}
        />
        <Text style={styles.primaryActionButtonText}>{primaryButtonText}</Text>
      </Pressable>

      {/* Secondary Action Button */}
      <Pressable
        onPress={secondaryButtonAction}
        accessibilityRole="button"
        accessibilityLabel={secondaryButtonText}
        style={({ pressed }) => [
          styles.secondaryActionButton,
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons
          name={secondaryButtonIcon}
          size={18}
          color={theme.colors.primaryText}
        />
        <Text style={styles.secondaryActionButtonText}>{secondaryButtonText}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const FocusCompletionCard = React.memo(FocusCompletionCardComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    completionSection: {
      width: "100%",
      alignItems: "center",
      gap: themeTokens.spacing.md,
      marginTop: 4,
    },
    completionCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      width: "100%",
      borderRadius: themeTokens.borderRadius.xl,
      overflow: "hidden",
      padding: themeTokens.spacing.xl,
      alignItems: "center",
      elevation: 0,
    },
    completionIconCircle: {
      ...shared.iconCircle,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 0,
      marginBottom: themeTokens.spacing.md,
    },
    completionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xl,
      color: theme.colors.primaryText,
      marginBottom: themeTokens.spacing.xs,
      textAlign: "center",
    },
    completionMessage: {
      ...shared.bodyText,
      fontSize: themeTokens.fonts.size.xs,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: themeTokens.spacing.lg,
      maxWidth: 280,
    },
    completionPill: {
      ...shared.badge,
      paddingHorizontal: themeTokens.spacing.md,
      paddingVertical: 6,
      borderRadius: themeTokens.borderRadius.full,
      backgroundColor: theme.colors.primarySoft,
    },
    completionPillText: {
      ...shared.badgeText,
      fontSize: themeTokens.fonts.size.xs,
    },
    primaryActionButton: {
      ...shared.primaryButton,
      width: "100%",
      height: 56,
      borderRadius: themeTokens.borderRadius.xl,
      paddingVertical: 0,
      paddingHorizontal: 0,
      flexDirection: "row",
      gap: themeTokens.spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.45 : 0.3,
          shadowRadius: 14,
        },
        android: { elevation: 6 },
      }),
    },
    primaryActionButtonText: {
      ...shared.primaryButtonText,
      fontSize: themeTokens.fonts.size.md,
    },
    secondaryActionButton: {
      ...shared.secondaryButton,
      width: "100%",
      height: 56,
      borderRadius: themeTokens.borderRadius.xl,
      paddingVertical: 0,
      paddingHorizontal: 0,
      flexDirection: "row",
      gap: themeTokens.spacing.sm,
      backgroundColor: isDarkMode
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.03)",
    },
    secondaryActionButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.primary,
    },
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
};
