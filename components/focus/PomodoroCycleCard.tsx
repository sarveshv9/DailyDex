import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { Theme } from "../../styles/shared";

export interface PomodoroCycleCardProps {
  pomodoroSession: number;
  pomodoroPhase: "work" | "shortBreak" | "longBreak";
  theme: Theme;
  isDarkMode: boolean;
}

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
      <BlurView
        intensity={isDarkMode ? 20 : 40}
        tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.pomoCycleHeader}>
        <View style={styles.pomoCycleTitleRow}>
          <Ionicons
            name={pomodoroPhase === "work" ? "flame" : "cafe-outline"}
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.pomoCycleTitle}>
            Cycle {pomodoroSession} of 4 • {phaseTitle}
          </Text>
        </View>
        <Text style={styles.pomoCyclePhaseTag}>{phaseDuration}</Text>
      </View>

      <View style={styles.pomoDotsRow}>
        {[1, 2, 3, 4].map((s) => {
          const isSessionDone =
            s < pomodoroSession ||
            (s === pomodoroSession && pomodoroPhase !== "work");
          const isSessionActive =
            s === pomodoroSession && pomodoroPhase === "work";

          return (
            <View
              key={s}
              style={[
                styles.pomoDotPill,
                isSessionDone && styles.pomoDotPillDone,
                isSessionActive && styles.pomoDotPillActive,
              ]}
            >
              {isSessionDone ? (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={theme.colors.onPrimary}
                />
              ) : isSessionActive ? (
                <Ionicons
                  name="flame"
                  size={13}
                  color={theme.colors.primaryText}
                />
              ) : (
                <Text style={styles.pomoDotText}>{s}</Text>
              )}
            </View>
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
