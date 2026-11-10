import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // Smooth opacity change when Reset becomes enabled/disabled
  const resetOpacity = useSharedValue(isResetEnabled ? 1 : 0.45);
  useEffect(() => {
    resetOpacity.value = withTiming(isResetEnabled ? 1 : 0.45, { duration: 180 });
  }, [isResetEnabled, resetOpacity]);

  const animatedResetStyle = useAnimatedStyle(() => ({
    opacity: resetOpacity.value,
  }));

  return (
    <View style={styles.activeControlsSection}>
      <View style={styles.controlsRow}>
        {/* Primary Play / Pause Pill */}
        <Pressable
          testID="focus-play-pause-btn"
          onPress={onToggleTimer}
          accessibilityRole="button"
          accessibilityLabel={isActive ? "Pause focus timer" : "Resume focus timer"}
          style={({ pressed }: { pressed: boolean }) => [
            styles.actionPillPrimary,
            !isActive && styles.actionPillResume,
            isActive && styles.actionPillPause,
            pressed && styles.pressedScale,
          ]}
        >
          <Animated.View
            key={isActive ? "pause" : "play"}
            entering={FadeIn.duration(150)}
            style={styles.innerRow}
          >
            <Ionicons
              name={isActive ? "pause" : "play"}
              size={20}
              color={isActive ? theme.colors.primaryText : theme.colors.onPrimary}
            />
            <Text
              style={[
                styles.actionPillPrimaryText,
                isActive && styles.actionPillPauseText,
              ]}
            >
              {isActive ? "Pause" : "Resume"}
            </Text>
          </Animated.View>
        </Pressable>

        {/* Reset Pill: Enabled ONLY when timer is paused */}
        <AnimatedPressable
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
          style={({ pressed }: { pressed: boolean }) => [
            styles.actionPillSecondary,
            !isResetEnabled && styles.actionPillDisabled,
            animatedResetStyle,
            isResetEnabled && pressed && styles.pressedScale,
          ]}
        >
          <View style={styles.innerRow}>
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isResetEnabled ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.actionPillSecondaryText,
                !isResetEnabled && styles.actionPillDisabledText,
              ]}
            >
              Reset
            </Text>
          </View>
        </AnimatedPressable>

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
            style={({ pressed }: { pressed: boolean }) => [
              styles.actionPillSecondary,
              isLastPomoPhase && styles.actionPillFinish,
              pressed && styles.pressedScale,
            ]}
          >
            <View style={styles.innerRow}>
              <Ionicons
                name={
                  isLastPomoPhase
                    ? "checkmark-circle-outline"
                    : "play-skip-forward-outline"
                }
                size={18}
                color={
                  isLastPomoPhase ? theme.colors.primaryText : theme.colors.textSecondary
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
            </View>
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
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.endSessionText}>End Session Early</Text>
      </Pressable>
    </View>
  );
};

export const FocusActiveControls = React.memo(FocusActiveControlsComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  return StyleSheet.create({
    activeControlsSection: {
      width: "100%",
      alignItems: "center",
      marginTop: 8,
      gap: 14,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      width: "100%",
      maxWidth: 340,
    },
    innerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    actionPillPrimary: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    actionPillResume: {
      backgroundColor: theme.colors.primary,
    },
    actionPillPause: {
      backgroundColor: theme.colors.primarySoft,
    },
    actionPillPrimaryText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onPrimary,
      letterSpacing: 0.3,
    },
    actionPillPauseText: {
      color: theme.colors.primary,
    },
    actionPillSecondary: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
    },
    actionPillSecondaryText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    actionPillDisabled: {
      opacity: 0.4,
    },
    actionPillDisabledText: {
      color: theme.colors.textSecondary,
    },
    actionPillFinish: {
      backgroundColor: theme.colors.primarySoft,
    },
    actionPillFinishText: {
      color: theme.colors.primaryText,
    },
    endSessionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
      marginTop: 4,
    },
    endSessionText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: theme.colors.textSecondary,
      letterSpacing: 0.2,
    },
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
};
