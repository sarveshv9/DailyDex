import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { themeTokens } from "../../constants/themeTokens";
import { Theme } from "../../styles/shared";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionIcon,
  style,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon ?? (
          <Ionicons
            name="sparkles-outline"
            size={36}
            color={theme.colors.primary}
          />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          icon={actionIcon ?? <Ionicons name="add" size={18} color="#FFFFFF" />}
          onPress={onAction}
          variant="primary"
          size="md"
          style={{ marginTop: themeTokens.spacing.lg }}
        />
      )}
    </View>
  );
};

const getStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: themeTokens.spacing.xxl,
      paddingHorizontal: theme.spacing.xl,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${theme.colors.primary}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 280,
      marginBottom: theme.spacing.lg,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      minHeight: 44,
      ...theme.glows.primary,
    },
    actionButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    actionIcon: {
      marginRight: theme.spacing.xs,
    },
    actionText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
  });
};
