import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TaskModal from "../../components/dashboard/TaskModal";
import { TodayHeader } from "../../components/dashboard/TodayHeader";
import { FocusHeroCard } from "../../components/dashboard/FocusHeroCard";
import { UpNextSection } from "../../components/dashboard/UpNextSection";
import { SetupPromptCard } from "../../components/dashboard/SetupPromptCard";
import { useAppTheme } from "../../stores/themeStore";
import { useTheme } from "../../context/ThemeContext";
import {
  STORAGE_KEYS,
  SETUP_STORAGE_KEY,
  ROUTINE_STORAGE_KEY,
  TASKS_STORAGE_KEY,
} from "../../constants/storageKeys";
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
import { themes } from "../../styles/shared";

type IoniconName = keyof typeof Ionicons.glyphMap;

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

/** Force the outline variant so stroke weight matches across every icon. */
const toOutline = (name: string): IoniconName => {
  if (name.endsWith("-outline") || name.endsWith("-sharp")) return name as IoniconName;
  const outlined = `${name}-outline`;
  return (outlined in Ionicons.glyphMap ? outlined : name) as IoniconName;
};

/* ---------- Hooks & Helpers ---------- */
const useCurrentMinute = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    const now = new Date();
    // Calculate ms remaining to next :00 minute boundary
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeoutId = setTimeout(() => {
      setTime(new Date());
      intervalId = setInterval(() => {
        setTime(new Date());
      }, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  return time;
};

const formatTaskTime = (timeStr: string): string => {
  const parts = timeStr
    ? timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/)
    : null;
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

interface ScheduleStatus {
  activeTask: RoutineItem | null;
  nextTask: RoutineItem | null;
  progress: number;
  isBetween: boolean;
}

const getScheduleStatus = (
  now: Date,
  routines: RoutineItem[]
): ScheduleStatus => {
  if (routines.length === 0) {
    return { activeTask: null, nextTask: null, progress: 0, isBetween: false };
  }

  const currentMinutes =
    (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 +
    now.getMinutes();

  let activeIndex = -1;

  for (let i = 0; i < routines.length; i++) {
    const rStart = timeToMinutes(routines[i].time);
    const rDuration = routines[i].duration || 30;
    const rEnd = rStart + rDuration;

    if (currentMinutes >= rStart && currentMinutes < rEnd) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex !== -1) {
    const active = routines[activeIndex];
    const startM = timeToMinutes(active.time);
    const dur = active.duration || 30;
    const progress = Math.min(1, Math.max(0, (currentMinutes - startM) / dur));
    const next =
      activeIndex + 1 < routines.length ? routines[activeIndex + 1] : null;

    return {
      activeTask: active,
      nextTask: next,
      progress,
      isBetween: false,
    };
  }

  let nextIndex = -1;
  for (let i = 0; i < routines.length; i++) {
    const rStart = timeToMinutes(routines[i].time);
    if (rStart > currentMinutes) {
      nextIndex = i;
      break;
    }
  }

  if (nextIndex !== -1) {
    return {
      activeTask: null,
      nextTask: routines[nextIndex],
      progress: 0,
      isBetween: true,
    };
  }

  return {
    activeTask: null,
    nextTask: null,
    progress: 1,
    isBetween: true,
  };
};

const getNextTasks = (
  now: Date,
  routines: RoutineItem[],
  limit = 5
): RoutineItem[] => {
  const currentMinutes =
    (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 +
    now.getMinutes();

  const upcoming = routines.filter(
    (r) => timeToMinutes(r.time) > currentMinutes
  );
  return upcoming.slice(0, limit);
};

/* ---------- Responsive helpers ---------- */
const { width: WINDOW_WIDTH } = Dimensions.get("window");
const CARD_MAX_WIDTH = Math.min(760, WINDOW_WIDTH - 32);

/* ---------- Component ---------- */
const SETUP_KEY = SETUP_STORAGE_KEY;

function HomeScreen() {
  const router = useRouter();
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
      const routineData = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);

      if (routineData) {
        try {
          const parsedRoutines = JSON.parse(routineData);
          if (Array.isArray(parsedRoutines) && parsedRoutines.length > 0) {
            setRoutines(sortRoutineItems(parsedRoutines));
            setIsReady(true);
            if (!setupComplete) {
              await AsyncStorage.setItem(SETUP_KEY, "true");
            }
          } else {
            setIsReady(false);
          }
        } catch (err) {
          console.error("Failed to parse routines:", err);
          setIsReady(false);
        }
      } else {
        setIsReady(false);
      }

      try {
        const todoData =
          (await AsyncStorage.getItem(TASKS_STORAGE_KEY)) ||
          (await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_TASKS));
        if (todoData) {
          const parsedTodos = JSON.parse(todoData);
          if (Array.isArray(parsedTodos)) {
            setTodoTasks(parsedTodos);
          }
        }
      } catch (todoErr) {
        console.warn("Failed to parse todo tasks:", todoErr);
      }

      const statsData = await loadStats();
      setUserStats(statsData);
    } catch {
      setIsReady(false);
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  const currentMinuteTime = useCurrentMinute();
  const { theme, isDarkMode } = useAppTheme();
  const { themeName, setThemeName, isAutoTheme } = useTheme();

  // Filter today's routines for the day of week
  const todayRoutines = useMemo(() => {
    return getRoutineItemsForDate(routines, currentMinuteTime);
  }, [routines, currentMinuteTime]);

  const scheduleStatus = useMemo(
    () => getScheduleStatus(currentMinuteTime, todayRoutines),
    [currentMinuteTime, todayRoutines]
  );

  const isBetween = scheduleStatus.isBetween;
  const currentTaskItem = scheduleStatus.activeTask || scheduleStatus.nextTask;
  const currentTaskText = isBetween
    ? scheduleStatus.nextTask
      ? `Next: ${scheduleStatus.nextTask.task}`
      : "Mindful Pause"
    : scheduleStatus.activeTask?.task || "Just Breathe";

  const currentTaskDesc = isBetween
    ? scheduleStatus.nextTask
      ? `Starts at ${formatTaskTime(scheduleStatus.nextTask.time)}`
      : "All rituals completed for today"
    : scheduleStatus.activeTask
    ? `Started at ${formatTaskTime(scheduleStatus.activeTask.time)}`
    : "";

  const taskIcon = useMemo(
    () => toOutline(getRoutineIcon(currentTaskItem?.imageKey || "breathe")),
    [currentTaskItem]
  );

  const nextTasks = useMemo(
    () => getNextTasks(currentMinuteTime, todayRoutines, 5),
    [currentMinuteTime, todayRoutines]
  );
  const taskProgress = scheduleStatus.progress;

  // Daily progress
  const todayStr = currentMinuteTime.toISOString().split("T")[0];
  const todayTasksDone = userStats?.history?.[todayStr]?.tasks || 0;
  const todayPriorityTodosCount = useMemo(() => {
    return todoTasks.filter((t) => t.category === "today").length;
  }, [todoTasks]);

  const totalIntentions = todayRoutines.length + todayPriorityTodosCount;
  const dailyProgressFraction =
    totalIntentions > 0 ? Math.min(1, todayTasksDone / totalIntentions) : 0;

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
          duration: (currentTaskItem.duration || 25) * 60,
        },
      });
    }
  }, [currentTaskItem, router]);

  const handlePressUpcoming = useCallback((task: RoutineItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTask(task);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTask(null);
  }, []);

  const handleStartSetup = useCallback(() => {
    router.push("/setup");
  }, [router]);

  const persistRoutines = useCallback(
    async (updated: RoutineItem[]) => {
      setRoutines(updated);
      try {
        await AsyncStorage.setItem(
          ROUTINE_STORAGE_KEY,
          JSON.stringify(updated)
        );
        scheduleRoutineNotifications(updated);
      } catch (e) {
        console.error("Failed to save routines", e);
      }
    },
    []
  );

  const handleSaveTask = useCallback(
    (updatedTask: RoutineItem) => {
      const originalTask = routines.find((item) => item.id === updatedTask.id);
      if (!originalTask) return;

      const doFinalSave = () => {
        const newRoutines = routines.map((item) =>
          item.id === updatedTask.id ? updatedTask : item
        );
        persistRoutines(newRoutines);
      };

      const isRepeating =
        originalTask.daysOfWeek && originalTask.daysOfWeek.length > 0;

      if (isRepeating) {
        if (Platform.OS === "web") {
          const wantsThisDayOnly = window.confirm(
            "Do you want to apply these changes to THIS DATE ONLY? (Cancel to apply to ALL days)"
          );
          if (wantsThisDayOnly) {
            const dateStr = getDateString(currentMinuteTime);
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
            "Repeating Task",
            "Do you want to apply these changes to all repeating days, or just this date?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "This date only",
                onPress: () => {
                  const dateStr = getDateString(currentMinuteTime);
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
    [routines, persistRoutines, currentMinuteTime]
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
          const dateStr = getDateString(currentMinuteTime);
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
                const dateStr = getDateString(currentMinuteTime);
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
  }, [selectedTask, routines, persistRoutines, handleCloseModal, currentMinuteTime]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.indicator} />
      </View>
    );
  }

  /* ---------- Setup (no routine) ---------- */
  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <SetupPromptCard
          onStartSetup={handleStartSetup}
          maxWidth={CARD_MAX_WIDTH}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </SafeAreaView>
    );
  }

  /* ---------- Main Home Dashboard ---------- */
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
        <TodayHeader
          currentTime={currentMinuteTime}
          todayTasksDone={todayTasksDone}
          totalIntentions={totalIntentions}
          dailyProgressFraction={dailyProgressFraction}
          theme={theme}
          isDarkMode={isDarkMode}
        />

        {/* ======= CURRENT FOCUS HERO CARD ======= */}
        <FocusHeroCard
          currentTaskItem={currentTaskItem}
          currentTaskText={currentTaskText}
          currentTaskDesc={currentTaskDesc}
          taskIcon={taskIcon}
          taskProgress={taskProgress}
          hasActiveTask={Boolean(scheduleStatus.activeTask)}
          hasNextTask={Boolean(scheduleStatus.nextTask)}
          onOpenFocus={handleOpenFocus}
          onOpenTimeline={handleOpenTimeline}
          theme={theme}
          isDarkMode={isDarkMode}
        />

        {/* ======= UP NEXT QUEUE ======= */}
        <UpNextSection
          tasks={nextTasks}
          onSelectTask={handlePressUpcoming}
          onOpenRoutineTimeline={handleOpenTimeline}
          theme={theme}
          isDarkMode={isDarkMode}
        />
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

const getStyles = (theme: { colors: { background: string } }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 110,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    indicator: {
      width: 48,
      height: 48,
    },
  });

export default HomeScreen;