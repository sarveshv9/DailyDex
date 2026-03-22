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
import { Theme } from "../../constants/shared";

// SwiftUI liquid glass (iOS dev build only)
import { GlassEffectContainer, Host, VStack } from '@expo/ui/swift-ui';
import { glassEffect, frame } from '@expo/ui/swift-ui/modifiers';

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

  // Using a bottom-oriented Modal to create the Sheet effect
  // Note: We use KeyboardAvoidingView to push the sheet up when keyboards open
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
        {Platform.OS === 'ios' ? (
          <Pressable style={styles.backdrop} onPress={onClose}>
            <Host style={StyleSheet.absoluteFill} colorScheme={theme.colors.background.startsWith('#0') || theme.colors.background === '#000000' || theme.colors.background === '#1A1A1A' ? 'dark' : 'light'}>
              <GlassEffectContainer>
                <VStack modifiers={[glassEffect(), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                  {null}
                </VStack>
              </GlassEffectContainer>
            </Host>
          </Pressable>
        ) : (
          <Pressable style={styles.backdrop} onPress={onClose} />
        )}
        
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
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : theme.spacing.xl, // safe area padding
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: `${theme.colors.textSecondary}40`,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  titleText: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
    flexShrink: 1, // Ensure children can scroll if needed
  },
});
