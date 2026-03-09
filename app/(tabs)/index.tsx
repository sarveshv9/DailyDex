import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityRole,
  Dimensions,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AiSuggestions from "../../components/AiSuggestions";
import {
  getSharedStyles,
  Theme,
  ThemeName,
  themes,
} from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

/* ---------- Constants & Assets ---------- */
const ROUTINE = [
  { hour: 6, task: "🌞 Wake Up Slowly" },
  { hour: 6.5, task: "💧 Drink Warm Water" },
  { hour: 7, task: "🧘 Light Stretching or Yoga" },
  { hour: 8, task: "🍵 Herbal Tea & Journaling" },
  { hour: 9, task: "🥣 Healthy Breakfast" },
  { hour: 10, task: "📚 Learn Something Calm" },
  { hour: 13, task: "🥗 Light Lunch" },
  { hour: 15, task: "🌿 Nature Walk or Break" },
  { hour: 17, task: "📝 Reflect on the Day" },
  { hour: 19, task: "🍽 Light Dinner" },
  { hour: 21, task: "🌙 Prepare for Sleep" },
  { hour: 22, task: "🛌 Sleep Early" },
];
const REVERSED_ROUTINE = [...ROUTINE].reverse();

const TASK_IMAGES: Record<string, ImageSourcePropType> = {
  "🌞 Wake Up Slowly": require("../assets/images/pixel/wakeup.png"),
  "💧 Drink Warm Water": require("../assets/images/pixel/water.png"),
  "🧘 Light Stretching or Yoga": require("../assets/images/pixel/yoga.png"),
  "🍵 Herbal Tea & Journaling": require("../assets/images/pixel/tea_journal.png"),
  "🥣 Healthy Breakfast": require("../assets/images/pixel/breakfast.png"),
  "📚 Learn Something Calm": require("../assets/images/pixel/study.png"),
  "🥗 Light Lunch": require("../assets/images/pixel/lunch.png"),
  "🌿 Nature Walk or Break": require("../assets/images/pixel/walk.png"),
  "📝 Reflect on the Day": require("../assets/images/pixel/reflect.png"),
  "🍽 Light Dinner": require("../assets/images/pixel/dinner.png"),
  "🌙 Prepare for Sleep": require("../assets/images/pixel/prepare_sleep.png"),
  "🛌 Sleep Early": require("../assets/images/pixel/sleep.png"),
};

const TASK_THEME_MAP: Record<string, keyof typeof themes> = {
  "🌞 Wake Up Slowly": "pikachu",
  "💧 Drink Warm Water": "squirtle",
  "🧘 Light Stretching or Yoga": "dragonite",
  "🍵 Herbal Tea & Journaling": "mew",
  "🥣 Healthy Breakfast": "slowpoke",
  "📚 Learn Something Calm": "psyduck",
  "🥗 Light Lunch": "charizard",
  "🌿 Nature Walk or Break": "bulbasaur",
  "📝 Reflect on the Day": "meowth",
  "🍽 Light Dinner": "jigglypuff",
  "🌙 Prepare for Sleep": "gengar",
  "🛌 Sleep Early": "snorlax",
};

/* ---------- Hooks & Helpers ---------- */
const useCurrentTime = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getCurrentTask = (now: Date): string => {
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return REVERSED_ROUTINE.find((r) => currentHour >= r.hour)?.task || "🌸 Just Breathe";
};

/* ---------- Responsive helpers ---------- */
const { width: WINDOW_WIDTH } = Dimensions.get("window");
const CARD_MAX_WIDTH = Math.min(760, WINDOW_WIDTH - 48);

/* ---------- Styles generator (theme-aware) ---------- */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: "center",
      gap: 18,
    },
    container: {
      width: "100%",
      maxWidth: CARD_MAX_WIDTH,
      alignItems: "center",
    },

    /* Time */
    time: {
      fontSize: Math.max(36, Math.round(WINDOW_WIDTH * 0.12)), // responsive
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
      letterSpacing: -1,
      marginBottom: 8,
      textAlign: "center",
    },
    timeSub: {
      fontSize: 14,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.medium,
      marginTop: 18,
      opacity: 0.9,
    },

    /* Card */
    card: {
      width: "100%",
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 18,
      alignItems: "center",
      marginBottom: 14,
      // cross-platform elevation
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    cardLabel: {
      alignSelf: "flex-start",
      fontSize: 12,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    taskText: {
      fontSize: 18,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 12,
    },

    /* Image area */
    artworkWrapper: {
      width: "100%",
      alignItems: "center",
      marginBottom: 14,
    },
    taskImage: {
      width: Math.min(220, Math.round(WINDOW_WIDTH * 0.45)),
      height: Math.min(260, Math.round(WINDOW_WIDTH * 0.55)),
    },
    fallbackDot: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary,
      opacity: 0.08,
      marginBottom: 12,
    },

    /* Quote */
    quote: {
      fontSize: 15,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.regular,
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: 18,
      opacity: 0.85,
    },

    /* Button */
    primaryButton: {
      width: "100%",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    primaryButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      letterSpacing: 0.2,
    },

    /* Misc */
    suggestionsWrapper: {
      width: "100%",
      marginTop: 10,
    },

    /* Accessibility helpers */
    touchableHitSlop: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    },
  });

/* ---------- Component ---------- */
const SETUP_KEY = "@zen_setup_complete";

function HomeScreen() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const setupComplete = await AsyncStorage.getItem(SETUP_KEY);
        if (!setupComplete) {
          router.replace("/setup");
        } else {
          setIsReady(true);
        }
      } catch (e) {
        setIsReady(true);
      }
    };
    checkSetup();
  }, [router]);

  const currentTime = useCurrentTime();
  const { theme, themeName, setThemeName } = useTheme();

  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const currentTask = useMemo(() => getCurrentTask(currentTime), [currentTime]);
  const taskImage = useMemo(() => TASK_IMAGES[currentTask], [currentTask]);

  const styles = useMemo(() => getStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  /* sync theme base with task */
  useEffect(() => {
    const isLightMode = themeName.startsWith("light-");
    const newBaseTheme = TASK_THEME_MAP[currentTask] || "default";
    let newThemeName: ThemeName = newBaseTheme;
    if (isLightMode && newBaseTheme !== "default") {
      newThemeName = `light-${newBaseTheme}`;
    }
    const currentBaseTheme = isLightMode ? themeName.substring(6) : themeName;
    if (newBaseTheme !== currentBaseTheme) {
      setThemeName(newThemeName);
    }
  }, [currentTask, setThemeName, themeName]);

  /* breathing animation */
  const breatheScale = useSharedValue(1);
  useEffect(() => {
    breatheScale.value = withRepeat(
      withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breatheScale]);
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
  }));

  /* actions */
  const handleStartDay = useCallback(() => router.push("/routine"), [router]);

  /* accessibility roles */
  const buttonRole: AccessibilityRole = "button";

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
      >
        <View style={styles.container}>
          <Animated.View entering={FadeIn.duration(600)}>
            <Text style={styles.timeSub} aria-hidden>
              {new Date().toLocaleDateString()}
            </Text>
            <Text
              style={styles.time}
              accessibilityLabel={`Current time ${formattedTime}`}
              accessible
            >
              {formattedTime}
            </Text>

          </Animated.View>

          <Animated.View entering={FadeIn.duration(700).delay(120)} style={styles.card}>
            <Text style={styles.cardLabel}>Current Focus</Text>
            <Text style={styles.taskText} accessibilityRole="header">
              {currentTask}
            </Text>

            <View style={styles.artworkWrapper} accessible accessibilityLabel={currentTask}>
              {taskImage ? (
                <Animated.Image
                  source={taskImage}
                  style={[styles.taskImage, animatedImageStyle]}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.fallbackDot} />
              )}
            </View>

            <Text style={styles.quote}>"Start your day with calm"</Text>

            <Pressable
              accessibilityRole={buttonRole}
              accessibilityLabel="Start my day"
              hitSlop={styles.touchableHitSlop}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              style={({ pressed }) => [
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.995 : 1 }],
                },
                styles.primaryButton,
              ]}
              onPress={handleStartDay}
            >
              <Text style={styles.primaryButtonText}>Start My Day</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.suggestionsWrapper}>
            <AiSuggestions currentTask={currentTask} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;