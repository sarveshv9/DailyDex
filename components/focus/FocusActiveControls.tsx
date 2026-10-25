import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export interface FocusActiveControlsProps {
  isActive: boolean;
  isResetEnabled: boolean;
  pomodoroMode: boolean;
  isLastPomoPhase: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onAdvancePomodoroPhase: () => void;
  onEndSessionEarly: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusActiveControlsComponent: React.FC<FocusActiveControlsProps> = ({
  isActive,
  isResetEnabled,
  pomodoroMode,
  isLastPomoPhase,
  onToggleTimer,
  onResetTimer,
  onAdvancePomodoroPhase,
  onEndSessionEarly,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.activeControlsSection}>
      <View style={styles.controlsRow}>
        {/* Primary Play / Pause Pill */}
        <Pressable
          testID="focus-play-pause-btn"
          onPress={onToggleTimer}
          accessibilityRole="button"
          accessibilityLabel={isActive ? "Pause focus timer" : "Resume focus timer"}
          style={({ pressed }) => [
            styles.actionPillPrimary,
            !isActive && styles.actionPillResume,
            isActive && styles.actionPillPause,
            pressed && styles.pressedScale,
          ]}
        >
          <Ionicons
            name={isActive ? "pause" : "play"}
            size={20}
            color={isActive ? theme.colors.primary : theme.colors.white}
          />
          <Text
            style={[
              styles.actionPillPrimaryText,
              isActive && styles.actionPillPauseText,
            ]}
          >
            {isActive ? "Pause" : "Resume"}
          </Text>
        </Pressable>

        {/* Reset Pill: Enabled ONLY when timer is paused */}
        <Pressable
          testID="focus-reset-btn"
          disabled={!isResetEnabled}
          onPress={() => {
            if (!isResetEnabled) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onResetTimer();
          }}
          accessibilityRole="button"
          accessibilityLabel="Reset timer to beginning"
          accessibilityState={{ disabled: !isResetEnabled }}
          style={({ pressed }) => [
            styles.actionPillSecondary,
            !isResetEnabled && styles.actionPillDisabled,
            isResetEnabled && pressed && styles.pressedScale,
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={isResetEnabled ? theme.colors.primary : theme.colors.secondary}
          />
          <Text
            style={[
              styles.actionPillSecondaryText,
              !isResetEnabled && styles.actionPillDisabledText,
            ]}
          >
            Reset
          </Text>
        </Pressable>

        {/* Pomodoro Advance Phase Pill */}
        {pomodoroMode && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAdvancePomodoroPhase();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isLastPomoPhase ? "Finish Pomodoro session" : "Skip to next phase"
            }
            style={({ pressed }) => [
              styles.actionPillSecondary,
              isLastPomoPhase && styles.actionPillFinish,
              pressed && styles.pressedScale,
            ]}
          >
            <Ionicons
              name={
                isLastPomoPhase
                  ? "checkmark-circle-outline"
                  : "play-skip-forward-outline"
              }
              size={19}
              color={
                isLastPomoPhase ? theme.colors.primary : theme.colors.secondary
              }
            />
            <Text
              style={[
                styles.actionPillSecondaryText,
                isLastPomoPhase && styles.actionPillFinishText,
              ]}
            >
              {isLastPomoPhase ? "Finish" : "Next"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* End Session Button */}
      <Pressable
        onPress={onEndSessionEarly}
        accessibilityRole="button"
        accessibilityLabel="End session early"
        style={({ pressed }) => [
          styles.endSessionButton,
          pressed && styles.pressedScale,
        ]}
      >
        <Ionicons
          name="stop-circle-outline"
          size={18}
          color={theme.colors.secondary}
        />
        <Text style={styles.endSessionText}>End Session Early</Text>
      </Pressable>
    </View>
  );
};

export const FocusActiveControls = React.memo(FocusActiveControlsComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    activeControlsSection: {
      width: "100%",
      alignItems: "center",
      marginTop: 4,
      gap: themeTokens.spacing.md,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: themeTokens.spacing.sm,
      width: "100%",
    },
    actionPillPrimary: {
      flex: 1.3,
      height: 56,
      borderRadius: themeTokens.borderRadius.xl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: themeTokens.spacing.sm,
    },
    actionPillResume: {
      backgroundColor: theme.colors.primary,
    },
    actionPillPause: {
      backgroundColor: isDarkMode
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.05)",
      borderWidth: 1.5,
      borderColor: `${theme.colors.primary}50`,
    },
    actionPillPrimaryText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.white,
    },
    actionPillPauseText: {
      color: theme.colors.primary,
    },
    actionPillSecondary: {
      flex: 1,
      height: 56,
      borderRadius: themeTokens.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      backgroundColor: isDarkMode
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(0, 0, 0, 0.04)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    actionPillSecondaryText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.primary,
    },
    actionPillDisabled: {
      opacity: 0.35,
    },
    actionPillDisabledText: {
      color: theme.colors.secondary,
    },
    actionPillFinish: {
      borderColor: `${theme.colors.primary}60`,
      backgroundColor: isDarkMode
        ? `${theme.colors.primary}18`
        : `${theme.colors.primary}10`,
    },
    actionPillFinishText: {
      color: theme.colors.primary,
    },
    endSessionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: themeTokens.borderRadius.lg,
    },
    endSessionText: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.secondary,
    },
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
