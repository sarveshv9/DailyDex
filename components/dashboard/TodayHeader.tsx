import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { themeTokens } from "../../constants/themeTokens";
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
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export interface TodayHeaderProps {
  currentTime: Date;
  todayTasksDone: number;
  totalIntentions: number;
  dailyProgressFraction: number;
  theme: Theme;
  isDarkMode: boolean;
}

const TodayHeaderComponent: React.FC<TodayHeaderProps> = ({
  currentTime,
  todayTasksDone,
  totalIntentions,
  dailyProgressFraction,
  theme,
  isDarkMode,
}) => {
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
              size={24}
              color={theme.colors.text}
            />
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.dotSeparator}>•</Text>
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
              size={48}
              strokeWidth={3.5}
              color={theme.colors.primary}
              trackColor={isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"}
            >
              <Text style={styles.progressCount}>{todayTasksDone}</Text>
            </ProgressRing>
            <Text style={styles.progressLabel}>
              {totalIntentions > 0
                ? `${todayTasksDone}/${totalIntentions}`
                : "0/0"}
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
      paddingTop: 10,
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
      fontSize: 28,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dateText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    dotSeparator: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginHorizontal: 1,
    },
    timeText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    headerRight: {
      alignItems: "center",
    },
    progressRingWrapper: {
      alignItems: "center",
      gap: 3,
    },
    progressCount: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      fontVariant: ["tabular-nums"],
    },
    progressLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
  });
