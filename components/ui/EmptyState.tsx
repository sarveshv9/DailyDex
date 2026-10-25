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
import { getSharedStyles, Theme } from "../../styles/shared";
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
  const shared = useMemo(() => getSharedStyles(theme), [theme]);
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
      <Text style={[shared.sectionTitle, styles.title]}>{title}</Text>
      <Text style={[shared.bodyText, styles.description]}>{description}</Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          icon={actionIcon ?? <Ionicons name="add" size={18} color={theme.colors.white} />}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionButton}
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
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },
    description: {
      textAlign: "center",
      maxWidth: 280,
      marginBottom: theme.spacing.lg,
    },
    actionButton: {
      marginTop: themeTokens.spacing.lg,
    },
  });
};
