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
  View,
  ActivityIndicator
} from "react-native";
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  Theme,
  themes
} from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import { getRoutineIcon, RoutineItem, sortRoutineItems, timeToMinutes } from "../../utils/utils";
import { loadStats, UserStats } from "../../utils/stats";

/* ---------- Constants & Assets ---------- */
const TASK_THEME_MAP: Record<string, keyof typeof themes> = {
  "wakeup": "pikachu",
  "water": "squirtle",
  "yoga": "bulbasaur",
  "tea_journal": "pikachu",
  "breakfast": "pikachu",
  "study": "pikachu",
  "lunch": "squirtle",
  "walk": "bulbasaur",
  "reflect": "bulbasaur",
  "dinner": "squirtle",
  "prepare_sleep": "bulbasaur",
  "sleep": "squirtle",
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

const getGreeting = (hour: number): string => {
  if (hour < 5) return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
};

const getGreetingEmoji = (hour: number): string => {
  if (hour < 5) return "🌙";
  if (hour < 12) return "☀️";
  if (hour < 17) return "🌤️";
  if (hour < 21) return "🌅";
  return "🌙";
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
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
    return routines[routines.length - 1];
  }

  return current;
};

const getNextTasks = (now: Date, routines: RoutineItem[], count: number = 3): RoutineItem[] => {
  if (routines.length === 0) return [];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming = routines.filter((r) => timeToMinutes(r.time) > currentMinutes);
  return upcoming.slice(0, count);
};

const getTaskProgress = (now: Date, routines: RoutineItem[], current: RoutineItem | null): number => {
  if (!current || routines.length === 0) return 0;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentStart = timeToMinutes(current.time);

  const currentIdx = routines.findIndex((r) => r.id === current.id);
  const nextIdx = currentIdx + 1;
  const nextStart = nextIdx < routines.length
    ? timeToMinutes(routines[nextIdx].time)
    : currentStart + 60; // default 60min slot

  const elapsed = currentMinutes - currentStart;
  const total = nextStart - currentStart;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, elapsed / total));
};

const formatTaskTime = (timeStr: string): string => {
  const parts = timeStr.trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!parts) return timeStr;
  let hours = parseInt(parts[1], 10);
  const minutes = parts[2] || "00";
  const ampm = parts[3];

  if (!ampm) {
    // 24h format
    const suffix = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${suffix}`;
  }
  return `${hours}:${minutes} ${ampm}`;
};

/* ---------- Progress Ring Component ---------- */
const ProgressRing = ({
  progress,
  size = 64,
  strokeWidth = 5,
  color,
  trackColor,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
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
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: "center",
      gap: 16,
      paddingBottom: 100,
    },
    container: {
      width: "100%",
      maxWidth: CARD_MAX_WIDTH,
      gap: 16,
    },

    /* Header */
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerLeft: {
      flex: 1,
    },
    greeting: {
      fontSize: 28,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.5,
    },
    dateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      marginTop: 4,
    },
    timeText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      marginTop: 2,
      opacity: 0.7,
    },
    progressRingWrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
    progressLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    progressCount: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* Current Focus card */
    card: {
      width: "100%",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 16,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    cardBlur: {
      ...StyleSheet.absoluteFillObject,
    },
    cardTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.glass.cardBg,
    },
    cardInner: {
      padding: 18,
    },
    cardLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    focusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    focusImageWrap: {
      width: 100,
      height: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    focusImage: {
      width: 100,
      height: 110,
    },
    focusContent: {
      flex: 1,
      gap: 8,
    },
    taskText: {
      fontSize: 20,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      lineHeight: 26,
    },
    progressBarTrack: {
      width: "100%",
      height: 6,
      borderRadius: 3,
      backgroundColor: `${theme.colors.textSecondary}20`,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    progressBarLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
    },
    fallbackDot: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      opacity: 0.1,
    },

    /* Start button */
    primaryButton: {
      width: "100%",
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    primaryButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      letterSpacing: 0.2,
    },

    /* Up Next card */
    upNextCard: {
      width: "100%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.glass.shadowOpacity * 0.6,
          shadowRadius: 10,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    upNextInner: {
      padding: 16,
    },
    upNextLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    upNextItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 12,
    },
    upNextSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${theme.colors.textSecondary}18`,
    },
    upNextTime: {
      fontSize: 13,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
      width: 72,
    },
    upNextDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
      opacity: 0.5,
    },
    upNextTask: {
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: theme.fonts.medium,
      flex: 1,
    },
    emptyUpNext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 8,
      opacity: 0.7,
    },

    /* Setup card (unchanged behavior) */
    setupCard: {
      width: "100%",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: "center",
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    setupTitle: {
      fontSize: 22,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      textAlign: "center",
      marginBottom: 8,
    },
    setupSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 20,
    },
    setupImage: {
      width: Math.min(180, Math.round(WINDOW_WIDTH * 0.38)),
      height: Math.min(200, Math.round(WINDOW_WIDTH * 0.42)),
      marginBottom: 20,
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
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

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
            } else {
              setIsReady(false);
            }
          } else {
            setIsReady(false);
          }

          const todoData = await AsyncStorage.getItem("@todo_tasks");
          if (todoData) {
            setTodoTasks(JSON.parse(todoData));
          }
          
          const statsData = await loadStats();
          setUserStats(statsData);
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
  const { theme, themeName, setThemeName, isAutoTheme, isDarkMode } = useTheme();

  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedDate = useMemo(() => formatDate(currentTime), [currentTime]);
  const greeting = useMemo(() => getGreeting(currentTime.getHours()), [currentTime]);
  const greetingEmoji = useMemo(() => getGreetingEmoji(currentTime.getHours()), [currentTime]);
  const currentTaskItem = useMemo(() => getCurrentTask(currentTime, routines), [currentTime, routines]);
  const currentTaskText = currentTaskItem?.task || "🌸 Just Breathe";
  const taskIcon = useMemo(() => getRoutineIcon(currentTaskItem?.imageKey), [currentTaskItem]);
  const nextTasks = useMemo(() => getNextTasks(currentTime, routines, 3), [currentTime, routines]);
  const taskProgress = useMemo(
    () => getTaskProgress(currentTime, routines, currentTaskItem),
    [currentTime, routines, currentTaskItem]
  );

  // Filter today's routines for the day of week
  const todayRoutines = useMemo(() => {
    const today = currentTime.getDay(); // 0 = Sunday
    return routines.filter((r) => {
      if (!r.daysOfWeek || r.daysOfWeek.length === 0) return true;
      return r.daysOfWeek.includes(today);
    });
  }, [routines, currentTime]);

  // Daily progress: tasks done today vs total intentions
  const todayTasksDone = useMemo(() => {
    const todayStr = currentTime.toISOString().split("T")[0];
    return userStats?.history?.[todayStr]?.tasks || 0;
  }, [userStats, currentTime]);

  // Include priority todos in the daily progress denominator
  const todayPriorityTodosCount = useMemo(() => {
    return todoTasks.filter((t) => t.category === "today").length;
  }, [todoTasks]);

  const totalIntentions = todayRoutines.length + todayPriorityTodosCount;

  const dailyProgressFraction = totalIntentions > 0
    ? todayTasksDone / totalIntentions
    : 0;

  const styles = useMemo(() => getStyles(theme), [theme]);

  /* sync theme base with task */
  useEffect(() => {
    if (!isAutoTheme || isLoading || !isReady) return;
    const newThemeName = TASK_THEME_MAP[currentTaskItem?.imageKey || ""] || "default";
    if (newThemeName !== themeName) {
      setThemeName(String(newThemeName));
    }
  }, [currentTaskItem, setThemeName, themeName, isAutoTheme, isLoading, isReady]);

  /* actions */
  const handleStartDay = useCallback(() => router.push("/routine"), [router]);

  /* accessibility roles */
  const buttonRole: AccessibilityRole = "button";

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  /* ---------- Setup (no routine) ---------- */
  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(700).delay(120)} style={styles.setupCard}>
              <BlurView intensity={100} tint={isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={styles.cardBlur} pointerEvents="none" />
              <View style={styles.cardTint} />
              <Text style={styles.setupTitle}>Welcome to Zen</Text>
              <Text style={styles.setupSubtitle}>
                Design your daily routine and build mindful habits, one step at a time.
              </Text>

              <Ionicons
                name="book-outline"
                size={80}
                color={theme.colors.primary}
                style={{ marginBottom: 20 }}
              />

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

  /* ---------- Main Home ---------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
      >
        <View style={styles.container}>
          {/* ---- Header: Greeting + Progress Ring ---- */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {greeting} {greetingEmoji}
              </Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>

            <View style={styles.progressRingWrapper}>
              <ProgressRing
                progress={dailyProgressFraction}
                size={58}
                strokeWidth={5}
                color={theme.colors.primary}
                trackColor={`${theme.colors.textSecondary}20`}
              >
                <Text style={styles.progressCount}>
                  {todayTasksDone}
                </Text>
              </ProgressRing>
              <Text style={styles.progressLabel}>Today</Text>
            </View>
          </Animated.View>

          {/* ---- Current Focus Card ---- */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.card}>
            <BlurView intensity={100} tint={isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={styles.cardBlur} pointerEvents="none" />
            <View style={styles.cardTint} />
            <View style={styles.cardInner}>
              <Text style={styles.cardLabel}>Current Focus</Text>

              <View style={styles.focusRow}>
                <View style={styles.focusImageWrap}>
                  <Ionicons 
                    name={taskIcon} 
                    size={64} 
                    color={theme.colors.primary} 
                  />
                </View>

                <View style={styles.focusContent}>
                  <Text style={styles.taskText} accessibilityRole="header">
                    {currentTaskText}
                  </Text>
                  <View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.round(taskProgress * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressBarLabel}>
                      {Math.round(taskProgress * 100)}% through session
                    </Text>
                  </View>
                </View>
              </View>

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
            </View>
          </Animated.View>

          {/* ---- Up Next ---- */}
          <Animated.View entering={FadeInDown.duration(600).delay(220)} style={styles.upNextCard}>
            <BlurView intensity={100} tint={isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={styles.cardBlur} pointerEvents="none" />
            <View style={styles.cardTint} />
            <View style={styles.upNextInner}>
              <Text style={styles.upNextLabel}>Up Next</Text>
              {nextTasks.length > 0 ? (
                nextTasks.map((task, idx) => (
                  <React.Fragment key={task.id}>
                    {idx > 0 && <View style={styles.upNextSeparator} />}
                    {/* Staggered entrance animation removed from static list items to reduce visual noise */}
                    <View style={styles.upNextItem}>
                      <Text style={styles.upNextTime}>{formatTaskTime(task.time)}</Text>
                      <View style={styles.upNextDot} />
                      <Text style={styles.upNextTask} numberOfLines={1}>
                        {task.task}
                      </Text>
                    </View>
                  </React.Fragment>
                ))
              ) : (
                <Text style={styles.emptyUpNext}>
                  No more tasks today — you're all done! 🎉
                </Text>
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;