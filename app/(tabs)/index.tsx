import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityRole,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
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
import TaskModal from "../../components/dashboard/TaskModal";
import { useTheme } from "../../context/ThemeContext";
import { useTimer } from "../../context/TimerContext";
import { Theme, themes } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { scheduleRoutineNotifications } from "../../utils/notifications";
import { loadStats, UserStats } from "../../utils/stats";
import {
  getDateString,
  getRoutineIcon,
  getRoutineItemsForDate,
  RoutineItem,
  sortRoutineItems,
  timeToMinutes,
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

/* ---------- Icon system ----------
   One rule for the whole screen: every icon is an Ionicons *outline* glyph,
   colored with theme.colors.primary (or textSecondary when decorative),
   sitting in the same rounded-square tile tinted from the primary color.
   The old per-category rainbow (CATEGORY_TINTS) is gone on purpose.        */
type IoniconName = keyof typeof Ionicons.glyphMap;

/** Force the outline variant so stroke weight matches across every icon. */
const toOutline = (name: string): IoniconName => {
  if (name.endsWith("-outline") || name.endsWith("-sharp")) return name as IoniconName;
  const outlined = `${name}-outline`;
  return (outlined in Ionicons.glyphMap ? outlined : name) as IoniconName;
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

interface GreetingDetails {
  text: string;
  icon: IoniconName;
}

const getGreetingDetails = (hour: number): GreetingDetails => {
  if (hour < 5) return { text: "Good Night", icon: "moon-outline" };
  if (hour < 12) return { text: "Good Morning", icon: "sunny-outline" };
  if (hour < 17) return { text: "Good Afternoon", icon: "partly-sunny-outline" };
  if (hour < 21) return { text: "Good Evening", icon: "cloudy-night-outline" };
  return { text: "Good Night", icon: "moon-outline" };
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

interface ScheduleStatus {
  isBetween: boolean;
  activeTask: RoutineItem | null;
  nextTask: RoutineItem | null;
  progress: number;
}

const getScheduleStatus = (
  now: Date,
  routines: RoutineItem[]
): ScheduleStatus => {
  if (routines.length === 0) {
    return { isBetween: false, activeTask: null, nextTask: null, progress: 0 };
  }

  const currentMinutes = (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 + now.getMinutes();

  let active: RoutineItem | null = null;
  let nextUpcoming: RoutineItem | null = null;

  for (let i = 0; i < routines.length; i++) {
    const rStart = timeToMinutes(routines[i].time);
    const rDuration = routines[i].duration || 30;
    const rEnd = rStart + rDuration;

    if (currentMinutes >= rStart && currentMinutes < rEnd) {
      active = routines[i];
    } else if (currentMinutes < rStart && !nextUpcoming) {
      nextUpcoming = routines[i];
    }
  }

  if (active) {
    const startM = timeToMinutes(active.time);
    const dur = active.duration || 30;
    const progress = Math.min(1, Math.max(0, (currentMinutes - startM) / dur));
    return {
      isBetween: false,
      activeTask: active,
      nextTask: nextUpcoming,
      progress,
    };
  }

  // If not currently inside a task duration, we are between tasks
  if (nextUpcoming) {
    return {
      isBetween: true,
      activeTask: null,
      nextTask: nextUpcoming,
      progress: 0,
    };
  }

  return {
    isBetween: true,
    activeTask: null,
    nextTask: null,
    progress: 1,
  };
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
  size = 52,
  strokeWidth = 4.5,
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
const getStyles = (theme: Theme, isDarkMode: boolean) => {
  // Single tint used by every icon tile: primary color at ~11% (light) / ~16% (dark).
  const tileBg = `${theme.colors.primary}${theme.glass?.iconTintAlpha ?? (isDarkMode ? "29" : "1C")
    }`;
  const neutralFill = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const activeTint = `${theme.colors.primary}18`;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 110,
    },

    /* Header */
    heroBanner: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {
      flex: 1,
      gap: 3,
    },
    greetingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
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
      gap: 6,
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
      opacity: 0.4,
      marginHorizontal: 1,
    },
    timeText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
      marginBottom: 20,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    sectionLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bold,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },

    /* Current Focus Card */
    focusCard: {
      borderRadius: 28,
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
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
    cardTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.glass.cardBg,
    },
    focusCardInner: {
      padding: 20,
      zIndex: 1,
    },
    /* Top row: icon + text + duration badge */
    focusTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
    },
    /* Shared icon tile: rounded square, tinted from primary, no border */
    focusIconSquircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    focusTextCol: {
      flex: 1,
      gap: 3,
    },
    focusTaskName: {
      fontSize: 20,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.3,
    },
    focusDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
      lineHeight: 18,
    },
    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: neutralFill,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    durationBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      letterSpacing: 0.3,
    },
    focusTopActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    focusTimerIconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: neutralFill,
    },
    activeTimerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: activeTint,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },
    activeTimerText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    /* Progress section */
    progressSection: {
      marginBottom: 18,
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
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    progressBarTrack: {
      width: "100%",
      height: 7,
      borderRadius: 3.5,
      backgroundColor: neutralFill,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3.5,
      backgroundColor: theme.colors.primary,
    },
    /* Primary Action Button */
    primaryButton: {
      height: 56,
      width: "100%",
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.5 : 0.3,
          shadowRadius: 16,
        },
        android: { elevation: 6 },
      }),
    },
    primaryButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      letterSpacing: 0.3,
    },
    timelineLink: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 4,
    },
    timelineLinkText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
    },

    /* Up Next section */
    upNextList: {
      gap: 10,
    },
    upNextCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.glass.cardBg,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      paddingVertical: 14,
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
    upNextIconSquircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    upNextInfo: {
      flex: 1,
      gap: 4,
    },
    upNextTaskName: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
    upNextMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    durationChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: neutralFill,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    upNextDurationText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    timeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: neutralFill,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    timeBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: 0.2,
    },

    /* Empty state */
    emptyCardContainer: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
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
    emptyCardInner: {
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: "center",
      zIndex: 1,
    },
    emptyIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: 16,
      paddingHorizontal: 12,
    },
    emptyActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: tileBg,
    },
    emptyActionText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },

    /* Setup card */
    setupCard: {
      width: "100%",
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
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
    setupCardInner: {
      paddingVertical: 36,
      paddingHorizontal: 24,
      alignItems: "center",
      zIndex: 1,
    },
    setupIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: tileBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
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
      marginBottom: 28,
      lineHeight: 22,
      paddingHorizontal: 12,
    },

    /* Accessibility */
    touchableHitSlop: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    },
  });
};

/* ---------- Component ---------- */
const SETUP_KEY = "@zen_setup_complete";

function HomeScreen() {
  const router = useRouter();
  const timer = useTimer();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedTask, setSelectedTask] = useState<RoutineItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
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

      const todoData =
        (await AsyncStorage.getItem("@zen_tasks")) ||
        (await AsyncStorage.getItem("@todo_tasks"));
      if (todoData) {
        setTodoTasks(JSON.parse(todoData));
      }

      const statsData = await loadStats();
      setUserStats(statsData);
    } catch (e) {
      setIsReady(false);
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

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
  const greetingInfo = useMemo(
    () => getGreetingDetails(currentTime.getHours()),
    [currentTime]
  );

  // Filter today's routines for the day of week
  const todayRoutines = useMemo(() => {
    return getRoutineItemsForDate(routines, currentTime);
  }, [routines, currentTime]);

  const scheduleStatus = useMemo(
    () => getScheduleStatus(currentTime, todayRoutines),
    [currentTime, todayRoutines]
  );

  const isBetween = scheduleStatus.isBetween;
  const currentTaskItem = scheduleStatus.activeTask || scheduleStatus.nextTask;
  const currentTaskText = isBetween
    ? (scheduleStatus.nextTask ? `Next: ${scheduleStatus.nextTask.task}` : "Mindful Pause")
    : (scheduleStatus.activeTask?.task || "Just Breathe");

  const currentTaskDesc = isBetween
    ? (scheduleStatus.nextTask ? `Starts at ${formatTaskTime(scheduleStatus.nextTask.time)}` : "All rituals completed for today")
    : (scheduleStatus.activeTask ? `Started at ${formatTaskTime(scheduleStatus.activeTask.time)}` : "");

  // FIX: use the task actually shown in the card (active OR next), so
  // "Next: Sleep" gets the sleep icon instead of the "breathe" leaf fallback.
  const taskIcon = useMemo(
    () => toOutline(getRoutineIcon(currentTaskItem?.imageKey || "breathe")),
    [currentTaskItem]
  );

  const nextTasks = useMemo(
    () => getNextTasks(currentTime, todayRoutines, 5),
    [currentTime, todayRoutines]
  );
  const taskProgress = scheduleStatus.progress;

  // Daily progress
  const todayStr = currentTime.toISOString().split("T")[0];
  const todayTasksDone = userStats?.history?.[todayStr]?.tasks || 0;
  const todayPriorityTodosCount = useMemo(() => {
    return todoTasks.filter((t) => t.category === "today").length;
  }, [todoTasks]);

  const totalIntentions = todayRoutines.length + todayPriorityTodosCount;
  const dailyProgressFraction =
    totalIntentions > 0 ? Math.min(1, todayTasksDone / totalIntentions) : 0;

  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  /* sync theme base with task */
  useEffect(() => {
    if (!isAutoTheme || isLoading || !isReady) return;
    const newThemeName =
      TASK_THEME_MAP[currentTaskItem?.imageKey || ""] || "default";
    if (newThemeName !== themeName) {
      setThemeName(String(newThemeName));
    }
  }, [currentTaskItem, setThemeName, themeName, isAutoTheme, isLoading, isReady]);

  const isCurrentTimer = Boolean(currentTaskItem && timer.taskId === currentTaskItem.id);
  const isTimerActive = isCurrentTimer && timer.isActive;

  /* Primary CTA action: Defaults to timeline */
  const handleOpenTimeline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/routine" as any);
  }, [router]);

  /* Focus Timer icon button action */
  const handleOpenFocus = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentTaskItem) {
      router.push({
        pathname: "/focus" as any,
        params: {
          taskId: currentTaskItem.id,
          taskName: currentTaskItem.task,
          duration: currentTaskItem.duration ? String(currentTaskItem.duration) : undefined,
        },
      });
    } else {
      router.push("/focus" as any);
    }
  }, [currentTaskItem, router]);

  const handleToggleTimer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timer.isActive) {
      timer.pauseTimer();
    } else {
      timer.resumeTimer();
    }
  }, [timer]);

  const formatTimerSeconds = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handlePressUpcoming = useCallback((task: RoutineItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTask(task);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTask(null);
  }, []);

  const persistRoutines = useCallback(async (updatedList: RoutineItem[]) => {
    try {
      const sorted = sortRoutineItems(updatedList);
      setRoutines(sorted);
      await AsyncStorage.setItem("@zen_routine", JSON.stringify(sorted));
      await scheduleRoutineNotifications(sorted);


    } catch (err) {
      console.error("Failed to persist routines from home dashboard:", err);
    }
  }, []);

  const handleSaveTask = useCallback(
    (updatedTask: RoutineItem) => {
      const originalTask = routines.find((i) => i.id === updatedTask.id);
      if (!originalTask) return;

      const isDifferent =
        originalTask.time !== updatedTask.time ||
        originalTask.task !== updatedTask.task ||
        originalTask.duration !== updatedTask.duration;
      const isRepeating =
        originalTask.daysOfWeek && originalTask.daysOfWeek.length > 0;

      const doFinalSave = () => {
        const updated = routines.map((item) =>
          item.id === updatedTask.id ? updatedTask : item
        );
        persistRoutines(updated);
      };

      if (isRepeating && isDifferent) {
        if (Platform.OS === "web") {
          const wantsInstance = window.confirm(
            "Do you want to save this change for THIS DATE ONLY? (Cancel saves for ALL days)"
          );
          if (wantsInstance) {
            const dateStr = getDateString(currentTime);
            const newItem: RoutineItem = {
              ...updatedTask,
              id: Date.now().toString(),
              parentId: originalTask.id,
              daysOfWeek: [],
              date: dateStr,
            };
            persistRoutines([...routines, newItem]);
            return;
          }
        } else {
          Alert.alert(
            "Edit Repeating Task",
            "Do you want to save this change for this specific date only, or update the task for all days?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "This date only",
                onPress: () => {
                  const dateStr = getDateString(currentTime);
                  const newItem: RoutineItem = {
                    ...updatedTask,
                    id: Date.now().toString(),
                    parentId: originalTask.id,
                    daysOfWeek: [],
                    date: dateStr,
                  };
                  persistRoutines([...routines, newItem]);
                },
              },
              { text: "All days", style: "destructive", onPress: doFinalSave },
            ]
          );
          return;
        }
      }
      doFinalSave();
    },
    [routines, persistRoutines, currentTime]
  );

  const handleDeleteTask = useCallback(() => {
    if (!selectedTask) return;
    const taskToDelete = selectedTask;
    const taskNameLower = taskToDelete.task?.toLowerCase().trim();
    if (taskNameLower === "wake up" || taskNameLower === "sleep") return;

    const isRepeating =
      taskToDelete.daysOfWeek && taskToDelete.daysOfWeek.length > 0;

    if (isRepeating) {
      if (Platform.OS === "web") {
        const wantsSkip = window.confirm(
          "Do you want to SKIP this task for THIS DATE ONLY? (Cancel to delete for ALL days)"
        );
        if (wantsSkip) {
          const dateStr = getDateString(currentTime);
          const newItem: RoutineItem = {
            ...taskToDelete,
            id: Date.now().toString(),
            parentId: taskToDelete.id,
            isSkipped: true,
            daysOfWeek: [],
            date: dateStr,
          };
          persistRoutines([...routines, newItem]);
          handleCloseModal();
          return;
        }
      } else {
        Alert.alert(
          "Delete Repeating Task",
          "Do you want to delete this task for all repeating days, or just skip it on this date?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Skip this date",
              onPress: () => {
                const dateStr = getDateString(currentTime);
                const newItem: RoutineItem = {
                  ...taskToDelete,
                  id: Date.now().toString(),
                  parentId: taskToDelete.id,
                  isSkipped: true,
                  daysOfWeek: [],
                  date: dateStr,
                };
                persistRoutines([...routines, newItem]);
                handleCloseModal();
              },
            },
            {
              text: "Delete all days",
              style: "destructive",
              onPress: () => {
                persistRoutines(
                  routines.filter((item) => item.id !== taskToDelete.id)
                );
                setTimeout(() => handleCloseModal(), 50);
              },
            },
          ]
        );
        return;
      }
    }

    if (Platform.OS === "web") {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${taskToDelete.task}?`
      );
      if (confirmDelete) {
        persistRoutines(routines.filter((item) => item.id !== taskToDelete.id));
        setTimeout(() => handleCloseModal(), 50);
      }
    } else {
      Alert.alert(
        "Delete Routine",
        `Are you sure you want to delete ${taskToDelete.task}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              persistRoutines(
                routines.filter((item) => item.id !== taskToDelete.id)
              );
              setTimeout(() => handleCloseModal(), 50);
            },
          },
        ]
      );
    }
  }, [selectedTask, routines, persistRoutines, handleCloseModal, currentTime]);

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
              style={{ borderRadius: 32, overflow: "hidden", width: "100%" }}
            >
              <View style={styles.cardTint} />
              <View style={styles.setupCardInner}>
                <View style={styles.setupIconCircle}>
                  <Ionicons
                    name="leaf-outline"
                    size={40}
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
                    styles.primaryButton,
                    {
                      opacity: pressed ? 0.92 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => router.push("/setup")}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={20}
                    color={theme.colors.white}
                  />
                  <Text style={styles.primaryButtonText}>Create Routine</Text>
                </Pressable>
              </View>
            </BlurView>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- Main Home Dashboard ---------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ======= HEADER & DAILY PROGRESS ======= */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.headerLeft}>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>{greetingInfo.text}</Text>
                {/* Plain neutral glyph: decoration, so no tile and no color */}
                <Ionicons
                  name={greetingInfo.icon}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{formattedDate}</Text>
                <View style={styles.timeDot} />
                <Text style={styles.timeText}>{formattedTime}</Text>
              </View>
            </View>

            {/* Daily Dashboard Completion Ring */}
            <View
              style={styles.headerRight}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`Today's progress: ${todayTasksDone} of ${totalIntentions} rituals completed`}
            >
              <View style={styles.progressRingWrapper}>
                <ProgressRing
                  progress={dailyProgressFraction}
                  size={52}
                  strokeWidth={4.5}
                  color={theme.colors.primary}
                  trackColor={
                    isDarkMode
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)"
                  }
                >
                  <Text style={styles.progressCount}>
                    {todayTasksDone}
                  </Text>
                </ProgressRing>
                <Text style={styles.progressLabel}>
                  {totalIntentions > 0 ? `${todayTasksDone}/${totalIntentions}` : "Today"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ======= CURRENT FOCUS HERO CARD ======= */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(80)}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Current Focus</Text>
          </View>

          <View style={styles.focusCard}>
            <BlurView
              intensity={100}
              tint={
                isDarkMode
                  ? "systemThickMaterialDark"
                  : "systemThickMaterialLight"
              }
              style={{ borderRadius: 28, overflow: "hidden" }}
            >
              <View style={styles.cardTint} />
              <View style={styles.focusCardInner}>
                {/* Top: Icon + Name + Description + Duration + Focus Timer Button */}
                <View style={styles.focusTopRow}>
                  <View style={styles.focusIconSquircle}>
                    <Ionicons
                      name={taskIcon}
                      size={26}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.focusTextCol}>
                    <Text
                      style={styles.focusTaskName}
                      numberOfLines={1}
                      accessibilityRole="header"
                    >
                      {currentTaskText}
                    </Text>
                    {currentTaskDesc ? (
                      <Text style={styles.focusDescription} numberOfLines={1}>
                        {currentTaskDesc}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.focusTopActions}>
                    {currentTaskItem?.duration ? (
                      <View style={styles.durationBadge}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.durationBadgeText}>
                          {currentTaskItem.duration}m
                        </Text>
                      </View>
                    ) : null}

                    {currentTaskItem ? (
                      isCurrentTimer && timer.timeLeft > 0 ? (
                        <Pressable
                          onPress={handleOpenFocus}
                          hitSlop={6}
                          style={styles.activeTimerBadge}
                          accessibilityLabel="View Active Focus Timer"
                        >
                          <Ionicons
                            name={isTimerActive ? "pulse" : "pause"}
                            size={12}
                            color={theme.colors.primary}
                          />
                          <Text style={styles.activeTimerText}>
                            {formatTimerSeconds(timer.timeLeft)}
                          </Text>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleTimer();
                            }}
                            hitSlop={6}
                          >
                            <Ionicons
                              name={isTimerActive ? "pause-circle" : "play-circle"}
                              size={16}
                              color={theme.colors.primary}
                            />
                          </Pressable>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.focusTimerIconButton}
                          onPress={handleOpenFocus}
                          hitSlop={8}
                          accessibilityLabel="Start Focus Timer"
                        >
                          <Ionicons
                            name="timer-outline"
                            size={18}
                            color={theme.colors.primary}
                          />
                        </Pressable>
                      )
                    ) : null}
                  </View>
                </View>

                {/* Progress Bar & Indicators */}
                <View
                  style={styles.progressSection}
                  accessible={true}
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Progress: ${Math.round(taskProgress * 100)} percent`}
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(taskProgress * 100) }}
                >
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

                {/* Main CTA Button: Default redirect to timeline */}
                <Pressable
                  accessibilityRole={buttonRole}
                  accessibilityLabel="View day timeline"
                  hitSlop={styles.touchableHitSlop}
                  android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      opacity: pressed ? 0.92 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={handleOpenTimeline}
                >
                  <Text style={styles.primaryButtonText}>
                    {scheduleStatus.activeTask
                      ? "View Day Timeline"
                      : scheduleStatus.nextTask
                        ? "Start My Day"
                        : "View Day Timeline"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={theme.colors.white}
                  />
                </Pressable>

              </View>
            </BlurView>
          </View>
        </Animated.View>

        {/* ======= UP NEXT QUEUE ======= */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(160)}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Up Next</Text>
          </View>

          {nextTasks.length > 0 ? (
            <View style={styles.upNextList}>
              {nextTasks.map((task, idx) => (
                <Animated.View
                  key={task.id}
                  entering={FadeInDown.duration(400).delay(idx * 50)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.upNextCard,
                      pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                    ]}
                    onPress={() => handlePressUpcoming(task)}
                    accessibilityRole="button"
                    accessibilityLabel={`${task.task} at ${formatTaskTime(task.time)}${task.duration ? `, ${task.duration} minutes` : ""}`}
                  >
                    <View style={styles.upNextIconSquircle}>
                      <Ionicons
                        name={toOutline(getRoutineIcon(task.imageKey))}
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.upNextInfo}>
                      <Text style={styles.upNextTaskName} numberOfLines={1}>
                        {task.task}
                      </Text>
                      {task.duration ? (
                        <View style={styles.upNextMetaRow}>
                          <View style={styles.durationChip}>
                            <Ionicons
                              name="hourglass-outline"
                              size={11}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.upNextDurationText}>
                              {task.duration}m
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.timeBadge}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.timeBadgeText}>
                        {formatTaskTime(task.time)}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCardContainer}>
              <BlurView
                intensity={80}
                tint={
                  isDarkMode
                    ? "systemThickMaterialDark"
                    : "systemThickMaterialLight"
                }
                style={{ borderRadius: 24, overflow: "hidden" }}
              >
                <View style={styles.cardTint} />
                <View style={styles.emptyCardInner}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="sparkles-outline"
                      size={26}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>All Caught Up For Today</Text>
                  <Text style={styles.emptySubtitle}>
                    You have finished all scheduled rituals for today. Take time to relax, breathe, and recharge.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View full routine timeline"
                    style={styles.emptyActionButton}
                    onPress={() => router.push("/routine" as any)}
                    hitSlop={styles.touchableHitSlop}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.emptyActionText}>View Full Timeline</Text>
                  </Pressable>
                </View>
              </BlurView>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        onClose={handleCloseModal}
        onEdit={() => {}}
        onSaveTask={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </SafeAreaView>
  );
}

export default HomeScreen;