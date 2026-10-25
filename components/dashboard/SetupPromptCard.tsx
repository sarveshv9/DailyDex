import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Theme, getSharedStyles } from "../../styles/shared";
import { themeTokens } from "../../constants/themeTokens";

export interface SetupPromptCardProps {
  onStartSetup: () => void;
  maxWidth: number;
  theme: Theme;
  isDarkMode: boolean;
}

const SetupPromptCardComponent: React.FC<SetupPromptCardProps> = ({
  onStartSetup,
  maxWidth,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(700).delay(120)}
        style={[styles.setupCard, { maxWidth }]}
      >
        <BlurView
          intensity={100}
          tint={
            isDarkMode
              ? "systemThickMaterialDark"
              : "systemThickMaterialLight"
          }
          style={styles.blurWrapper}
        >
          <View style={styles.cardTint} />
          <View style={styles.setupCardInner}>
            <View style={styles.setupIconCircle}>
              <Ionicons
                name="leaf-outline"
                size={40}
                color={theme.colors.primaryText}
              />
            </View>

            <Text style={styles.setupTitle}>Welcome to Zen</Text>
            <Text style={styles.setupSubtitle}>
              Design your daily routine and build mindful habits, one step at a
              time.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create Routine"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={onStartSetup}
            >
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.primaryButtonText}>Create Routine</Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

export const SetupPromptCard = React.memo(SetupPromptCardComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    container: {
      ...shared.centeredContainer,
      paddingHorizontal: 20,
    },
    setupCard: {
      width: "100%",
      borderRadius: 32,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
        },
        android: { elevation: 4 },
      }),
    },
    blurWrapper: {
      borderRadius: 32,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      width: "100%",
    },
    cardTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.glass.cardBg,
    },
    setupCardInner: {
      padding: 36,
      alignItems: "center",
      gap: 16,
    },
    setupIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    setupTitle: {
      fontSize: themeTokens.fonts.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textAlign: "center",
      letterSpacing: -0.4,
    },
    setupSubtitle: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 320,
      marginBottom: 12,
    },
    primaryButton: {
      ...shared.primaryButton,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 20,
      width: "100%",
    },
    primaryButtonText: {
      ...shared.primaryButtonText,
      fontSize: themeTokens.fonts.size.md,
    },
  });
};
