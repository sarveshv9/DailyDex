import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { themeTokens } from "../../constants/themeTokens";
import { Theme } from "../../styles/shared";

export interface PomodoroCycleCardProps {
  pomodoroSession: number;
  pomodoroPhase: "work" | "shortBreak" | "longBreak";
  theme: Theme;
  isDarkMode: boolean;
}

const PomoPill = React.memo(function PomoPill({
  s,
  isSessionDone,
  isSessionActive,
  theme,
  styles,
}: {
  s: number;
  isSessionDone: boolean;
  isSessionActive: boolean;
  theme: Theme;
  styles: ReturnType<typeof getStyles>;
}) {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isSessionActive) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isSessionActive, pulseOpacity]);

  const activeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isSessionActive ? pulseOpacity.value : 1,
  }));

  return (
    <Animated.View
      style={[
        styles.pomoDotPill,
        isSessionDone && styles.pomoDotPillDone,
        isSessionActive && styles.pomoDotPillActive,
        isSessionActive && activeAnimatedStyle,
      ]}
    >
      {isSessionDone ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <Ionicons
            name="checkmark"
            size={14}
            color={theme.colors.onPrimary}
          />
        </Animated.View>
      ) : isSessionActive ? (
        <Animated.View entering={FadeIn.duration(160)}>
          <Ionicons
            name="flame"
            size={13}
            color={theme.colors.primaryText}
          />
        </Animated.View>
      ) : (
        <Text style={styles.pomoDotText}>{s}</Text>
      )}
    </Animated.View>
  );
});

const PomodoroCycleCardComponent: React.FC<PomodoroCycleCardProps> = ({
  pomodoroSession,
  pomodoroPhase,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const phaseTitle =
    pomodoroPhase === "work"
      ? "Deep Focus"
      : pomodoroPhase === "shortBreak"
      ? "Short Rest"
      : "Long Rest";

  const phaseDuration =
    pomodoroPhase === "work"
      ? "25m"
      : pomodoroPhase === "shortBreak"
      ? "5m"
      : "15m";

  return (
    <View style={styles.pomoCycleCard}>
      <View style={styles.pomoCycleHeader}>
        <Animated.View
          key={`header-${pomodoroSession}-${pomodoroPhase}`}
          entering={FadeIn.duration(180)}
          style={styles.pomoCycleTitleRow}
        >
          <Ionicons
            name={pomodoroPhase === "work" ? "flame" : "cafe-outline"}
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.pomoCycleTitle}>
            Cycle {pomodoroSession} of 4 • {phaseTitle}
          </Text>
        </Animated.View>
        <Animated.View
          key={`tag-${pomodoroPhase}`}
          entering={FadeIn.duration(180)}
        >
          <Text style={styles.pomoCyclePhaseTag}>{phaseDuration}</Text>
        </Animated.View>
      </View>

      <View style={styles.pomoDotsRow}>
        {[1, 2, 3, 4].map((s) => {
          const isSessionDone =
            s < pomodoroSession ||
            (s === pomodoroSession && pomodoroPhase !== "work");
          const isSessionActive =
            s === pomodoroSession && pomodoroPhase === "work";

          return (
            <PomoPill
              key={s}
              s={s}
              isSessionDone={isSessionDone}
              isSessionActive={isSessionActive}
              theme={theme}
              styles={styles}
            />
          );
        })}
      </View>
    </View>
  );
};

export const PomodoroCycleCard = React.memo(PomodoroCycleCardComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    pomoCycleCard: {
      width: "100%",
      borderRadius: themeTokens.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
      paddingHorizontal: themeTokens.spacing.lg,
      paddingVertical: themeTokens.spacing.md,
      marginBottom: themeTokens.spacing.lg,
    },
    pomoCycleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: themeTokens.spacing.sm,
    },
    pomoCycleTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: themeTokens.spacing.xs,
    },
    pomoCycleTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.primaryText,
    },
    pomoCyclePhaseTag: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
      paddingHorizontal: themeTokens.spacing.sm,
      paddingVertical: 2,
      borderRadius: themeTokens.borderRadius.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    pomoDotsRow: {
      flexDirection: "row",
      gap: themeTokens.spacing.sm,
      justifyContent: "space-between",
    },
    pomoDotPill: {
      flex: 1,
      height: 32,
      borderRadius: themeTokens.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    pomoDotPillDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pomoDotPillActive: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    pomoDotText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
    },
  });
