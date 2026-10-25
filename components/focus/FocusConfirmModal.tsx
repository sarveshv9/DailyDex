import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { getSharedStyles, Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export interface FocusConfirmModalProps {
  visible: boolean;
  type: "end" | "minimize";
  onClose: () => void;
  onConfirmEnd: () => void;
  onMinimize?: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusConfirmModalComponent: React.FC<FocusConfirmModalProps> = ({
  visible,
  type,
  onClose,
  onConfirmEnd,
  onMinimize,
  theme,
  isDarkMode,
}) => {
  const shared = useMemo(() => getSharedStyles(theme), [theme]);
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView
            intensity={isDarkMode ? 50 : 35}
            tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDarkMode
                  ? "rgba(0,0,0,0.55)"
                  : "rgba(0,0,0,0.3)",
              },
            ]}
          />
        </Pressable>

        <View style={styles.modalCard}>
          <BlurView
            intensity={isDarkMode ? 40 : 60}
            tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.glass.cardBg },
            ]}
          />

          <View
            style={[
              styles.modalIconCircle,
              type === "end" && styles.modalIconCircleDestructive,
            ]}
          >
            <Ionicons
              name={type === "minimize" ? "leaf-outline" : "stop-circle-outline"}
              size={28}
              color={
                type === "minimize"
                  ? theme.colors.primary
                  : themeTokens.colors.danger
              }
            />
          </View>

          <Text style={styles.modalTitle}>
            {type === "minimize" ? "Active Focus Session" : "End Focus Session?"}
          </Text>

          <Text style={styles.modalDescription}>
            {type === "minimize"
              ? "Your timer is running in the background. You can keep it running while you browse other screens, or end it now."
              : "Are you sure you want to end this focus session early? Your current progress will be reset."}
          </Text>

          <View style={styles.modalActionsCol}>
            {type === "minimize" ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Minimize and keep timer running"
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onClose();
                    onMinimize?.();
                  }}
                >
                  <Ionicons
                    name="contract-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text style={styles.modalPrimaryButtonText}>
                    Minimize (Keep Running)
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="End session and leave"
                  style={({ pressed }) => [
                    styles.modalDestructiveButton,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Warning
                    );
                    onClose();
                    onConfirmEnd();
                  }}
                >
                  <Ionicons
                    name="stop-circle-outline"
                    size={18}
                    color={themeTokens.colors.danger}
                  />
                  <Text style={styles.modalDestructiveButtonText}>
                    End Session & Leave
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Stay on focus screen"
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onClose();
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Stay on Screen</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Keep focusing"
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onClose();
                  }}
                >
                  <Ionicons name="play" size={18} color={theme.colors.white} />
                  <Text style={styles.modalPrimaryButtonText}>Keep Focusing</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="End session early"
                  style={({ pressed }) => [
                    styles.modalDestructiveButton,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Warning
                    );
                    onClose();
                    onConfirmEnd();
                  }}
                >
                  <Ionicons
                    name="stop-circle-outline"
                    size={18}
                    color={themeTokens.colors.danger}
                  />
                  <Text style={styles.modalDestructiveButtonText}>
                    End Session Early
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const FocusConfirmModal = React.memo(FocusConfirmModalComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: themeTokens.spacing.xl,
    },
    modalCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: themeTokens.borderRadius.xl,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      padding: themeTokens.spacing.xl,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: themeTokens.colors.black,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDarkMode ? 0.45 : 0.12,
          shadowRadius: 24,
        },
        android: { elevation: 8 },
      }),
    },
    modalIconCircle: {
      ...shared.iconCircle,
      width: 56,
      height: 56,
      borderRadius: 28,
      marginBottom: themeTokens.spacing.md,
    },
    modalIconCircleDestructive: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
    },
    modalTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.lg,
      color: theme.colors.primary,
      marginBottom: themeTokens.spacing.sm,
      textAlign: "center",
    },
    modalDescription: {
      ...shared.bodyText,
      fontSize: themeTokens.fonts.size.xs,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: themeTokens.spacing.xl,
    },
    modalActionsCol: {
      width: "100%",
      gap: themeTokens.spacing.sm,
    },
    modalPrimaryButton: {
      ...shared.primaryButton,
      width: "100%",
      height: 56,
      paddingVertical: 0,
      paddingHorizontal: 0,
      flexDirection: "row",
      gap: themeTokens.spacing.sm,
    },
    modalPrimaryButtonText: {
      ...shared.primaryButtonText,
      fontSize: themeTokens.fonts.size.md,
    },
    modalDestructiveButton: {
      ...shared.destructiveButton,
      width: "100%",
      height: 56,
      paddingVertical: 0,
      paddingHorizontal: 0,
      flexDirection: "row",
      borderColor: "rgba(239, 68, 68, 0.35)",
      backgroundColor: isDarkMode
        ? "rgba(239, 68, 68, 0.12)"
        : "rgba(239, 68, 68, 0.08)",
      gap: themeTokens.spacing.sm,
    },
    modalDestructiveButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: themeTokens.colors.danger,
    },
    modalCancelButton: {
      width: "100%",
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCancelButtonText: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.secondary,
    },
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
};

