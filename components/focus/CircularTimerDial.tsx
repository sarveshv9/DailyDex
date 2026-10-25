import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { useTimerRemainingSeconds } from "../../hooks/useTimerRemainingSeconds";
import { useTimerStore } from "../../stores/timerStore";
import { themeTokens } from "../../constants/themeTokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.76, 290);
const STROKE_WIDTH = 10;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CircularTimerDialProps {
  isCurrentTimer: boolean;
  selectedDuration: number;
  selectedMode: "Free" | "Pomodoro";
}

export const CircularTimerDial: React.FC<CircularTimerDialProps> = ({
  isCurrentTimer,
  selectedDuration,
  selectedMode,
}) => {
  const { theme, isDarkMode } = useTheme();

  // Granular store subscriptions (only dial re-renders on seconds tick)
  const isActive = useTimerStore((s) => s.isActive);
  const isCompleted = useTimerStore((s) => s.isCompleted);
  const targetEndTime = useTimerStore((s) => s.targetEndTime);
  const duration = useTimerStore((s) => s.duration);
  const pomodoroMode = useTimerStore((s) => s.pomodoroMode);
  const pomodoroPhase = useTimerStore((s) => s.pomodoroPhase);
  const pausedTimeRemaining = useTimerStore((s) => s.pausedTimeRemaining);

  // High-performance 1Hz countdown hook (computes seconds during render)
  const remainingSeconds = useTimerRemainingSeconds();

  const showDurationPicker =
    !isCurrentTimer || (!targetEndTime && !isCompleted);

  const displayTime = showDurationPicker
    ? selectedMode === "Pomodoro"
      ? 25 * 60
      : selectedDuration
    : isActive
    ? remainingSeconds
    : pausedTimeRemaining ?? duration ?? selectedDuration;

  const totalDuration = showDurationPicker
    ? selectedMode === "Pomodoro"
      ? 25 * 60
      : selectedDuration
    : duration || displayTime || 1;

  const progress = isCompleted
    ? 0
    : showDurationPicker
    ? 1
    : Math.max(0, Math.min(1, displayTime / totalDuration));

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusInfo = () => {
    if (isCompleted) {
      return {
        label: "COMPLETED",
        icon: "checkmark-circle" as const,
        color: theme.colors.primary,
      };
    }
    if (pomodoroMode && !showDurationPicker) {
      if (pomodoroPhase === "work") {
        return {
          label: "WORK SESSION",
          icon: "flame" as const,
          color: theme.colors.primary,
        };
      }
      return {
        label: pomodoroPhase === "shortBreak" ? "SHORT REST" : "LONG REST",
        icon: "cafe" as const,
        color: themeTokens.colors.success,
      };
    }
    if (isActive) {
      return {
        label: "FOCUSING",
        icon: "pulse" as const,
        color: theme.colors.primary,
      };
    }
    return {
      label: "PAUSED",
      icon: "pause" as const,
      color: theme.colors.textSecondary,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.dialWrapper}>
      <View
        style={[
          styles.dialShadowContainer,
          {
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isDarkMode ? 0.35 : 0.18,
            shadowRadius: 28,
            elevation: 10,
          },
        ]}
      >
        <View
          style={[
            styles.dialOuter,
            {
              borderColor: isDarkMode
                ? "rgba(255, 255, 255, 0.14)"
                : "rgba(0, 0, 0, 0.08)",
            },
          ]}
        >
          <BlurView
            intensity={isDarkMode ? 35 : 60}
            tint={isDarkMode ? "systemThinMaterialDark" : "systemThinMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.glass.cardBg },
            ]}
          />

          {/* SVG Progress Circle */}
          <Svg
            width={DIAL_SIZE}
            height={DIAL_SIZE}
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}
          >
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={RADIUS}
              stroke={
                isDarkMode
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.06)"
              }
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={RADIUS}
              stroke={theme.colors.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>

          {/* Center Dial Content */}
          <View
            style={styles.dialContent}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`Timer: ${Math.floor(displayTime / 60)} minutes and ${
              displayTime % 60
            } seconds remaining`}
            accessibilityValue={{ min: 0, max: totalDuration, now: displayTime }}
          >
            {/* Session Status Tag */}
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
                  borderColor: `${statusInfo.color}35`,
                },
              ]}
            >
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusTagText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>

            {/* Tabular Timer Text */}
            <Text
              style={[
                styles.timerDigits,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.bold,
                },
              ]}
            >
              {formatTime(displayTime)}
            </Text>

            {/* Micro Subtitle */}
            <Text
              style={[
                styles.timerSubtext,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.medium,
                },
              ]}
            >
              {isCompleted
                ? "Mindful Session Complete"
                : showDurationPicker
                ? `Ready • ${Math.round(displayTime / 60)} minutes`
                : `${Math.round(progress * 100)}% remaining`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dialWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  dialShadowContainer: {
    borderRadius: DIAL_SIZE / 2,
  },
  dialOuter: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dialContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusTagText: {
    fontSize: themeTokens.fonts.size.xs,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  timerDigits: {
    fontSize: 48,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  timerSubtext: {
    fontSize: themeTokens.fonts.size.xs,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
