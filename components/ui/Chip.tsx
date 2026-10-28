import React, { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";

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

  const handlePress = () => {
    if (disabled) return;
    selection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, textStyle]}>{label}</Text>
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{badgeCount}</Text>
        </View>
      )}
    </Pressable>
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
      ...(selected ? shared.chipActive : {}),
      paddingVertical,
      paddingHorizontal,
      minHeight: isSm ? 28 : 36,
    },
    icon: {
      marginRight: theme.spacing.xs,
    },
    text: {
      fontSize,
      fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
      color: selected ? theme.colors.onPrimary : theme.colors.text,
    },
    badge: {
      marginLeft: theme.spacing.xs,
      backgroundColor: selected
        ? theme.isDarkMode
          ? "rgba(255, 255, 255, 0.40)"
          : "rgba(0, 0, 0, 0.16)"
        : theme.isDarkMode
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)",
      borderRadius: themeTokens.borderRadius.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: selected
        ? theme.isDarkMode
          ? "rgba(255, 255, 255, 0.50)"
          : "rgba(0, 0, 0, 0.22)"
        : theme.isDarkMode
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(0, 0, 0, 0.12)",
    },
    badgeText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      color: selected ? theme.colors.onPrimary : theme.colors.text,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    disabled: {
      opacity: 0.4,
    },
  });
};
