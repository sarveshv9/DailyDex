import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export interface FocusCompletionCardProps {
  durationMinutes: number;
  onComplete: () => void;
  onRestart: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusCompletionCardComponent: React.FC<FocusCompletionCardProps> = ({
  durationMinutes,
  onComplete,
  onRestart,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.completionSection}>
      <View style={styles.completionCard}>
        <View style={styles.completionIconCircle}>
          <Ionicons
            name="checkmark-circle"
            size={36}
            color={theme.colors.primaryText}
          />
        </View>
        <Text style={styles.completionTitle}>Session Accomplished</Text>
        <Text style={styles.completionMessage}>
          Take a calming breath. Your mindful presence and dedicated focus have
          nurtured clarity.
        </Text>

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
        onPress={onComplete}
        accessibilityRole="button"
        accessibilityLabel="Complete and return to tasks"
        style={({ pressed }) => [
          styles.primaryActionButton,
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons
          name="checkmark-done-circle-outline"
          size={22}
          color={theme.colors.onPrimary}
        />
        <Text style={styles.primaryActionButtonText}>
          Complete & Return to Tasks
        </Text>
      </Pressable>

      {/* Secondary Button to Start Another Session */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRestart();
        }}
        accessibilityRole="button"
        accessibilityLabel="Start another focus session"
        style={({ pressed }) => [
          styles.secondaryActionButton,
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color={theme.colors.primaryText}
        />
        <Text style={styles.secondaryActionButtonText}>
          Start Another Session
        </Text>
      </Pressable>
    </View>
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
      borderColor: theme.colors.border,
      borderWidth: 1,
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
      borderWidth: 1,
      borderColor: theme.colors.border,
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
