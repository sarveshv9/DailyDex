import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { Theme } from "../../styles/shared";

export type CardVariant = "flat" | "solid" | "elevated" | "glass";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "flat",
  padding = "md",
  onPress,
  haptic = true,
  style,
}) => {
  const { theme } = useTheme();
  const { light } = useAppHaptics();
  const styles = useMemo(() => getStyles(theme, variant, padding), [theme, variant, padding]);

  const handlePress = () => {
    if (!onPress) return;
    if (haptic) light();
    onPress();
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

const getStyles = (theme: Theme, variant: CardVariant, padding: CardPadding) => {
  let paddingValue = theme.spacing.md;
  if (padding === "none") paddingValue = 0;
  else if (padding === "sm") paddingValue = theme.spacing.sm;
  else if (padding === "lg") paddingValue = theme.spacing.lg;

  if (variant === "flat" || variant === "glass" || variant === "solid") {
    return StyleSheet.create({
      card: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.borderRadius.lg,
        padding: paddingValue,
        elevation: 0,
      },
      pressed: {
        opacity: 0.88,
        transform: [{ scale: Platform.OS === "ios" ? 0.99 : 1 }],
      },
    });
  }

  let backgroundColor = theme.colors.surface;
  let borderColor = theme.colors.border;
  let borderWidth = 1;
  let shadowStyle = {
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      },
    }),
  };

  return StyleSheet.create({
    card: {
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius: theme.borderRadius.lg,
      padding: paddingValue,
      ...shadowStyle,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: Platform.OS === "ios" ? 0.99 : 1 }],
    },
  });
};
