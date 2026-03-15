// In app/_layout.tsx

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { ThemeProvider } from "../context/ThemeContext";

// 1. ADD THIS IMPORT
import { useEffect } from "react";
import { AudioProvider } from "../context/AudioContext";
import { TimerProvider } from "../context/TimerContext";
import { requestNotificationPermissions } from "../utils/notifications";

// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Temporary code to clear all data
// AsyncStorage.clear().then(() => console.log('App Data Cleared!'));

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    UbuntuLightI: require("../assets/fonts/Ubuntu-LightItalic.ttf"),
    UbuntuBold: require("../assets/fonts/Ubuntu-Bold.ttf"),
    UbuntuRegular: require("../assets/fonts/Ubuntu-Regular.ttf"),
    UbuntuMedium: require("../assets/fonts/Ubuntu-Medium.ttf"),
  });

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#F5F5F7" }} />;
  }

  return (
    <ThemeProvider>
      {/* 2. WRAP YOUR STACK WITH AUDIOPROVIDER */}
      <AudioProvider>
        <TimerProvider>
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="routine" options={{ headerShown: false }} />
            <Stack.Screen name="setup" options={{ headerShown: false }} />
            <Stack.Screen name="focus" options={{ headerShown: false, presentation: "modal" }} />
          </Stack>
        </TimerProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}