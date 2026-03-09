// In app/_layout.tsx

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { ThemeProvider } from "../context/ThemeContext";

// 1. ADD THIS IMPORT
import { AudioProvider } from "../context/AudioContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    UbuntuLightI: require("./assets/fonts/Ubuntu-LightItalic.ttf"),
    UbuntuBold: require("./assets/fonts/Ubuntu-Bold.ttf"),
    UbuntuRegular: require("./assets/fonts/Ubuntu-Regular.ttf"),
    UbuntuMedium: require("./assets/fonts/Ubuntu-Medium.ttf"),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#F5F5F7" }} />;
  }

  return (
    <ThemeProvider>
      {/* 2. WRAP YOUR STACK WITH AUDIOPROVIDER */}
      <AudioProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="routine" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ headerShown: false }} />
        </Stack>
      </AudioProvider>
    </ThemeProvider>
  );
}