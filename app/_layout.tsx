import "../utils/suppressWarnings";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { ThemeProvider } from "../context/ThemeContext";

import { useEffect, useState } from "react";
import { AudioProvider } from "../context/AudioContext";
import { SettingsProvider } from "../context/SettingsContext";
import { TimerProvider } from "../context/TimerContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { requestNotificationPermissions } from "../utils/notifications";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import AsyncStorage from '@react-native-async-storage/async-storage';

function RootLayoutNav() {
  const [fontsLoaded] = useFonts({
    UbuntuLightI: require("../assets/fonts/Ubuntu-LightItalic.ttf"),
    UbuntuBold: require("../assets/fonts/Ubuntu-Bold.ttf"),
    UbuntuRegular: require("../assets/fonts/Ubuntu-Regular.ttf"),
    UbuntuMedium: require("../assets/fonts/Ubuntu-Medium.ttf"),
  });

  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized } = useAuth();

  useEffect(() => {
    requestNotificationPermissions();
    const checkSetup = async () => {
      try {
        const setup = await AsyncStorage.getItem("@zen_setup_complete");
        setIsSetupComplete(setup === "true");
      } catch (e) {
        setIsSetupComplete(false);
      }
    };
    checkSetup();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || isSetupComplete === null || !initialized) return;
    
    // Setup routing check — auth is optional, no sign-in gate
    const verifyRouting = async () => {
      const inAuthGroup = segments[0] === ("(auth)" as any);
      const inTabsGroup = segments[0] === "(tabs)";

      // If user is on auth page but already signed in, redirect out
      if (session && inAuthGroup) {
        try {
          const setup = await AsyncStorage.getItem("@zen_setup_complete");
          if (setup !== "true") {
            router.replace("/setup" as any);
          } else {
            router.replace("/(tabs)" as any);
          }
        } catch (e) {
          router.replace("/setup" as any);
        }
        return;
      }

      // For first-time users, check if setup is complete
      if (!inAuthGroup) {
        try {
          const setup = await AsyncStorage.getItem("@zen_setup_complete");
          if (setup !== "true" && inTabsGroup) {
            router.replace("/setup" as any);
          } else if (setup === "true" && isSetupComplete === false) {
            setIsSetupComplete(true);
          }
        } catch (e) {
          if (inTabsGroup) {
            router.replace("/setup" as any);
          }
        }
      }
    };
    
    verifyRouting();
  }, [fontsLoaded, isSetupComplete, segments, session, initialized]);

  if (!fontsLoaded || isSetupComplete === null || !initialized) {
    return <View style={{ flex: 1, backgroundColor: "#F5F5F7" }} />;
  }

  return (
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
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}