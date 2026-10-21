import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

type ActivityData = {
  dateStr: string;
  dayOfWeek: string;
  tasks: number;
  focusMinutes: number;
};

type Props = {
  data: ActivityData[];
  theme: Theme;
  timeframe: "week" | "month" | "year";
  metric: "tasks" | "focusMinutes";
  onToggleMetric: () => void;
};

export function ActivityChart({
  data,
  theme,
  timeframe,
  metric,
  onToggleMetric,
}: Props) {
  const isTasks = metric === "tasks";
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to the end (right) when data changes, so we always see the most recent
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data, timeframe]);

  const maxValue = Math.max(
    ...data.map((d) => (isTasks ? d.tasks : d.focusMinutes)),
    1 // Prevent div by 0
  );

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleMetric();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${theme.colors.secondary}08`,
          borderColor: theme.glass.borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={isTasks ? "checkmark-done-circle-outline" : "hourglass-outline"}
            size={18}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>
            Activity Trend
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: `${theme.colors.primary}18`,
              borderColor: `${theme.colors.primary}35`,
            },
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle metric between tasks and focus time"
        >
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={theme.colors.primary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.toggleText, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>
            {isTasks ? "Tasks" : "Focus Time"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.chartArea,
          timeframe === "week" && { flex: 1, justifyContent: "space-between" },
        ]}
      >
        {data.map((day, idx) => {
          const value = isTasks ? day.tasks : day.focusMinutes;
          const heightPercent = (value / maxValue) * 100;

          const columnStyle =
            timeframe === "month" ? styles.barColumnCompact : styles.barColumn;
          const trackStyle =
            timeframe === "month" ? styles.barTrackCompact : styles.barTrack;

          return (
            <View key={`${day.dateStr}-${idx}`} style={columnStyle}>
              {/* Value label */}
              <Text
                style={[
                  styles.valueLabel,
                  { color: value > 0 ? theme.colors.primary : "transparent", fontFamily: theme.fonts.medium },
                ]}
              >
                {value > 0 ? (isTasks ? value : `${value}m`) : ""}
              </Text>

              <View
                style={[
                  trackStyle,
                  { backgroundColor: `${theme.colors.secondary}14` },
                ]}
              >
                {/* Animated Bar */}
                <AnimatedBar
                  heightPercent={heightPercent}
                  color={theme.colors.primary}
                  delay={Math.min(idx * 20, 400)}
                />
              </View>

              <Text
                style={[
                  styles.dayLabel,
                  { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium },
                ]}
                numberOfLines={1}
              >
                {day.dayOfWeek}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const AnimatedBar = ({
  heightPercent,
  color,
  delay,
}: {
  heightPercent: number;
  color: string;
  delay: number;
}) => {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = 0;
    const timeout = setTimeout(() => {
      animatedHeight.value = withSpring(heightPercent, {
        damping: 14,
        stiffness: 90,
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [heightPercent, delay]);

  const rStyle = useAnimatedStyle(() => {
    return {
      height: `${animatedHeight.value}%`,
      minHeight: animatedHeight.value > 0 ? 6 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        styles.barFill,
        { backgroundColor: color },
        rStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
  },
  scrollContainer: {
    width: "100%",
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    gap: 8,
    paddingRight: 8,
    paddingTop: 8,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    minWidth: 36,
  },
  barColumnCompact: {
    alignItems: "center",
    width: 24,
  },
  barTrack: {
    width: 14,
    height: 110,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barTrackCompact: {
    width: 10,
    height: 110,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  valueLabel: {
    fontSize: 10,
    marginBottom: 6,
    height: 14,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 8,
  },
});

