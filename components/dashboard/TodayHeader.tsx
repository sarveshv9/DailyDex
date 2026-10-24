import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Theme } from "../../styles/shared";
import { ProgressRing } from "./ProgressRing";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface GreetingDetails {
  text: string;
  icon: IoniconName;
}

const getGreetingDetails = (hour: number): GreetingDetails => {
  if (hour < 5) return { text: "Good Night", icon: "moon-outline" };
  if (hour < 12) return { text: "Good Morning", icon: "sunny-outline" };
  if (hour < 17) return { text: "Good Afternoon", icon: "partly-sunny-outline" };
  if (hour < 21) return { text: "Good Evening", icon: "cloudy-night-outline" };
  return { text: "Good Night", icon: "moon-outline" };
};

const formatDate = (date: Date): string =>
  date
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export interface TodayHeaderProps {
  todayTasksDone: number;
  totalIntentions: number;
  dailyProgressFraction: number;
  theme: Theme;
  isDarkMode: boolean;
}

const TodayHeaderComponent: React.FC<TodayHeaderProps> = ({
  todayTasksDone,
  totalIntentions,
  dailyProgressFraction,
  theme,
  isDarkMode,
}) => {
  // Live clock state - isolated to this component so it never triggers parent screen re-renders
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greetingInfo = useMemo(
    () => getGreetingDetails(currentTime.getHours()),
    [currentTime]
  );
  const formattedDate = useMemo(() => formatDate(currentTime), [currentTime]);
  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);

  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.heroBanner}>
      <View style={styles.heroTopRow}>
        <View style={styles.headerLeft}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{greetingInfo.text}</Text>
            <Ionicons
              name={greetingInfo.icon}
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.timeDot} />
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
        </View>

        {/* Daily Dashboard Completion Ring */}
        <View
          style={styles.headerRight}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`Today's progress: ${todayTasksDone} of ${totalIntentions} rituals completed`}
        >
          <View style={styles.progressRingWrapper}>
            <ProgressRing
              progress={dailyProgressFraction}
              size={52}
              strokeWidth={4.5}
              color={theme.colors.primary}
              trackColor={
                isDarkMode
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.06)"
              }
            >
              <Text style={styles.progressCount}>{todayTasksDone}</Text>
            </ProgressRing>
            <Text style={styles.progressLabel}>
              {totalIntentions > 0
                ? `${todayTasksDone}/${totalIntentions}`
                : "Today"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export const TodayHeader = React.memo(TodayHeaderComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    heroBanner: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {
      flex: 1,
      marginRight: 16,
    },
    greetingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    greeting: {
      fontSize: 26,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dateText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      letterSpacing: 0.8,
    },
    timeDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.5,
    },
    timeText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    headerRight: {
      alignItems: "center",
    },
    progressRingWrapper: {
      alignItems: "center",
      gap: 4,
    },
    progressCount: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      fontVariant: ["tabular-nums"],
    },
    progressLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
  });
