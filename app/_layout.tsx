import "react-native-gesture-handler";
import "../utils/suppressWarnings";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { type Href, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "../context/ThemeContext";

import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AudioProvider } from "../context/AudioContext";
import { SettingsProvider } from "../context/SettingsContext";
import { TimerProvider } from "../context/TimerContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { requestNotificationPermissions } from "../utils/notifications";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTINE_STORAGE_KEY, SETUP_STORAGE_KEY } from "../constants/storageKeys";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";
import { useSettingsStore } from "../stores/settingsStore";
import { useThemeStore } from "../stores/themeStore";

// Prevent splash screen from auto-hiding until initial stores and fonts are ready (native only)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function RootLayoutNav() {
  const [fontsLoaded] = useFonts({
    UbuntuLightI: require("../assets/fonts/Ubuntu-LightItalic.ttf"),
    UbuntuBold: require("../assets/fonts/Ubuntu-Bold.ttf"),
    UbuntuRegular: require("../assets/fonts/Ubuntu-Regular.ttf"),
    UbuntuMedium: require("../assets/fonts/Ubuntu-Medium.ttf"),
  });

  const [themeReady, setThemeReady] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [fallbackTimedOut, setFallbackTimedOut] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized } = useAuth();

  // Theme & settings hydration gate: always sets themeReady(true) in .finally so app never hangs
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      useThemeStore.setState({ isLoaded: true });
      useSettingsStore.setState({ isLoading: false });
      setThemeReady(true);
      if (Platform.OS !== "web") {
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 2000);

    Promise.all([
      useSettingsStore.getState().loadSettings(),
      useThemeStore.getState().loadTheme(),
    ])
      .catch((err) => {
        console.warn("Hydration failed, using fallback theme/settings:", err);
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        useThemeStore.setState({ isLoaded: true });
        useSettingsStore.setState({ isLoading: false });
        setThemeReady(true);
        if (Platform.OS !== "web") {
          SplashScreen.hideAsync().catch(() => {});
        }
      });

    return () => clearTimeout(safetyTimeout);
  }, []);

  // Safety fallback timeout: ensure app can never hang on splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setFallbackTimedOut(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    requestNotificationPermissions()?.catch?.(() => {});
    const checkSetup = async () => {
      try {
        const setup = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
        const routines = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
        const isComplete = setup === "true" || Boolean(routines && routines !== "[]");
        setIsSetupComplete(isComplete);
      } catch {
        setIsSetupComplete(false);
      }
    };
    checkSetup();
  }, []);

  const isAppReady =
    Platform.OS === "web"
      ? true
      : (fontsLoaded && isSetupComplete !== null && initialized && themeReady) ||
        fallbackTimedOut;

  useEffect(() => {
    if (!isAppReady) return;
    if (Platform.OS !== "web") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  useEffect(() => {
    if (!isAppReady) return;

    // Setup routing check — auth is optional, no sign-in gate
    const verifyRouting = async () => {
      const inAuthGroup = (segments[0] as string | undefined) === "(auth)";
      const inTabsGroup = (segments[0] as string | undefined) === "(tabs)";

      // Offline-first routing: If on auth screen, route directly to setup or dashboard
      if (inAuthGroup) {
        try {
          const setup = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
          const routines = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
          const isComplete = setup === "true" || Boolean(routines && routines !== "[]");
          if (!isComplete) {
            router.replace("/setup" as Href);
          } else {
            router.replace("/(tabs)" as Href);
          }
        } catch {
          router.replace("/setup" as Href);
        }
        return;
      }

      // For first-time users, check if setup is complete
      if (!inAuthGroup) {
        try {
          const setup = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
          const routines = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
          const isComplete = setup === "true" || Boolean(routines && routines !== "[]");
          if (!isComplete && inTabsGroup) {
            router.replace("/setup" as Href);
          } else if (isComplete && isSetupComplete === false) {
            setIsSetupComplete(true);
          }
        } catch {
          if (inTabsGroup) {
            router.replace("/setup" as Href);
          }
        }
      }
    };

    verifyRouting();
  }, [isAppReady, segments, session, initialized, isSetupComplete, router]);

  if (!isAppReady) {
    if (Platform.OS === "web") {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3B3B" style={styles.indicator} />
        </View>
      );
    }
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <SettingsProvider>
            <AudioProvider>
              <TimerProvider>
                <StatusBar style="dark" />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
                  <Stack.Screen name="routine" options={{ headerShown: false }} />
                  <Stack.Screen name="setup" options={{ headerShown: false }} />
                  <Stack.Screen name="privacy" options={{ headerShown: false, presentation: "card" }} />
                  <Stack.Screen name="terms" options={{ headerShown: false, presentation: "card" }} />
                  <Stack.Screen name="focus" options={{ headerShown: false, presentation: "modal" }} />
                  <Stack.Screen name="settings" options={{ presentation: "modal", headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
                </Stack>
              </TimerProvider>
            </AudioProvider>
          </SettingsProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  indicator: {
    width: 48,
    height: 48,
  },
});