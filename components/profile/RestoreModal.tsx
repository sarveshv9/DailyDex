import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { scheduleRoutineNotifications } from "../../utils/notifications";
import { RoutineItem } from "../../utils/utils";
import { ROUTINE_STORAGE_KEY } from "../../constants/storageKeys";

interface RestoreModalProps {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  onRestoreSuccess: () => void;
}

export function RestoreModal({
  visible,
  onClose,
  theme,
  onRestoreSuccess,
}: RestoreModalProps) {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [jsonText, setJsonText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!jsonText.trim()) {
      Alert.alert("Missing Data", "Please paste your JSON backup data first.");
      return;
    }

    setIsRestoring(true);
    try {
      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(jsonText.trim());
      } catch {
        Alert.alert(
          "Invalid JSON",
          "The pasted text is not valid JSON format. Please verify the content you exported."
        );
        setIsRestoring(false);
        return;
      }

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        Alert.alert("Invalid Format", "Backup data must be a JSON key-value object.");
        setIsRestoring(false);
        return;
      }

      const keys = Object.keys(parsed);
      const zenKeys = keys.filter((k) => k.startsWith("@zen_"));

      if (zenKeys.length === 0) {
        Alert.alert(
          "Unrecognized Backup",
          "No Zen App keys (such as routines, tasks, or stats) were detected in this JSON."
        );
        setIsRestoring(false);
        return;
      }

      // Write each key to AsyncStorage
      for (const key of keys) {
        const val = parsed[key];
        const valStr = typeof val === "string" ? val : JSON.stringify(val);
        await AsyncStorage.setItem(key, valStr);
      }

      // If routines were included, re-schedule notifications
      if (parsed[ROUTINE_STORAGE_KEY]) {
        try {
          const raw = parsed[ROUTINE_STORAGE_KEY];
          const routines: RoutineItem[] =
            typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(routines)) {
            await scheduleRoutineNotifications(routines);
          }
        } catch (e) {
          console.warn("Could not re-schedule routine notifications after restore:", e);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Restore Complete",
        `Successfully restored ${zenKeys.length} categories of app data!`,
        [
          {
            text: "OK",
            onPress: () => {
              setJsonText("");
              onRestoreSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (e) {
      console.error("Failed to restore backup:", e);
      Alert.alert("Restore Failed", "An error occurred while importing your backup data.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Restore Backup</Text>
              <Text style={styles.subtitle}>
                Paste your exported JSON backup text below
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.secondary} />
            </Pressable>
          </View>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder='{"@zen_routine": "...", ...}'
            placeholderTextColor={`${theme.colors.secondary}60`}
            value={jsonText}
            onChangeText={setJsonText}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                isRestoring && { opacity: 0.6 },
              ]}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text style={styles.restoreText}>Restore Data</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    card: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      padding: 24,
      gap: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: theme.colors.text,
    },
    subtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    textInput: {
      height: 180,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: 14,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontSize: 12,
      color: theme.colors.text,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}20`,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      height: 56,
      borderRadius: 22,
      backgroundColor: `${theme.colors.secondary}10`,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}15`,
    },
    cancelText: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    restoreButton: {
      flex: 1.5,
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...theme.glows.primary,
    },
    restoreText: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: theme.colors.white,
    },
  });

