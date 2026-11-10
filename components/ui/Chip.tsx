import React, { useEffect, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { themeTokens } from "../../constants/themeTokens";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { getSharedStyles, Theme } from "../../styles/shared";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  badgeCount?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  badgeStyle?: StyleProp<ViewStyle>;
  badgeTextStyle?: StyleProp<TextStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  badgeCount,
  size = "md",
  disabled = false,
  style,
  textStyle,
  badgeStyle,
  badgeTextStyle,
}) => {
  const { theme } = useTheme();
  const { selection } = useAppHaptics();
  const styles = useMemo(() => getStyles(theme, selected, size), [theme, selected, size]);

  const scale = useSharedValue(1);
  const activeOpacity = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    activeOpacity.value = withTiming(selected ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, [selected, activeOpacity]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const underlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: activeOpacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
  };

  const handlePress = () => {
    if (disabled) return;
    selection();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.chip,
        disabled && styles.disabled,
        style,
        containerAnimatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.activeUnderlay, underlayAnimatedStyle]}
      />
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, textStyle]}>{label}</Text>
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{badgeCount}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const getStyles = (theme: Theme, selected: boolean, size: "sm" | "md") => {
  const shared = getSharedStyles(theme);
  const isSm = size === "sm";
  const paddingVertical = isSm ? theme.spacing.xs : theme.spacing.sm;
  const paddingHorizontal = isSm ? theme.spacing.sm : theme.spacing.md;
  const fontSize = isSm ? themeTokens.fonts.size.xs : themeTokens.fonts.size.sm;

  return StyleSheet.create({
    chip: {
      ...shared.chip,
      paddingVertical,
      paddingHorizontal,
      minHeight: isSm ? 28 : 36,
      overflow: "hidden",
      position: "relative",
      borderColor: selected ? theme.colors.primary : theme.colors.border,
    },
    activeUnderlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
    },
    icon: {
      marginRight: theme.spacing.xs,
      zIndex: 1,
    },
    text: {
      fontSize,
      fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
      color: selected ? theme.colors.onPrimary : theme.colors.text,
      zIndex: 1,
    },
    badge: {
      marginLeft: theme.spacing.xs,
      backgroundColor: selected
        ? (theme.isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.16)")
        : theme.colors.surfaceMuted,
      borderRadius: themeTokens.borderRadius.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: selected
        ? (theme.isDarkMode ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.22)")
        : theme.colors.border,
      zIndex: 1,
    },
    badgeText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      color: selected ? theme.colors.onPrimary : theme.colors.text,
    },
    disabled: {
      opacity: 0.4,
    },
  });
};
