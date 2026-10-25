import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import { useTimerRemainingSeconds } from "../../hooks/useTimerRemainingSeconds";
import { useTimerStore } from "../../stores/timerStore";
import * as Haptics from "../../utils/haptics";

interface ActiveTimerBadgeProps {
  taskId: string;
  onOpenFocus: () => void;
  primaryColor: string;
  badgeStyle?: ViewStyle;
  textStyle?: TextStyle;
  fallback?: React.ReactNode;
}

export function ActiveTimerBadge({
  taskId,
  onOpenFocus,
  primaryColor,
  badgeStyle,
  textStyle,
  fallback,
}: ActiveTimerBadgeProps) {
  const isCurrentTimer = useTimerStore((s) => s.taskId === taskId);
  const isTimerActive = useTimerStore((s) => s.taskId === taskId && s.isActive);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);

  const remainingSeconds = useTimerRemainingSeconds();

  if (!isCurrentTimer || remainingSeconds <= 0) {
    return <>{fallback ?? null}</>;
  }

  const handleToggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isTimerActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Pressable
      onPress={onOpenFocus}
      hitSlop={6}
      style={[styles.badge, badgeStyle]}
      accessibilityLabel="View Active Focus Timer"
    >
      <Ionicons
        name={isTimerActive ? "pulse" : "pause"}
        size={12}
        color={primaryColor}
      />
      <Text style={[styles.text, textStyle]}>
        {formattedTime}
      </Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          handleToggleTimer();
        }}
        hitSlop={6}
      >
        <Ionicons
          name={isTimerActive ? "pause-circle" : "play-circle"}
          size={16}
          color={primaryColor}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
