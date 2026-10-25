import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Theme, getSharedStyles } from "../../styles/shared";
import { themeTokens } from "../../constants/themeTokens";
import { getRoutineIcon, RoutineItem } from "../../utils/utils";

type IoniconName = keyof typeof Ionicons.glyphMap;

const toOutline = (name: string): IoniconName => {
  if (name.endsWith("-outline") || name.endsWith("-sharp")) return name as IoniconName;
  const outlined = `${name}-outline`;
  return (outlined in Ionicons.glyphMap ? outlined : name) as IoniconName;
};

const formatTaskTime = (timeStr: string): string => {
  const parts = timeStr
    ? timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/)
    : null;
  if (!parts) return timeStr;

  let hours = parseInt(parts[1], 10);
  const minutes = parts[2] || "00";
  const ampm = parts[3];

  if (!ampm) {
    const suffix = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${suffix}`;
  }

  return `${hours}:${minutes} ${ampm}`;
};

export interface UpNextRowProps {
  task: RoutineItem;
  onPress: (task: RoutineItem) => void;
  theme: Theme;
  isDarkMode: boolean;
}

const UpNextRowComponent = ({ task, onPress, theme, isDarkMode }: UpNextRowProps) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const handlePress = useCallback(() => onPress(task), [onPress, task]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.upNextCard,
        pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${task.task} at ${formatTaskTime(task.time)}${
        task.duration ? `, ${task.duration} minutes` : ""
      }`}
    >
      <View style={styles.upNextIconSquircle}>
        <Ionicons
          name={toOutline(getRoutineIcon(task.imageKey))}
          size={22}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.upNextInfo}>
        <Text style={styles.upNextTaskName} numberOfLines={1}>
          {task.task}
        </Text>
        {task.duration ? (
          <View style={styles.upNextMetaRow}>
            <View style={styles.durationChip}>
              <Ionicons
                name="hourglass-outline"
                size={11}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.upNextDurationText}>{task.duration}m</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.timeBadge}>
        <Ionicons name="time-outline" size={12} color={theme.colors.primary} />
        <Text style={styles.timeBadgeText}>{formatTaskTime(task.time)}</Text>
      </View>
    </Pressable>
  );
};

export const UpNextRow = React.memo(UpNextRowComponent);

export interface UpNextSectionProps {
  tasks: RoutineItem[];
  onSelectTask: (task: RoutineItem) => void;
  onOpenRoutineTimeline: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const UpNextSectionComponent: React.FC<UpNextSectionProps> = ({
  tasks,
  onSelectTask,
  onOpenRoutineTimeline,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(160)}
      style={styles.sectionContainer}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Up Next</Text>
      </View>

      {tasks.length > 0 ? (
        <View style={styles.upNextList}>
          {tasks.map((task, idx) => (
            <Animated.View
              key={task.id}
              entering={FadeInDown.duration(400).delay(idx * 50)}
            >
              <UpNextRow
                task={task}
                onPress={onSelectTask}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCardContainer}>
          <BlurView
            intensity={80}
            tint={
              isDarkMode
                ? "systemThickMaterialDark"
                : "systemThickMaterialLight"
            }
            style={styles.blurWrapper}
          >
            <View style={styles.cardTint} />
            <View style={styles.emptyCardInner}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="sparkles-outline"
                  size={26}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up For Today</Text>
              <Text style={styles.emptySubtitle}>
                You have finished all scheduled rituals for today. Take time to
                relax, breathe, and recharge.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View full routine timeline"
                style={styles.emptyActionButton}
                onPress={onOpenRoutineTimeline}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.emptyActionText}>View Full Timeline</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}
    </Animated.View>
  );
};

export const UpNextSection = React.memo(UpNextSectionComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  const tileBg = `${theme.colors.primary}${
    theme.glass?.iconTintAlpha ?? (isDarkMode ? "29" : "1C")
  }`;

  return StyleSheet.create({
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 32,
    },
    sectionHeaderRow: {
      marginBottom: 10,
    },
    sectionLabel: {
      ...shared.sectionLabel,
    },
    upNextList: {
      gap: 10,
    },
    upNextCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      borderRadius: 20,
      padding: 14,
      gap: 12,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.25 : 0.05,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    upNextIconSquircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    upNextInfo: {
      flex: 1,
      justifyContent: "center",
      gap: 3,
    },
    upNextTaskName: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    upNextMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    durationChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.05)",
    },
    upNextDurationText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    timeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}15`,
    },
    timeBadgeText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      fontVariant: ["tabular-nums"],
    },
    emptyCardContainer: {
      borderRadius: 24,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.25 : 0.06,
          shadowRadius: 12,
        },
        android: { elevation: 2 },
      }),
    },
    blurWrapper: {
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    cardTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.glass.cardBg,
    },
    emptyCardInner: {
      padding: 28,
      alignItems: "center",
      gap: 12,
    },
    emptyIconCircle: {
      ...shared.iconCircle,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: tileBg,
    },
    emptyTitle: {
      fontSize: themeTokens.fonts.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    emptySubtitle: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 19,
      maxWidth: 300,
    },
    emptyActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: `${theme.colors.primary}18`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      marginTop: 4,
    },
    emptyActionText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
  });
};
