import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityRole,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Theme, themes } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import { loadStats, UserStats } from "../../utils/stats";
import {
  getRoutineIcon,
  RoutineItem,
  sortRoutineItems,
  timeToMinutes,
  getRoutineItemsForDate
} from "../../utils/utils";

/* ---------- Constants ---------- */
const TASK_THEME_MAP: Record<string, keyof typeof themes> = {
  wakeup: "pikachu",
  water: "squirtle",
  yoga: "bulbasaur",
  tea_journal: "pikachu",
  breakfast: "pikachu",
  study: "pikachu",
  lunch: "squirtle",
  walk: "bulbasaur",
  reflect: "bulbasaur",
  dinner: "squirtle",
  prepare_sleep: "bulbasaur",
  sleep: "squirtle",
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

const getCurrentTask = (
  now: Date,
  routines: RoutineItem[]
): RoutineItem | null => {
  if (routines.length === 0) return null;
  const currentMinutes = (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 + now.getMinutes();

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

const getNextTasks = (
  now: Date,
  routines: RoutineItem[],
  count: number = 5
): RoutineItem[] => {
  if (routines.length === 0) return [];
  const currentMinutes = (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 + now.getMinutes();

  const upcoming = routines.filter(
    (r) => timeToMinutes(r.time) > currentMinutes
  );
  return upcoming.slice(0, count);
};

const getTaskProgress = (
  now: Date,
  routines: RoutineItem[],
  current: RoutineItem | null
): number => {
  if (!current || routines.length === 0) return 0;
  const currentMinutes = (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 + now.getMinutes();
  const currentStart = timeToMinutes(current.time);

  const currentIdx = routines.findIndex((r) => r.id === current.id);
  const nextIdx = currentIdx + 1;
  const nextStart =
    nextIdx < routines.length
      ? timeToMinutes(routines[nextIdx].time)
      : currentStart + 60;

  const elapsed = currentMinutes - currentStart;
  const total = nextStart - currentStart;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, elapsed / total));
};

const formatTaskTime = (timeStr: string): string => {
  const parts = timeStr
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!parts) return timeStr;
  let hours = parseInt(parts[1], 10);
  const minutes = parts[2] || "00";
  const ampm = parts[3];

  if (!ampm) {
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
  const strokeDashoffset =
    circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
const CARD_MAX_WIDTH = Math.min(760, WINDOW_WIDTH - 32);

/* ---------- Styles generator (theme-aware) ---------- */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 120,
    },

    /* Hero header */
    heroBanner: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    headerLeft: {
      flex: 1,
    },
    greeting: {
      fontSize: 26,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.5,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    dateText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    timeDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.5,
    },
    timeText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      opacity: 0.7,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${theme.colors.primary}18`,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    streakText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    progressRingWrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
    progressCount: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    progressLabel: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 3,
    },

    /* Section shared */
    sectionContainer: {
      paddingHorizontal: 16,
      marginBottom: 18,
    },
    sectionLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bold,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 10,
    },

    /* Current Focus Card */
    focusCard: {
      borderRadius: 32,
      backgroundColor: theme.glass.cardBg,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: theme.glows.card.shadowOffset,
          shadowOpacity: theme.glows.card.shadowOpacity,
          shadowRadius: theme.glows.card.shadowRadius,
        },
        android: { elevation: theme.glows.card.elevation },
      }),
    },
    cardBlur: {
      ...StyleSheet.absoluteFillObject,
    },
    cardTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.glass.cardBg,
    },
    focusCardInner: {
      padding: 20,
    },
    /* Top row: icon + text + duration badge */
    focusTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    focusIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
    },
    focusTextCol: {
      flex: 1,
      gap: 2,
    },
    focusTaskName: {
      fontSize: 22,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
    focusDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
    },
    durationBadge: {
      backgroundColor: `${theme.colors.textSecondary}25`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    durationBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    /* Progress section */
    progressSection: {
      marginBottom: 20,
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    progressLabelText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    progressPercent: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    progressBarTrack: {
      width: "100%",
      height: 6,
      borderRadius: 3,
      backgroundColor: `${theme.colors.textSecondary}18`,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    /* Start button */
    primaryButton: {
      width: "100%",
      borderRadius: 50,
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.primary.shadowColor,
          shadowOffset: theme.glows.primary.shadowOffset,
          shadowOpacity: theme.glows.primary.shadowOpacity,
          shadowRadius: theme.glows.primary.shadowRadius,
        },
        android: { elevation: theme.glows.primary.elevation },
      }),
    },
    primaryButtonText: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      letterSpacing: 0.3,
    },

    /* Up Next section */
    upNextList: {
      paddingHorizontal: 16,
      gap: 10,
    },
    upNextCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.glass.cardBg,
      borderRadius: 24,
      paddingVertical: 18,
      paddingHorizontal: 16,
      gap: 14,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: theme.glows.card.shadowOffset,
          shadowOpacity: theme.glows.card.shadowOpacity,
          shadowRadius: theme.glows.card.shadowRadius,
        },
        android: { elevation: theme.glows.card.elevation },
      }),
    },
    upNextIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: `${theme.colors.textSecondary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    upNextInfo: {
      flex: 1,
      gap: 4,
    },
    upNextTaskName: {
      fontSize: 17,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
    upNextTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    upNextTimeText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    emptyUpNext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      opacity: 0.7,
    },



    /* Setup card */
    setupCard: {
      width: "100%",
      borderRadius: 32,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: theme.glows.card.shadowOffset,
          shadowOpacity: theme.glows.card.shadowOpacity,
          shadowRadius: theme.glows.card.shadowRadius,
        },
        android: { elevation: theme.glows.card.elevation },
      }),
    },
    setupCardInner: {
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    setupIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${theme.colors.primary}12`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    setupTitle: {
      fontSize: 24,
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
      marginBottom: 24,
      lineHeight: 21,
      paddingHorizontal: 8,
    },

    /* Accessibility */
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
  const { theme, themeName, setThemeName, isAutoTheme, isDarkMode } =
    useTheme();

  const formattedTime = useMemo(
    () => formatTime(currentTime),
    [currentTime]
  );
  const formattedDate = useMemo(
    () => formatDate(currentTime),
    [currentTime]
  );
  const greeting = useMemo(
    () => getGreeting(currentTime.getHours()),
    [currentTime]
  );
  const greetingEmoji = useMemo(
    () => getGreetingEmoji(currentTime.getHours()),
    [currentTime]
  );
  // Filter today's routines for the day of week
  const todayRoutines = useMemo(() => {
    return getRoutineItemsForDate(routines, currentTime);
  }, [routines, currentTime]);

  const currentTaskItem = useMemo(
    () => getCurrentTask(currentTime, todayRoutines),
    [currentTime, todayRoutines]
  );
  const currentTaskText = currentTaskItem?.task || "🌸 Just Breathe";
  const taskIcon = useMemo(
    () => getRoutineIcon(currentTaskItem?.imageKey),
    [currentTaskItem]
  );
  const nextTasks = useMemo(
    () => getNextTasks(currentTime, todayRoutines, 5),
    [currentTime, todayRoutines]
  );
  const taskProgress = useMemo(
    () => getTaskProgress(currentTime, todayRoutines, currentTaskItem),
    [currentTime, todayRoutines, currentTaskItem]
  );

  // Daily progress
  const todayStr = currentTime.toISOString().split("T")[0];
  const todayTasksDone = userStats?.history?.[todayStr]?.tasks || 0;
  const todayPriorityTodosCount = useMemo(() => {
    return todoTasks.filter((t) => t.category === "today").length;
  }, [todoTasks]);

  const totalIntentions = todayRoutines.length + todayPriorityTodosCount;
  const dailyProgressFraction =
    totalIntentions > 0 ? Math.min(1, todayTasksDone / totalIntentions) : 0;

  const streak = userStats?.currentStreak || 0;

  const styles = useMemo(() => getStyles(theme), [theme]);

  /* sync theme base with task */
  useEffect(() => {
    if (!isAutoTheme || isLoading || !isReady) return;
    const newThemeName =
      TASK_THEME_MAP[currentTaskItem?.imageKey || ""] || "default";
    if (newThemeName !== themeName) {
      setThemeName(String(newThemeName));
    }
  }, [currentTaskItem, setThemeName, themeName, isAutoTheme, isLoading, isReady]);

  /* actions */
  const handleStartDay = useCallback(
    () => router.push("/routine"),
    [router]
  );

  const buttonRole: AccessibilityRole = "button";

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  /* ---------- Setup (no routine) ---------- */
  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(700).delay(120)}
            style={[styles.setupCard, { maxWidth: CARD_MAX_WIDTH }]}
          >
            <BlurView
              intensity={100}
              tint={
                isDarkMode
                  ? "systemThickMaterialDark"
                  : "systemThickMaterialLight"
              }
              style={styles.cardBlur}
              pointerEvents="none"
            />
            <View style={styles.cardTint} />
            <View style={styles.setupCardInner}>
              <View style={styles.setupIconCircle}>
                <Ionicons
                  name="leaf-outline"
                  size={48}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={styles.setupTitle}>Welcome to Zen</Text>
              <Text style={styles.setupSubtitle}>
                Design your daily routine and build mindful habits, one step at
                a time.
              </Text>

              <Pressable
                accessibilityRole={buttonRole}
                accessibilityLabel="Create Routine"
                hitSlop={styles.touchableHitSlop}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                style={({ pressed }) => [
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    width: "100%",
                  },
                  styles.primaryButton,
                ]}
                onPress={() => router.push("/setup")}
              >
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={theme.colors.white}
                />
                <Text style={styles.primaryButtonText}>Create Routine</Text>
              </Pressable>
            </View>
          </Animated.View>
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
        {/* ======= HEADER ======= */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {greeting} {greetingEmoji}
              </Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{formattedDate}</Text>
                <View style={styles.timeDot} />
                <Text style={styles.timeText}>{formattedTime}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.streakBadge}>
                <Ionicons
                  name="flame"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.streakText}>{streak}</Text>
              </View>

              <View style={styles.progressRingWrapper}>
                <ProgressRing
                  progress={dailyProgressFraction}
                  size={52}
                  strokeWidth={4}
                  color={theme.colors.primary}
                  trackColor={`${theme.colors.textSecondary}20`}
                >
                  <Text style={styles.progressCount}>
                    {todayTasksDone}
                  </Text>
                </ProgressRing>
                <Text style={styles.progressLabel}>Today</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ======= CURRENT FOCUS ======= */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(80)}
          style={styles.sectionContainer}
        >
          <Text style={styles.sectionLabel}>Current Focus</Text>
          <View style={styles.focusCard}>
            <BlurView
              intensity={100}
              tint={
                isDarkMode
                  ? "systemThickMaterialDark"
                  : "systemThickMaterialLight"
              }
              style={styles.cardBlur}
              pointerEvents="none"
            />
            <View style={styles.cardTint} />
            <View style={styles.focusCardInner}>
              {/* Top: Icon + Name + Description + Duration */}
              <View style={styles.focusTopRow}>
                <View style={styles.focusIconCircle}>
                  <Ionicons
                    name={taskIcon}
                    size={26}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.focusTextCol}>
                  <Text style={styles.focusTaskName} accessibilityRole="header">
                    {currentTaskText}
                  </Text>
                  {currentTaskItem?.description ? (
                    <Text style={styles.focusDescription} numberOfLines={1}>
                      {currentTaskItem.description}
                    </Text>
                  ) : null}
                </View>
                {currentTaskItem?.duration ? (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>
                      {currentTaskItem.duration} min
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabelText}>Progress</Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(taskProgress * 100)}%
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(taskProgress * 100)}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Start Button */}
              <Pressable
                accessibilityRole={buttonRole}
                accessibilityLabel="Start my day"
                hitSlop={styles.touchableHitSlop}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                style={({ pressed }) => [
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                  styles.primaryButton,
                ]}
                onPress={handleStartDay}
              >
                <Text style={styles.primaryButtonText}>Start My Day</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={theme.colors.white}
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ======= UP NEXT ======= */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(160)}
          style={styles.sectionContainer}
        >
          <Text style={styles.sectionLabel}>Up Next</Text>
          {nextTasks.length > 0 ? (
            <View style={styles.upNextList}>
              {nextTasks.map((task, idx) => (
                <Animated.View
                  key={task.id}
                  entering={FadeInDown.duration(400).delay(idx * 60)}
                >
                  <View style={styles.upNextCard}>
                    <View style={styles.upNextIconCircle}>
                      <Ionicons
                        name={getRoutineIcon(task.imageKey)}
                        size={22}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.upNextInfo}>
                      <Text style={styles.upNextTaskName} numberOfLines={1}>
                        {task.task}
                      </Text>
                      <View style={styles.upNextTimeRow}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.upNextTimeText}>
                          {formatTaskTime(task.time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyUpNext}>
              No more tasks today — you're all done! 🎉
            </Text>
          )}
        </Animated.View>


      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;