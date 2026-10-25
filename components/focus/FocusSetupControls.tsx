import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CrossPlatformSegmentedControl } from "../common/CrossPlatformSegmentedControl";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export interface DurationOption {
  label: string;
  value: number;
  title: string;
}

export interface FocusSetupControlsProps {
  selectedMode: "Free" | "Pomodoro";
  onSelectMode: (mode: "Free" | "Pomodoro") => void;
  selectedDuration: number;
  onSelectDuration: (durationSeconds: number) => void;
  durationOptions: DurationOption[];
  onStartFreeTimer: () => void;
  onStartPomodoro: () => void;
  onStartDebugTimer?: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusSetupControlsComponent: React.FC<FocusSetupControlsProps> = ({
  selectedMode,
  onSelectMode,
  selectedDuration,
  onSelectDuration,
  durationOptions,
  onStartFreeTimer,
  onStartPomodoro,
  onStartDebugTimer,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.setupSection}>
      {/* Segmented Mode Selector */}
      <View style={styles.segmentWrapper}>
        <CrossPlatformSegmentedControl
          values={["Free Timer", "Pomodoro"]}
          selectedIndex={selectedMode === "Pomodoro" ? 1 : 0}
          onChange={(event) => {
            Haptics.selectionAsync();
            onSelectMode(
              event.nativeEvent.selectedSegmentIndex === 0
                ? "Free"
                : "Pomodoro"
            );
          }}
          tintColor={theme.colors.primary}
          fontStyle={{
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
          }}
          activeFontStyle={{
            fontFamily: theme.fonts.bold,
            color: theme.colors.onPrimary,
          }}
        />
      </View>

      {selectedMode === "Free" ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.sectionLabel}>SELECT SESSION LENGTH</Text>
          </View>

          {/* Quick Duration Pills */}
          <View style={styles.durationPillsRow}>
            {durationOptions.map((d) => {
              const isSelected = selectedDuration === d.value;
              return (
                <Pressable
                  key={d.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelectDuration(d.value);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${d.title} duration`}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.durationPill,
                    isSelected && styles.durationPillActive,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      isSelected && styles.durationPillTextActive,
                    ]}
                  >
                    {d.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Standardized 56px Primary Action Button */}
          <Pressable
            testID="focus-start-timer-btn"
            onPress={onStartFreeTimer}
            accessibilityRole="button"
            accessibilityLabel={`Begin focus session for ${Math.round(
              selectedDuration / 60
            )} minutes`}
            style={({ pressed }) => [
              styles.primaryActionButton,
              pressed && styles.pressedScale,
            ]}
          >
            <Ionicons name="play" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.primaryActionButtonText}>
              Begin Focus Session ({Math.round(selectedDuration / 60)}m)
            </Text>
          </Pressable>

          {(process.env.EXPO_PUBLIC_E2E === "1" ||
            process.env.EXPO_PUBLIC_E2E === "true") && onStartDebugTimer ? (
            <Pressable
              testID="focus-start-debug-20s-btn"
              onPress={onStartDebugTimer}
              style={{ marginTop: 8, padding: 8, alignItems: "center" }}
            >
              <Text style={{ fontSize: themeTokens.fonts.size.xs, color: theme.colors.textSecondary }}>
                [E2E] Start 20s Test Timer
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.pomodoroExplainerCard}>
            <BlurView
              intensity={isDarkMode ? 20 : 40}
              tint={
                isDarkMode
                  ? "systemThickMaterialDark"
                  : "systemThickMaterialLight"
              }
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.pomodoroExplainerTitleRow}>
              <Ionicons
                name="sparkles-outline"
                size={17}
                color={theme.colors.primaryText}
              />
              <Text style={styles.pomodoroExplainerTitle}>
                Tranquil Pomodoro Cycle
              </Text>
            </View>
            <Text style={styles.pomodoroExplainerDesc}>
              4 rounds of 25 min deep mindful focus, separated by 5 min
              restorative pauses, completing with an extended 15 min rest.
            </Text>
          </View>

          {/* Standardized 56px Primary Action Button */}
          <Pressable
            onPress={onStartPomodoro}
            accessibilityRole="button"
            accessibilityLabel="Begin Pomodoro cycle"
            style={({ pressed }) => [
              styles.primaryActionButton,
              pressed && styles.pressedScale,
            ]}
          >
            <Ionicons name="flame" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.primaryActionButtonText}>
              Begin Pomodoro Cycle
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

export const FocusSetupControls = React.memo(FocusSetupControlsComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    setupSection: {
      width: "100%",
      alignItems: "center",
      marginTop: 4,
    },
    segmentWrapper: {
      width: "100%",
      marginBottom: themeTokens.spacing.lg,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: themeTokens.spacing.xs,
      alignSelf: "flex-start",
      marginBottom: themeTokens.spacing.sm,
    },
    sectionLabel: {
      ...shared.sectionLabel,
      color: theme.colors.textSecondary,
    },
    durationPillsRow: {
      flexDirection: "row",
      gap: themeTokens.spacing.sm,
      width: "100%",
      marginBottom: themeTokens.spacing.xl,
    },
    durationPill: {
      flex: 1,
      height: 48,
      borderRadius: themeTokens.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    durationPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.25 : 0.1,
          shadowRadius: 4,
        },
        android: { elevation: 2 },
      }),
    },
    durationPillText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.textSecondary,
    },
    durationPillTextActive: {
      color: theme.colors.onPrimary,
    },
    pomodoroExplainerCard: {
      ...shared.glassCard,
      width: "100%",
      overflow: "hidden",
      padding: themeTokens.spacing.lg,
      marginBottom: themeTokens.spacing.xl,
    },
    pomodoroExplainerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: themeTokens.spacing.xs,
      marginBottom: themeTokens.spacing.xs,
    },
    pomodoroExplainerTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.primaryText,
    },
    pomodoroExplainerDesc: {
      ...shared.bodyText,
      fontSize: themeTokens.fonts.size.xs,
      lineHeight: 18,
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
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
};
