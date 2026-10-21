import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import {
  getMonthlyData,
  getTodayString,
  getWeeklyData,
  getYearlyData,
  UserStats,
} from "../../utils/stats";
import { ActivityChart } from "./ActivityChart";
import { BottomSheet } from "./BottomSheet";

type StatsModalProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  stats: UserStats | null;
};

export function StatsModal({ visible, onClose, theme, stats }: StatsModalProps) {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [chartMetric, setChartMetric] = useState<"tasks" | "focusMinutes">("tasks");
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  const chartData = useMemo(() => {
    if (!stats) return [];
    switch (timeframe) {
      case "month":
        return getMonthlyData(stats);
      case "year":
        return getYearlyData(stats);
      case "week":
      default:
        return getWeeklyData(stats);
    }
  }, [stats, timeframe]);

  if (!stats) return null;

  const todayString = getTodayString();
  const todayStats = stats.history[todayString] || { tasks: 0, focusMinutes: 0 };

  // Encouraging messages paired with Ionicons (Strictly NO Unicode emojis)
  let encouragingMessage = "Every mindful step counts. Keep moving forward.";
  let encouragingIcon: keyof typeof Ionicons.glyphMap = "leaf-outline";
  let encouragingColor = theme.colors.primary;

  if (stats.currentStreak >= 7) {
    encouragingMessage = "Magnificent consistency! Your mindfulness streak is thriving.";
    encouragingIcon = "flame";
    encouragingColor = "#FF6B6B";
  } else if (todayStats.tasks > 5) {
    encouragingMessage = "Remarkable productivity today! Flow state achieved.";
    encouragingIcon = "sparkles";
    encouragingColor = "#F59E0B";
  } else if (stats.tasksCompleted > 0) {
    encouragingMessage = "Great job building positive daily momentum.";
    encouragingIcon = "checkmark-circle";
    encouragingColor = theme.colors.primary;
  }

  const handleTimeframeChange = (tf: "week" | "month" | "year") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeframe(tf);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      theme={theme}
      title="Mindful Analytics"
    >
      <ScrollView
        style={{ flexShrink: 1, width: "100%" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Encouraging Banner with Ionicons Badge */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${encouragingColor}14`,
              borderColor: `${encouragingColor}30`,
            },
          ]}
        >
          <View
            style={[
              styles.bannerIconCircle,
              { backgroundColor: `${encouragingColor}22` },
            ]}
          >
            <Ionicons name={encouragingIcon} size={20} color={encouragingColor} />
          </View>
          <Text
            style={[
              styles.bannerText,
              { color: theme.colors.text, fontFamily: theme.fonts.bold },
            ]}
          >
            {encouragingMessage}
          </Text>
        </View>

        {/* Streaks & Momentum */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.bold },
          ]}
        >
          Momentum & Streaks
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: "#FF6B6B35" }]}>
            <View style={[styles.statIconBadge, { backgroundColor: "#FF6B6B18" }]}>
              <Ionicons name="flame" size={24} color="#FF6B6B" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Active Days
            </Text>
          </View>

          <View style={[styles.statBox, { borderColor: "#F59E0B35" }]}>
            <View style={[styles.statIconBadge, { backgroundColor: "#F59E0B18" }]}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats.bestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Best Streak
            </Text>
          </View>
        </View>

        {/* Timeframe Toggles */}
        <View style={styles.timeframeContainer}>
          {(["week", "month", "year"] as const).map((tf) => {
            const isActive = timeframe === tf;
            return (
              <Pressable
                key={tf}
                style={[
                  styles.timeframeBtn,
                  isActive && {
                    backgroundColor: theme.colors.primary,
                    ...theme.glows.primary,
                  },
                ]}
                onPress={() => handleTimeframeChange(tf)}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    {
                      color: isActive ? theme.colors.white : theme.colors.textSecondary,
                      fontFamily: isActive ? theme.fonts.bold : theme.fonts.medium,
                    },
                  ]}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Activity Chart */}
        <ActivityChart
          data={chartData}
          theme={theme}
          timeframe={timeframe}
          metric={chartMetric}
          onToggleMetric={() =>
            setChartMetric((m) => (m === "tasks" ? "focusMinutes" : "tasks"))
          }
        />

        {/* Today's Focus */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.bold },
          ]}
        >
          Today&apos;s Focus
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: `${theme.colors.primary}18` },
              ]}
            >
              <Ionicons
                name="checkmark-done"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {todayStats.tasks}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Tasks Done
            </Text>
          </View>

          <View style={styles.statBox}>
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: `${theme.colors.secondary}18` },
              ]}
            >
              <Ionicons
                name="time"
                size={20}
                color={theme.colors.secondary}
              />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {todayStats.focusMinutes}m
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Time Focused
            </Text>
          </View>
        </View>

        {/* All Time Achievements */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.bold },
          ]}
        >
          Lifetime Milestones
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.milestoneBox}>
            <Ionicons
              name="layers-outline"
              size={22}
              color={theme.colors.primary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.milestoneValue, { color: theme.colors.text }]}>
              {stats.tasksCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Completed
            </Text>
          </View>

          <View style={styles.milestoneBox}>
            <Ionicons
              name="hourglass-outline"
              size={22}
              color={theme.colors.primary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.milestoneValue, { color: theme.colors.text }]}>
              {Math.floor(stats.totalFocusMinutes / 60)}h{" "}
              {stats.totalFocusMinutes % 60}m
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Time
            </Text>
          </View>

          <View style={styles.milestoneBox}>
            <Ionicons
              name="headset-outline"
              size={22}
              color={theme.colors.primary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.milestoneValue, { color: theme.colors.text }]}>
              {stats.sessionsCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Sessions
            </Text>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: 40,
      gap: theme.spacing.md,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      gap: 12,
      marginBottom: theme.spacing.xs,
    },
    bannerIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    bannerText: {
      fontSize: 14,
      flex: 1,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 15,
      marginTop: theme.spacing.sm,
      letterSpacing: -0.3,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: `${theme.colors.secondary}0A`,
      borderRadius: 22,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    statIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      marginTop: 2,
    },
    timeframeContainer: {
      flexDirection: "row",
      backgroundColor: `${theme.colors.secondary}0E`,
      borderRadius: 16,
      padding: 4,
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}12`,
    },
    timeframeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
    timeframeText: {
      fontSize: 13,
    },
    milestoneBox: {
      flex: 1,
      backgroundColor: `${theme.colors.primary}0C`,
      borderRadius: 20,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: `${theme.colors.primary}20`,
    },
    milestoneValue: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.3,
    },
  });

