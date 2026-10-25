import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ActiveTimerBadge } from "../common/ActiveTimerBadge";
import { Theme } from "../../styles/shared";
import { themeTokens } from "../../constants/themeTokens";
import { RoutineItem } from "../../utils/utils";

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface FocusHeroCardProps {
  currentTaskItem: RoutineItem | null;
  currentTaskText: string;
  currentTaskDesc: string | null;
  taskIcon: IoniconName;
  taskProgress: number;
  hasActiveTask: boolean;
  hasNextTask: boolean;
  onOpenFocus: () => void;
  onOpenTimeline: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusHeroCardComponent: React.FC<FocusHeroCardProps> = ({
  currentTaskItem,
  currentTaskText,
  currentTaskDesc,
  taskIcon,
  taskProgress,
  hasActiveTask,
  hasNextTask,
  onOpenFocus,
  onOpenTimeline,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const progressPercent = Math.round(taskProgress * 100);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(80)}
      style={styles.sectionContainer}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Current Focus</Text>
      </View>

      <View style={styles.focusCard}>
        <BlurView
          intensity={100}
          tint={
            isDarkMode
              ? "systemThickMaterialDark"
              : "systemThickMaterialLight"
          }
          style={styles.blurWrapper}
        >
          <View style={styles.cardTint} />
          <View style={styles.focusCardInner}>
            {/* Top: Icon + Name + Description + Duration + Focus Timer Button */}
            <View style={styles.focusTopRow}>
              <View style={styles.focusIconSquircle}>
                <Ionicons
                  name={taskIcon}
                  size={26}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.focusTextCol}>
                <Text
                  style={styles.focusTaskName}
                  numberOfLines={1}
                  accessibilityRole="header"
                >
                  {currentTaskText}
                </Text>
                {currentTaskDesc ? (
                  <Text style={styles.focusDescription} numberOfLines={1}>
                    {currentTaskDesc}
                  </Text>
                ) : null}
              </View>
              <View style={styles.focusTopActions}>
                {currentTaskItem?.duration ? (
                  <View style={styles.durationBadge}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.durationBadgeText}>
                      {currentTaskItem.duration}m
                    </Text>
                  </View>
                ) : null}

                {currentTaskItem ? (
                  <ActiveTimerBadge
                    taskId={currentTaskItem.id}
                    onOpenFocus={onOpenFocus}
                    primaryColor={theme.colors.primary}
                    badgeStyle={styles.activeTimerBadge}
                    textStyle={styles.activeTimerText}
                    fallback={
                      <Pressable
                        style={styles.focusTimerIconButton}
                        onPress={onOpenFocus}
                        hitSlop={8}
                        accessibilityLabel="Start Focus Timer"
                      >
                        <Ionicons
                          name="timer-outline"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </Pressable>
                    }
                  />
                ) : null}
              </View>
            </View>

            {/* Progress Bar & Indicators */}
            <View
              style={styles.progressSection}
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel={`Progress: ${progressPercent} percent`}
              accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
            >
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelText}>Progress</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            {/* Main CTA Button: Default redirect to timeline */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View day timeline"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={onOpenTimeline}
            >
              <Text style={styles.primaryButtonText}>
                {hasActiveTask
                  ? "View Day Timeline"
                  : hasNextTask
                  ? "Start My Day"
                  : "View Day Timeline"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.white}
              />
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
};

export const FocusHeroCard = React.memo(FocusHeroCardComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const tileBg = `${theme.colors.primary}${
    theme.glass?.iconTintAlpha ?? (isDarkMode ? "29" : "1C")
  }`;

  return StyleSheet.create({
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeaderRow: {
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    focusCard: {
      borderRadius: 28,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.35 : 0.08,
          shadowRadius: 16,
        },
        android: { elevation: 3 },
      }),
    },
    blurWrapper: {
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    cardTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.glass.cardBg,
    },
    focusCardInner: {
      padding: 22,
      gap: 16,
    },
    focusTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    focusIconSquircle: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    focusTextCol: {
      flex: 1,
      justifyContent: "center",
      gap: 2,
    },
    focusTaskName: {
      fontSize: themeTokens.fonts.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    focusDescription: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
    },
    focusTopActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.05)",
    },
    durationBadgeText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    activeTimerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}18`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
    },
    activeTimerText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      fontVariant: ["tabular-nums"],
    },
    focusTimerIconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    progressSection: {
      gap: 8,
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressLabelText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    progressPercent: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      fontVariant: ["tabular-nums"],
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.06)",
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 18,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    primaryButtonText: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
  });
};
