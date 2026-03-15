import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityRole,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
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
import AiSuggestions from "../../components/dashboard/AiSuggestions";
import {
  getSharedStyles,
  Theme,
  themes
} from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import { getRoutineImage, RoutineItem, sortRoutineItems, timeToMinutes } from "../../utils/utils";

/* ---------- Constants & Assets ---------- */
const TASK_THEME_MAP: Record<string, keyof typeof themes> = {
  "wakeup": "pikachu",
  "water": "squirtle",
  "yoga": "dragonite",
  "tea_journal": "mew",
  "breakfast": "slowpoke",
  "study": "psyduck",
  "lunch": "charizard",
  "walk": "bulbasaur",
  "reflect": "meowth",
  "dinner": "jigglypuff",
  "prepare_sleep": "gengar",
  "sleep": "snorlax",
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

const getCurrentTask = (now: Date, routines: RoutineItem[]): RoutineItem | null => {
  if (routines.length === 0) return null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let current = routines[0];
  for (let i = 0; i < routines.length; i++) {
    const rMinutes = timeToMinutes(routines[i].time);
    if (currentMinutes >= rMinutes) {
      current = routines[i];
    }
  }

  const firstMinutes = timeToMinutes(routines[0].time);
  if (currentMinutes < firstMinutes) {
    return routines[routines.length - 1]; // Before first task, use last task of previous day
  }

  return current;
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
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      letterSpacing: -1,
      marginBottom: 8,
      textAlign: "center",
    },
    timeSub: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      marginTop: 18,
      opacity: 0.9,
    },

    /* Card */
    card: {
      width: "100%",
      backgroundColor: theme.colors.card,
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
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    taskText: {
      fontSize: 18,
      color: theme.colors.text,
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
      color: theme.colors.textSecondary,
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
  const [isLoading, setIsLoading] = useState(true);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const checkSetup = async () => {
        try {
          const setupComplete = await AsyncStorage.getItem(SETUP_KEY);
          if (setupComplete) {
            const routineData = await AsyncStorage.getItem("@zen_routine");
            if (routineData) {
              const parsedRoutines = JSON.parse(routineData);
              setRoutines(sortRoutineItems(parsedRoutines));
              setIsReady(true);
              return;
            }
          }
          setIsReady(false);
        } catch (e) {
          setIsReady(false);
        } finally {
          setIsLoading(false);
        }
      };
      checkSetup();
    }, [])
  );

  const currentTime = useCurrentTime();
  const { theme, themeName, setThemeName, isAutoTheme } = useTheme();

  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const currentTaskItem = useMemo(() => getCurrentTask(currentTime, routines), [currentTime, routines]);
  const currentTaskText = currentTaskItem?.task || "🌸 Just Breathe";
  const taskImage = useMemo(() => getRoutineImage(currentTaskItem?.imageKey), [currentTaskItem]);

  const styles = useMemo(() => getStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  /* sync theme base with task */
  useEffect(() => {
    if (!isAutoTheme || isLoading || !isReady) return;

    // Auto sync just matches the pokemon enum now.
    // Dark mode state is independently handled in ThemeContext and layout.
    const newThemeName = TASK_THEME_MAP[currentTaskItem?.imageKey || ""] || "default";

    if (newThemeName !== themeName) {
      setThemeName(String(newThemeName)); // newThemeName is a valid ThemeName
    }
  }, [currentTaskItem, setThemeName, themeName, isAutoTheme, isLoading, isReady]);


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

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(700).delay(120)} style={styles.card}>
              <Text style={styles.cardLabel}>Welcome to Zen</Text>
              <Text style={styles.taskText} accessibilityRole="header">
                Setup Your Routine
              </Text>

              <View style={styles.artworkWrapper} accessible accessibilityLabel="Setup your routine">
                <Image
                  source={require("../../assets/images/pixel/study.png")}
                  style={styles.taskImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>

              <Text style={styles.quote}>&quot;A peaceful day begins with a plan.&quot;</Text>

              <Pressable
                accessibilityRole={buttonRole}
                accessibilityLabel="Create Routine"
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
                onPress={() => router.push("/setup")}
              >
                <Text style={styles.primaryButtonText}>Create Routine</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    );
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
              {currentTaskText}
            </Text>

            <View style={styles.artworkWrapper} accessible accessibilityLabel={currentTaskText}>
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

            <Text style={styles.quote}>&quot;Start your day with calm&quot;</Text>

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
            <AiSuggestions currentTask={currentTaskText} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;