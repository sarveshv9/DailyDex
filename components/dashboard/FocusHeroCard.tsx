import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Theme } from "../../styles/shared";
import { RoutineItem } from "../../utils/utils";
import { ActiveTimerBadge } from "../common/ActiveTimerBadge";

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
  onToggleComplete?: (item: RoutineItem) => void;
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
  onToggleComplete,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const progressPercent = Math.round(taskProgress * 100);

  const ctaScale = useSharedValue(1);
  const ctaOpacity = useSharedValue(1);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
    opacity: ctaOpacity.value,
  }));

  const handleCtaPressIn = () => {
    ctaScale.value = withTiming(0.97, { duration: 110, easing: Easing.out(Easing.quad) });
    ctaOpacity.value = withTiming(0.9, { duration: 110, easing: Easing.out(Easing.quad) });
  };

  const handleCtaPressOut = () => {
    ctaScale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    ctaOpacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
  };

  const gradientColors: [string, string] = useMemo(() => {
    return [theme.colors.primarySoft, theme.colors.surface];
  }, [theme.colors.primarySoft, theme.colors.surface]);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(80)}
      style={styles.sectionContainer}
    >
      <View style={styles.focusCard}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.2, y: 0.95 }}
          style={styles.focusCardInner}
        >
          {/* Top: Checkbox + Icon + Name + Description + Duration / Focus Timer */}
          <View style={styles.focusTopRow}>
            {currentTaskItem && onToggleComplete ? (
              <Pressable
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => onToggleComplete(currentTaskItem)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!currentTaskItem.completed }}
                accessibilityLabel={
                  currentTaskItem.completed ? "Mark habit incomplete" : "Mark habit complete"
                }
                style={[
                  styles.checkCircle,
                  currentTaskItem.completed && styles.checkCircleCompleted,
                ]}
              >
                {currentTaskItem.completed ? (
                  <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
                ) : null}
              </Pressable>
            ) : null}

            <View style={styles.focusIconSquircle}>
              <Ionicons
                name={taskIcon}
                size={28}
                color={isDarkMode ? "#FFFFFF" : theme.colors.primary}
              />
            </View>

            <View style={styles.focusTextCol}>
              <Text
                style={[
                  styles.focusTaskName,
                  currentTaskItem?.completed && styles.taskCompletedText,
                ]}
                numberOfLines={1}
                accessibilityRole="header"
              >
                {currentTaskText}
              </Text>
              {currentTaskDesc ? (
                <View style={styles.focusDescRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.focusDescription} numberOfLines={1}>
                    {currentTaskDesc}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.focusTopActions}>
              {currentTaskItem?.duration ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationBadgeText}>
                    {currentTaskItem.duration}m
                  </Text>
                </View>
              ) : null}

              {currentTaskItem ? (
                <ActiveTimerBadge
                  taskId={currentTaskItem.id}
                  onOpenFocus={onOpenFocus}
                  primaryColor={theme.colors.primaryText}
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

          {/* Dynamic Active Task Progress Indicator */}
          {hasActiveTask && (
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
          )}

          {/* Main Action Pill Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View daily flow"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onOpenTimeline}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
          >
            <Animated.View style={[styles.primaryButton, ctaAnimatedStyle]}>
              <Text style={styles.primaryButtonText}>
                {hasActiveTask
                  ? "View Daily Flow"
                  : hasNextTask
                    ? "View Daily Flow"
                    : "View Routine Timeline"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={theme.colors.onPrimary}
              />
            </Animated.View>
          </Pressable>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

export const FocusHeroCard = React.memo(FocusHeroCardComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  return StyleSheet.create({
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    focusCard: {
      borderRadius: 28,
      borderWidth: 0,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.05,
          shadowRadius: 12,
        },
        android: { elevation: 2 },
        web: {
          boxShadow: isDarkMode
            ? "0 4px 16px rgba(0, 0, 0, 0.3)"
            : "0 4px 16px rgba(0, 0, 0, 0.04)",
        },
      }),
    },
    focusCardInner: {
      padding: 20,
      gap: 16,
    },
    focusTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "rgba(255, 255, 255, 0.25)" : "#CBD5E1",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkCircleCompleted: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    taskCompletedText: {
      textDecorationLine: "line-through",
      opacity: 0.6,
    },
    focusIconSquircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.8)",
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        },
        android: { elevation: 1 },
        web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" },
      }),
    },
    focusTextCol: {
      flex: 1,
      justifyContent: "center",
      gap: 3,
    },
    focusTaskName: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    focusDescRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    focusDescription: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
    },
    focusTopActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    durationBadge: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#FFFFFF",
      borderWidth: 0,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
        },
        android: { elevation: 1 },
      }),
    },
    durationBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      fontVariant: ["tabular-nums"],
    },
    activeTimerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 0,
    },
    activeTimerText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primaryText,
      fontVariant: ["tabular-nums"],
    },
    focusTimerIconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
    },
    progressSection: {
      gap: 6,
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressLabelText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    progressPercent: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primaryText,
      fontVariant: ["tabular-nums"],
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 50,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: { elevation: 3 },
        web: { boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)" },
      }),
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      textAlign: "center",
    },
  });
};
