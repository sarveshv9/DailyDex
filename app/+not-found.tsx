import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import { Theme } from "../styles/shared";
import * as Haptics from "../utils/haptics";

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleReturnHome = () => {
    if (settings.hapticsEnabled)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Luminous Logo Squircle */}
            <View style={styles.iconCircle}>
              <Ionicons
                name="compass-outline"
                size={36}
                color={theme.colors.primary}
              />
            </View>

            <Text style={styles.title}>Page Not Found</Text>
            <Text style={styles.subtitle}>
              The screen you are looking for doesn't exist or may have been moved.
            </Text>

            {/* Standard Primary CTA Button (height: 56, borderRadius: 22, glowing drop shadow) */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryCtaButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleReturnHome}
              accessibilityRole="button"
              accessibilityLabel="Return to home dashboard"
            >
              <Ionicons
                name="home-outline"
                size={20}
                color={theme.colors.white}
              />
              <Text style={styles.primaryCtaText}>Return Home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: theme.colors.card,
      borderRadius: 28,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
    },
    title: {
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    primaryCtaButton: {
      width: "100%",
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    primaryCtaText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      letterSpacing: -0.2,
    },
  });
