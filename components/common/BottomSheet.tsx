import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
};

/**
 * Standard Zen BottomSheet Component
 *
 * Provides a tactile, glassmorphic modal sheet with consistent drag handle,
 * haptic close button, and keyboard-aware container.
 */
export function BottomSheet({
  visible,
  onClose,
  theme,
  title,
  subtitle,
  children,
  contentContainerStyle,
}: BottomSheetProps) {
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
        />

        <View style={styles.sheetContent}>
          {/* Handle bar for visual affordance */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          {(title || subtitle) && (
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                {title && <Text style={styles.titleText}>{title}</Text>}
                {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
          )}

          {/* Main Content */}
          <View style={[styles.childrenContainer, contentContainerStyle]}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.6)",
      ...Platform.select({
        web: {
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      }),
    },
    sheetContent: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderTopWidth: 1,
      borderColor: theme.glass.borderColor,
      width: "100%",
      maxHeight: "92%",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
        },
        android: {
          elevation: 16,
        },
        web: {
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        },
      }),
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: Platform.OS === "ios" ? 40 : theme.spacing.xl,
    },
    handleContainer: {
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: 10,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: `${theme.colors.textSecondary}40`,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      paddingTop: 4,
    },
    titleWrap: {
      flex: 1,
      paddingRight: 12,
    },
    titleText: {
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    subtitleText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      backgroundColor: `${theme.colors.textSecondary}15`,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    childrenContainer: {
      flexShrink: 1,
    },
  });

export default BottomSheet;
