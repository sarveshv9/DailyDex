import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
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
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

  const [prevVisible, setPrevVisible] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible && prevVisible) {
      setIsExiting(true);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }

  const backdropOpacity = useSharedValue(visible ? 1 : 0);
  const sheetTranslateY = useSharedValue(visible ? 0 : 380);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = 0;
      sheetTranslateY.value = 380;
      backdropOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
      sheetTranslateY.value = withTiming(0, {
        duration: 220,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });
    } else if (isExiting) {
      backdropOpacity.value = withTiming(0, {
        duration: 150,
        easing: Easing.in(Easing.quad),
      });
      sheetTranslateY.value = withTiming(
        380,
        {
          duration: 180,
          easing: Easing.bezier(0.32, 0, 0.67, 0),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsExiting)(false);
          }
        }
      );
    }
  }, [visible, isExiting, backdropOpacity, sheetTranslateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handleClose = () => {
    light();
    onClose();
  };

  const showModal = visible || isExiting;
  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Animated.View style={[shared.modalBackdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, contentContainerStyle, sheetAnimatedStyle]}>
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
        </Animated.View>
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
