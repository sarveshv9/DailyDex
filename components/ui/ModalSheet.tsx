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
import { Theme } from "../../styles/shared";

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
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, contentContainerStyle]}>
          {showHandle && <View style={styles.handle} />}

          {(title || showCloseButton) && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>

              {showCloseButton && (
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.closeButton,
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
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.borderRadius.lg + 8,
      borderTopRightRadius: theme.borderRadius.lg + 8,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: Platform.OS === "ios" ? themeTokens.spacing.xxl : theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      maxHeight: "90%",
      borderTopWidth: 1,
      borderColor: theme.glass.borderColor,
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
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.textSecondary + "40",
      alignSelf: "center",
      marginBottom: theme.spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.glass.neutralFill,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: theme.spacing.md,
    },
    closeButtonPressed: {
      opacity: 0.7,
    },
  });
};
