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

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  title?: string;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
};

/**
 * Shared BottomSheet Component
 * 
 * Used across the profile page for a consistent, predictable interaction pattern.
 * Replaces full-screen modals, inline dropdowns, and centered popups for
 * settings like Theme, Music, Notifications, Edit Profile, and Stats.
 */
export function BottomSheet({
  visible,
  onClose,
  theme,
  title,
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
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.sheetContent}>
          {/* Handle for visual affordance */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          {title && (
            <View style={styles.headerRow}>
              <Text style={styles.titleText}>{title}</Text>
              <Pressable
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] }
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

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: theme.glass.borderColor,
    width: "100%",
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
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
    backgroundColor: `${theme.colors.textSecondary}35`,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    paddingTop: 4,
  },
  titleText: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    letterSpacing: -0.4,
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

