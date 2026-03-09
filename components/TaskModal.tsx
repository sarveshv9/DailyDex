import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { getRoutineImage, RoutineItem } from "../utils/utils";

interface TaskModalProps {
  visible: boolean;
  task: RoutineItem | null;
  animatedStyle: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  animatedStyle,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  /* -------------------- Animations -------------------- */
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 90,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 40,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalCard,
            animatedStyle,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                ...(animatedStyle.transform || []),
              ],
            },
          ]}
        >
          <Pressable onPress={() => { }} style={{ alignItems: "center" }}>
            {/* Handle / Drag Indicator */}
            <View style={styles.dragHandle} />

            {/* Image */}
            <View style={styles.imageWrapper}>
              <View style={styles.glow} />
              <Image
                source={getRoutineImage(task.imageKey)}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Task Info */}
            <View style={styles.info}>
              <Text style={styles.time}>{task.time}</Text>
              <Text style={styles.title}>{task.task}</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.editBtn,
                  pressed && styles.btnPressed,
                ]}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                onPress={onEdit}
              >
                <Text style={styles.actionText}>✏️ Edit</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.deleteBtn,
                  pressed && styles.btnPressed,
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                onPress={onDelete}
              >
                <Text style={styles.deleteText}>🗑️ Delete</Text>
              </Pressable>
            </View>

            {/* Close */}
            <Pressable
              style={styles.closeArea}
              onPress={onClose}
              android_ripple={{ color: "rgba(0,0,0,0.05)" }}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default TaskModal;

/* ========================================================= */
/* ======================   STYLES   ======================= */
/* ========================================================= */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    /* Overlay */
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },

    /* Modal Card */
    modalCard: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.colors.white,
      borderRadius: 28,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      alignItems: "center",

      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15,
          shadowRadius: 22,
        },
        android: {
          elevation: 18,
        },
        web: {
          boxShadow: '0px 12px 22px rgba(0,0,0,0.15)',
        } as any,
      }),
    },

    /* Drag handle */
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: "rgba(0,0,0,0.10)",
      marginBottom: theme.spacing.lg,
    },

    /* Image area */
    imageWrapper: {
      position: "relative",
      marginBottom: theme.spacing.md,
    },

    glow: {
      position: "absolute",
      top: -16,
      left: -16,
      right: -16,
      bottom: -16,
      backgroundColor: `${theme.colors.primary}1A`,
      borderRadius: 100,
      opacity: 0.25,
    },

    image: {
      width: 130,
      height: 130,
    },

    /* Info */
    info: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },

    time: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}15`,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },

    title: {
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },

    description: {
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: theme.colors.secondary,
      opacity: 0.9,
      textAlign: "center",
      lineHeight: 22,
    },

    /* Buttons */
    buttonsRow: {
      flexDirection: "row",
      width: "100%",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },

    actionBtn: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      overflow: "hidden",
    },

    editBtn: {
      backgroundColor: theme.colors.primary,
    },

    deleteBtn: {
      backgroundColor: "#FF3B30",
    },

    actionText: {
      color: theme.colors.white,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
    },

    deleteText: {
      color: theme.colors.white,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
    },

    btnPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.9,
    },

    /* Close */
    closeArea: {
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.lg,
    },

    closeLabel: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
      textAlign: "center",
    },
  });