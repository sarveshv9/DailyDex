import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Insets,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
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
  hitSlop?: Insets;
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
  hitSlop,
}) => {
  const { theme } = useTheme();
  const { light, medium, heavy, selection } = useAppHaptics();
  const styles = useMemo(() => getStyles(theme, variant, size), [theme, variant, size]);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withTiming(0.97, { duration: 110, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0.88, { duration: 110, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
  };

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

  const resolvedHitSlop =
    hitSlop ??
    (size === "sm" ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      hitSlop={resolvedHitSlop}
      style={fullWidth ? styles.fullWidth : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      <Animated.View
        style={[
          styles.button,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
          animatedStyle,
        ]}
      >
        <View style={[styles.content, loading && styles.contentHidden]}>
          {icon && iconPosition === "left" && (
            <View style={styles.leftIcon}>{icon}</View>
          )}
          {isTextContent ? (
            <Text
              style={[styles.text, disabled && styles.disabledText, textStyle]}
            >
              {displayContent}
            </Text>
          ) : (
            displayContent
          )}
          {icon && iconPosition === "right" && (
            <View style={styles.rightIcon}>{icon}</View>
          )}
        </View>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator
              size="small"
              color={
                variant === "primary"
                  ? theme.colors.onPrimary
                  : variant === "destructive"
                  ? theme.colors.danger
                  : theme.colors.primaryText
              }
            />
          </View>
        )}
      </Animated.View>
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
      : variant === "destructive"
      ? theme.colors.danger
      : variant === "ghost"
      ? theme.colors.primaryText
      : theme.colors.onPrimary;

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
    contentHidden: {
      opacity: 0,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
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
