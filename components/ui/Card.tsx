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
import { getSharedStyles, Theme } from "../../styles/shared";

export type CardVariant = "glass" | "solid" | "elevated";
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
  variant = "glass",
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
  const shared = getSharedStyles(theme);
  let paddingValue = theme.spacing.md;
  if (padding === "none") paddingValue = 0;
  else if (padding === "sm") paddingValue = theme.spacing.sm;
  else if (padding === "lg") paddingValue = theme.spacing.lg;

  if (variant === "glass") {
    return StyleSheet.create({
      card: {
        ...shared.glassCard,
        padding: paddingValue,
      },
      pressed: {
        opacity: 0.88,
        transform: [{ scale: Platform.OS === "ios" ? 0.99 : 1 }],
      },
    });
  }

  let backgroundColor = theme.glass.cardBg;
  let borderColor = theme.glass.borderColor;
  let borderWidth = 1;
  let shadowStyle = {
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.isDarkMode ? 0.20 : 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: `0px 4px 12px rgba(0, 0, 0, ${theme.isDarkMode ? 0.20 : 0.04})`,
      },
    }),
  };

  if (variant === "solid") {
    backgroundColor = theme.colors.surface;
    borderColor = theme.colors.border;
    borderWidth = 1;
    shadowStyle = {
      ...Platform.select({
        ios: { shadowColor: "#000000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
        android: { elevation: 0 },
        web: { boxShadow: "none" },
      }),
    };
  } else if (variant === "elevated") {
    backgroundColor = theme.colors.surface;
    borderColor = theme.colors.border;
    borderWidth = 1;
    shadowStyle = {
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        },
      }),
    };
  }

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
