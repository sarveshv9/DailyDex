import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import {
  Animated,
  GestureResponderHandlers,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { RoutineItem } from "../../utils/utils";

export interface RoutinePeekBarProps {
  bottomOffset: number;
  tabBarWidth: number;
  listOpen: boolean;
  opacity: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
  nextTask: RoutineItem | null;
  nextTaskBadgeColor: string;
  nextTaskIcon: string;
  onOpenList: () => void;
  panHandlers?: GestureResponderHandlers;
}

const RoutinePeekBarComponent: React.FC<RoutinePeekBarProps> = ({
  bottomOffset,
  tabBarWidth,
  listOpen,
  opacity,
  translateY,
  nextTask,
  nextTaskBadgeColor,
  nextTaskIcon,
  onOpenList,
  panHandlers,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenList();
  };

  const isLight = !theme.isDarkMode;

  return (
    <Animated.View
      style={[
        styles.tabBarContainer,
        {
          bottom: bottomOffset,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={listOpen ? "none" : "auto"}
    >
      <Pressable
        style={({ pressed }) => [
          styles.tabBar,
          { width: tabBarWidth },
          pressed && { opacity: 0.85 },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Open daily routine detail panel"
        {...(panHandlers ?? {})}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.colors.background, opacity: 0.92 },
            ]}
            pointerEvents="none"
          />
        ) : (
          <BlurView
            intensity={100}
            tint={isLight ? "systemMaterialLight" : "systemMaterialDark"}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.cardBg }]}
        />

        <View style={styles.collapsedPillContent}>
          <View
            style={[
              styles.collapsedIconCircle,
              {
                backgroundColor: `${nextTaskBadgeColor}22`,
                borderColor: `${nextTaskBadgeColor}45`,
              },
            ]}
          >
            <Ionicons
              name={nextTaskIcon as any}
              size={20}
              color={nextTaskBadgeColor}
            />
          </View>

          <View style={styles.collapsedTextWrapper}>
            <View style={styles.collapsedTimeRow}>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.colors.textSecondary}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.collapsedTime}>
                {nextTask ? nextTask.time : "Today"}
              </Text>
              {nextTask && (
                <View
                  style={[
                    styles.collapsedBadge,
                    { backgroundColor: `${nextTaskBadgeColor}18` },
                  ]}
                >
                  {nextTask.daysOfWeek?.length ? (
                    <Ionicons
                      name="repeat"
                      size={10}
                      color={nextTaskBadgeColor}
                      style={{ marginRight: 3 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.collapsedBadgeText,
                      { color: nextTaskBadgeColor },
                    ]}
                  >
                    {nextTask.daysOfWeek?.length ? "Daily" : "Once"}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {nextTask ? nextTask.task : "Daily Routine"}
            </Text>
          </View>

          <View style={styles.collapsedChevronCircle}>
            <Ionicons
              name="chevron-up"
              size={18}
              color={theme.colors.textSecondary}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const RoutinePeekBar = React.memo(RoutinePeekBarComponent);

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    tabBarContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    },
    tabBar: {
      flexDirection: "row",
      height: 68,
      borderRadius: themeTokens.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      overflow: "hidden",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      alignItems: "center",
      paddingHorizontal: themeTokens.spacing.md,
    },
    collapsedPillContent: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
    },
    collapsedIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      marginRight: themeTokens.spacing.sm + 4,
    },
    collapsedTextWrapper: {
      flex: 1,
      justifyContent: "center",
    },
    collapsedTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 3,
    },
    collapsedTime: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      letterSpacing: 0.2,
    },
    collapsedBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: themeTokens.borderRadius.sm,
      marginLeft: 5,
    },
    collapsedBadgeText: {
      fontSize: themeTokens.fonts.size.xs - 2,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.2,
    },
    collapsedTitle: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    collapsedChevronCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: themeTokens.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
