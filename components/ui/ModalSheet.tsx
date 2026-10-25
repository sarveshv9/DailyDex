import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  showCloseButton?: boolean;
  theme?: Theme;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  contentContainerStyle,
  showHandle = true,
  showCloseButton = true,
  theme: customTheme,
}) => {
  const { theme: contextTheme } = useTheme();
  const theme = customTheme ?? contextTheme;
  const { light } = useAppHaptics();
  const shared = useMemo(() => getSharedStyles(theme), [theme]);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handleClose = () => {
    light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Pressable style={shared.modalBackdrop} onPress={handleClose} />
        <View style={[styles.sheet, contentContainerStyle]}>
          {showHandle && <View style={shared.modalHandle} />}

          {(title || showCloseButton) && (
            <View style={shared.modalHeader}>
              <View style={styles.titleContainer}>
                {title && <Text style={shared.modalTitle}>{title}</Text>}
                {subtitle && <Text style={shared.modalSubtitle}>{subtitle}</Text>}
              </View>

              {showCloseButton && (
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    shared.modalCloseButton,
                    styles.closeButtonMargin,
                    pressed && styles.closeButtonPressed,
                  ]}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              )}
            </View>
          )}

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.lg + 8,
      borderTopRightRadius: theme.borderRadius.lg + 8,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: Platform.OS === "ios" ? themeTokens.spacing.xxl : theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      maxHeight: "90%",
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        android: {
          elevation: 16,
        },
      }),
    },
    titleContainer: {
      flex: 1,
    },
    closeButtonMargin: {
      marginLeft: theme.spacing.md,
    },
    closeButtonPressed: {
      opacity: 0.7,
    },
  });
};
