import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
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

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonHaptic = "light" | "medium" | "heavy" | "selection" | "none";

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  haptic?: ButtonHaptic;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  haptic = "light",
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const { light, medium, heavy, selection } = useAppHaptics();
  const styles = useMemo(() => getStyles(theme, variant, size), [theme, variant, size]);

  const handlePress = async () => {
    if (disabled || loading) return;

    if (haptic === "light") light();
    else if (haptic === "medium") medium();
    else if (haptic === "heavy") heavy();
    else if (haptic === "selection") selection();

    await onPress();
  };

  const displayContent = title ?? children;
  const isTextContent = typeof displayContent === "string";

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        pressed && !disabled && !loading && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? theme.colors.white : theme.colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && (
            <View style={styles.leftIcon}>{icon}</View>
          )}
          {isTextContent ? (
            <Text style={[styles.text, disabled && styles.disabledText, textStyle]}>
              {displayContent}
            </Text>
          ) : (
            displayContent
          )}
          {icon && iconPosition === "right" && (
            <View style={styles.rightIcon}>{icon}</View>
          )}
        </View>
      )}
    </Pressable>
  );
};

const getStyles = (theme: Theme, variant: ButtonVariant, size: ButtonSize) => {
  const shared = getSharedStyles(theme);

  // Height & padding by size
  let minHeight = 48;
  let paddingVertical = theme.spacing.md;
  let paddingHorizontal = theme.spacing.xl;
  let fontSize: number = themeTokens.fonts.size.md;

  if (size === "sm") {
    minHeight = 36;
    paddingVertical = theme.spacing.xs;
    paddingHorizontal = theme.spacing.md;
    fontSize = themeTokens.fonts.size.sm;
  } else if (size === "lg") {
    minHeight = 54;
    paddingVertical = theme.spacing.lg;
    paddingHorizontal = themeTokens.spacing.xxl;
    fontSize = themeTokens.fonts.size.lg;
  }

  const baseSharedStyle =
    variant === "secondary"
      ? shared.secondaryButton
      : variant === "destructive"
      ? shared.destructiveButton
      : variant === "ghost"
      ? shared.ghostButton
      : shared.primaryButton;

  const textColor =
    variant === "secondary"
      ? theme.colors.text
      : variant === "destructive" || variant === "ghost"
      ? theme.colors.primary
      : theme.colors.white;

  return StyleSheet.create({
    button: {
      ...baseSharedStyle,
      minHeight,
      paddingVertical,
      paddingHorizontal,
    },
    fullWidth: {
      width: "100%",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      color: textColor,
      fontSize,
      fontFamily: theme.fonts.bold,
      textAlign: "center",
    },
    leftIcon: {
      marginRight: theme.spacing.xs,
    },
    rightIcon: {
      marginLeft: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.82,
      transform: [{ scale: Platform.OS === "ios" ? 0.98 : 1 }],
    },
    disabled: {
      opacity: 0.45,
      ...Platform.select({
        ios: { shadowOpacity: 0 },
        android: { elevation: 0 },
      }),
    },
    disabledText: {
      color: theme.colors.textSecondary,
    },
  });
};
