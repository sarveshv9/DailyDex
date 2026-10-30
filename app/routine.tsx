import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { DayTimelineView, TASK_COLORS } from "../components/dashboard/DayTimelineView";
import { TaskForm } from "../components/dashboard/TaskForm";
import TaskModal from "../components/dashboard/TaskModal";
import { RoutineConfirmModal } from "../components/routine/RoutineConfirmModal";
import { RoutineDayList } from "../components/routine/RoutineDayList";
import { RoutinePeekBar } from "../components/routine/RoutinePeekBar";
import { ROUTINE_STORAGE_KEY } from "../constants/storageKeys";
import { themeTokens } from "../constants/themeTokens";
import { useTheme } from "../context/ThemeContext";
import { Theme } from "../styles/shared";
import * as Haptics from "../utils/haptics";
import { scheduleRoutineNotifications } from "../utils/notifications";
import {
  addMinutesToTime,
  FormData,
  getDateString,
  getRoutineItemsForDate,
  guessRoutineIconKey,
  ICON_MAP,
  RoutineItem,
  sortRoutineItems,
  timeToMinutes,
} from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */

/* Initial routine preserved */
const INITIAL_ROUTINE: RoutineItem[] = [
  { id: "1", time: "6:00 AM", task: "Wake Up", description: "Start your day with a clear mind.", imageKey: "wakeup", insertionOrder: 1, duration: 45 },
  { id: "2", time: "6:30 AM", task: "Hydrate", description: "Refresh your body with water.", imageKey: "water", insertionOrder: 2, duration: 5 },
  { id: "3", time: "7:00 AM", task: "Stretch", description: "Gentle movement to wake up your muscles.", imageKey: "yoga", insertionOrder: 3, duration: 20 },
  { id: "4", time: "8:00 AM", task: "Tea Time", description: "A moment of calm and reflection.", imageKey: "tea_journal", insertionOrder: 4, duration: 15 },
  { id: "5", time: "9:00 AM", task: "Breakfast", description: "Nourish your body for the day ahead.", imageKey: "breakfast", insertionOrder: 5, duration: 40 },
  { id: "6", time: "10:00 AM", task: "Study", description: "Focus on learning and growth.", imageKey: "study", insertionOrder: 6, duration: 120 },
  { id: "7", time: "1:00 PM", task: "Lunch", description: "Pause and refuel for the afternoon.", imageKey: "lunch", insertionOrder: 7, duration: 45 },
  { id: "8", time: "3:00 PM", task: "Walk", description: "Step outside and connect with nature.", imageKey: "walk", insertionOrder: 8, duration: 30 },
  { id: "9", time: "5:00 PM", task: "Reflect", description: "Acknowledge your progress and intentions.", imageKey: "reflect", insertionOrder: 9, duration: 15 },
  { id: "10", time: "7:00 PM", task: "Dinner", description: "Enjoy a mindful meal with loved ones.", imageKey: "dinner", insertionOrder: 10, duration: 45 },
  { id: "11", time: "9:00 PM", task: "Wind Down", description: "Slow down and prepare for rest.", imageKey: "prepare_sleep", insertionOrder: 11, duration: 60 },
  { id: "12", time: "10:00 PM", task: "Sleep", description: "Rest deeply and recharge.", imageKey: "sleep", insertionOrder: 12, duration: 480 },
];

const STORAGE_KEY = ROUTINE_STORAGE_KEY;

/* -------------------- Screen Component -------------------- */
export default function RoutineScreen() {
  const { theme } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(16, insets.bottom + 8);
  const tabBarWidth = Math.min(SCREEN_WIDTH * 0.9, 440);
  const styles = useMemo(() => getCachedStyles(theme), [theme]);

  const [isAdjacentPagesLoaded, setIsAdjacentPagesLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAdjacentPagesLoaded(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const [allRoutines, setAllRoutines] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<RoutineItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ time: "", task: "", description: "", daysOfWeek: [] });
  const [nextInsertionOrder, setNextInsertionOrder] = useState(13);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [confirmState, setConfirmState] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Transfer",
    action: () => {},
  });

  const requestConfirm = useCallback((title: string, message: string, confirmText: string, action: () => void) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', confirmText],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title,
          message,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            action();
          }
        }
      );
    } else {
      setConfirmState({ visible: true, title, message, confirmText, action });
    }
  }, []);

  // Stable 3-slot page array: [prev, center, next]
  const [pageDates, setPageDates] = useState<[Date, Date, Date]>(() => {
    const c = new Date();
    const p = new Date(c); p.setDate(p.getDate() - 1);
    const n = new Date(c); n.setDate(n.getDate() + 1);
    return [p, c, n];
  });

  const activeDate = useMemo(() => selectedDate || new Date(), [selectedDate]);

  const routineItems = useMemo(() => {
    return getRoutineItemsForDate(allRoutines, activeDate);
  }, [allRoutines, activeDate]);

  const sortedDayTasks = useMemo(() => {
    return [...routineItems].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [routineItems]);

  const nextTask = useMemo(() => {
    if (sortedDayTasks.length === 0) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const isToday = selectedDate ? getDateString(selectedDate) === getDateString(now) : true;
    if (isToday) {
      const upcoming = sortedDayTasks.find(t => timeToMinutes(t.time) >= currentMins && !t.completed);
      if (upcoming) return upcoming;
    }
    return sortedDayTasks.find(t => !t.completed) || sortedDayTasks[0];
  }, [sortedDayTasks, selectedDate]);

  const nextTaskBadgeColor = nextTask?.imageKey
    ? (TASK_COLORS[nextTask.imageKey] ?? theme.colors.primary)
    : theme.colors.primary;

  const nextTaskIcon = nextTask?.imageKey
    ? (ICON_MAP[nextTask.imageKey] ?? "alarm-outline")
    : (sortedDayTasks.length > 0 ? "checkmark-circle-outline" : "calendar-outline");

  const [pagerHeight, setPagerHeight] = useState(0);

  // Animation for the detail list expansion
  const [listAnim] = useState(() => new Animated.Value(1));
  const [listOpen, setListOpen] = useState(true);

  const openList = useCallback(() => {
    setListOpen(true);
    Animated.spring(listAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 12,
    }).start();
  }, [listAnim]);

  const closeList = useCallback(() => {
    Animated.spring(listAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start(() => setListOpen(false));
  }, [listAnim]);

  const toggleList = useCallback(() => {
    if (listOpen) closeList();
    else openList();
  }, [listOpen, openList, closeList]);

  const [scrollY] = useState(() => new Animated.Value(0));
  // Horizontal pager offset — starts at 0 (center panel)
  const [pagerX] = useState(() => new Animated.Value(0));
  const pagerTranslateX = useMemo(
    () =>
      pagerX.interpolate({
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: [-2 * SCREEN_WIDTH, -SCREEN_WIDTH, 0],
      }),
    [pagerX, SCREEN_WIDTH]
  );

  const shiftDate = useCallback((delta: number) => {
    Haptics.selectionAsync();
    setPageDates(prev => {
      if (delta === 1) {
        const newRight = new Date(prev[2]); newRight.setDate(newRight.getDate() + 1);
        return [prev[1], prev[2], newRight];
      } else {
        const newLeft = new Date(prev[0]); newLeft.setDate(newLeft.getDate() - 1);
        return [newLeft, prev[0], prev[1]];
      }
    });
    setSelectedDate(prev => {
      const d = new Date(prev || new Date());
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  useLayoutEffect(() => {
    pagerX.setValue(0);
  }, [pageDates, pagerX]);

  // PanResponder for native gesture handling - created once with referentially stable dependencies
  const pagerPanResponder = useMemo(
    () =>
      Platform.OS === 'web'
        ? { panHandlers: {} }
        : PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, g) => {
              return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
            },
            onMoveShouldSetPanResponder: (_, g) => {
              return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
            },
            onPanResponderMove: (_, g) => {
              if (!isAdjacentPagesLoaded) {
                setIsAdjacentPagesLoaded(true);
              }
              if (Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8) {
                pagerX.setValue(g.dx);
              }
            },
            onPanResponderRelease: (_, g) => {
              const LEFT = g.dx < -60 || g.vx < -0.8;
              const RIGHT = g.dx > 60 || g.vx > 0.8;
              if (LEFT || RIGHT) {
                const screenWidth = Dimensions.get('window').width;
                const target = LEFT ? -screenWidth : screenWidth;
                Animated.timing(pagerX, {
                  toValue: target,
                  duration: 220,
                  useNativeDriver: true,
                }).start(() => {
                  shiftDate(LEFT ? 1 : -1);
                });
              } else {
                Animated.spring(pagerX, {
                  toValue: 0,
                  useNativeDriver: true,
                  tension: 80,
                  friction: 12,
                }).start();
              }
            },
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdjacentPagesLoaded, shiftDate]
  );

  const listHeaderPanResponder = useMemo(
    () =>
      Platform.OS === 'web'
        ? { panHandlers: {} }
        : PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
            onPanResponderRelease: (_, g) => {
              if (g.dy > 50 || g.vy > 1) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                closeList();
              }
            },
          }),
    [closeList]
  );

  const collapsedPanResponder = useMemo(
    () =>
      Platform.OS === 'web'
        ? { panHandlers: {} }
        : PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => g.dy < -8,
            onPanResponderRelease: (_, g) => {
              if (g.dy < -20 || g.vy < -0.5) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openList();
              }
            },
          }),
    [openList]
  );

  const overlayTop = insets.top + 148;

  const listTranslateY = listAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const collapsedPillOpacity = listAnim.interpolate({
    inputRange: [0, 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const collapsedPillTranslateY = listAnim.interpolate({
    inputRange: [0, 0.25],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });

  const listOpacity = listAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });

  /* -------------------- Per-day items helper -------------------- */
  const getItemsForDate = useCallback((date: Date) => {
    const items = getRoutineItemsForDate(allRoutines, date);
    const sorted = sortRoutineItems(items);

    const all: { minutes: number; type: 'routine'; data: RoutineItem }[] = [
      ...sorted.map(r => ({ minutes: timeToMinutes(r.time), type: 'routine' as const, data: r })),
    ].sort((a, b) => a.minutes - b.minutes);
    return all;
  }, [allRoutines]);

  const centerPageItems = useMemo(() => {
    return getItemsForDate(pageDates[1]);
  }, [getItemsForDate, pageDates]);

  const prevPageItems = useMemo(() => {
    return isAdjacentPagesLoaded ? getItemsForDate(pageDates[0]) : [];
  }, [getItemsForDate, pageDates, isAdjacentPagesLoaded]);

  const nextPageItems = useMemo(() => {
    return isAdjacentPagesLoaded ? getItemsForDate(pageDates[2]) : [];
  }, [getItemsForDate, pageDates, isAdjacentPagesLoaded]);

  const allPageItems = useMemo(
    () => [prevPageItems, centerPageItems, nextPageItems] as const,
    [prevPageItems, centerPageItems, nextPageItems]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollY.setValue(y);
      if (y < -60 && listOpen) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        closeList();
      }
    },
    [scrollY, listOpen, closeList]
  );

  /* -------------------- Data Fetching -------------------- */
  const loadData = useCallback(async () => {
    try {
      let finalRoutines: RoutineItem[] | null = null;
      let localRoutines: RoutineItem[] | null = null;

      const localDataStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (localDataStr) {
        try {
          localRoutines = JSON.parse(localDataStr);
        } catch {
          // ignore parsing error
        }
      }

      if (localRoutines && localRoutines.length > 0) {
        finalRoutines = localRoutines;
      }

      if (!finalRoutines || finalRoutines.length === 0) {
        finalRoutines = INITIAL_ROUTINE.map(item => {
          const isDaily = item.task.toLowerCase() === "sleep" || item.task.toLowerCase() === "wake up";
          return { ...item, daysOfWeek: isDaily ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()] };
        });

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalRoutines));
      }

      setAllRoutines(finalRoutines);
      setNextInsertionOrder(finalRoutines.length > 0 ? Math.max(...finalRoutines.map((i: RoutineItem) => i.insertionOrder || 0)) + 1 : 1);

    } catch (e) {
      console.error("Failed to load routines.", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveRoutines = useCallback(async (newItems: RoutineItem[]) => {
    try {
      setAllRoutines(newItems);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      await scheduleRoutineNotifications(newItems);
    } catch (e) {
      console.error("Failed to save routines.", e);
    }
  }, []);

  /* -------------------- Handlers -------------------- */
  const openModal = useCallback((task: RoutineItem) => {
    setSelectedTask(task);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTask(null);
  }, []);

  const openForm = useCallback((item?: RoutineItem, customSuggestedTime?: string) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        time: item.time,
        task: item.task,
        description: item.description,
        daysOfWeek: item.daysOfWeek || [],
        date: item.date,
        duration: item.duration || 30,
        imageKey: item.imageKey,
        subtasks: item.subtasks || []
      });
    } else {
      setEditingId(null);
      const targetDate = selectedDate || new Date();
      let defaultTime = customSuggestedTime;
      if (!defaultTime) {
        const dayTasks = getRoutineItemsForDate(allRoutines, targetDate);
        if (dayTasks.length > 0) {
          const sorted = sortRoutineItems(dayTasks);
          const last = sorted[sorted.length - 1];
          if (last && last.time) {
            defaultTime = addMinutesToTime(last.time, last.duration || 30);
          }
        }
        if (!defaultTime) {
          const now = new Date();
          const mins = now.getMinutes();
          const roundedMins = Math.ceil(mins / 15) * 15;
          now.setMinutes(roundedMins, 0, 0);
          defaultTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }

      setFormData({
        time: defaultTime,
        task: "",
        description: "",
        daysOfWeek: [],
        date: getDateString(targetDate),
        duration: 30,
        subtasks: []
      });
    }
    setFormVisible(true);
  }, [selectedDate, allRoutines]);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingId(null);
    setFormData({ time: "", task: "", description: "", daysOfWeek: [], date: "", subtasks: [] });
  }, []);

  const handleSaveAndAddAnother = useCallback(() => {
    const { time, task, description, daysOfWeek, duration, date, subtasks, imageKey } = formData;
    if (!time.trim() || !task.trim()) {
      Alert.alert("Missing Information", "Please enter a task name and time.");
      return;
    }

    const finalDays = (daysOfWeek || []).sort();
    const finalDate = (finalDays.length > 0) ? undefined : date;

    const newItem: RoutineItem = {
      id: Date.now().toString(),
      time: time.trim(),
      task: task.trim(),
      description: description.trim(),
      imageKey: (imageKey && imageKey !== "breathe") ? imageKey : guessRoutineIconKey(task.trim()),
      insertionOrder: nextInsertionOrder,
      daysOfWeek: finalDays,
      date: finalDate,
      duration: duration || 30,
      subtasks: subtasks || [],
    };

    saveRoutines([...allRoutines, newItem]);
    setNextInsertionOrder(prev => prev + 1);

    const nextTime = addMinutesToTime(time.trim(), duration || 30);
    setFormData({
      time: nextTime,
      task: "",
      description: "",
      daysOfWeek: finalDays,
      date: finalDate,
      duration: duration || 30,
      subtasks: [],
      imageKey: "breathe",
    });
  }, [formData, nextInsertionOrder, allRoutines, saveRoutines]);

  const handleBatchSave = useCallback((newItems: RoutineItem[]) => {
    if (!newItems || newItems.length === 0) return;

    const order = nextInsertionOrder;
    const itemsWithOrder = newItems.map((item, idx) => ({
      ...item,
      insertionOrder: order + idx,
    }));

    const updated = [...allRoutines, ...itemsWithOrder];
    saveRoutines(updated);
    setNextInsertionOrder(prev => prev + newItems.length);
    closeForm();
  }, [allRoutines, nextInsertionOrder, saveRoutines, closeForm]);

  const handleSaveInstance = useCallback(() => {
    const { time, task, description, duration } = formData;
    if (!time.trim() || !task.trim()) {
      Alert.alert("Missing Information", "Please enter a task name and time.");
      return;
    }

    const originalTask = allRoutines.find((item) => item.id === editingId);
    if (!originalTask) return;

    const dateStr = getDateString(selectedDate || new Date());

    const newItem: RoutineItem = {
      id: Date.now().toString(),
      time: time.trim(),
      task: task.trim(),
      description: description.trim(),
      imageKey: formData.imageKey || originalTask.imageKey || "breathe",
      insertionOrder: nextInsertionOrder,
      daysOfWeek: [],
      date: dateStr,
      parentId: originalTask.id,
      duration: duration || originalTask.duration || 30,
      subtasks: formData.subtasks || [],
    };

    const updatedRoutines = [...allRoutines, newItem];
    saveRoutines(updatedRoutines);
    setNextInsertionOrder(prev => prev + 1);
    closeForm();
  }, [formData, editingId, nextInsertionOrder, closeForm, allRoutines, saveRoutines, selectedDate]);

  const handleSave = useCallback(() => {
    const { time, task, description, daysOfWeek, duration, date, subtasks } = formData;
    if (!time.trim() || !task.trim()) {
      Alert.alert("Missing Information", "Please enter a task name and time.");
      return;
    }

    const normalizedTask = task.trim().toLowerCase();
    const isSleepOrWake = normalizedTask === "sleep" || normalizedTask === "wake up";

    const finalDays = (daysOfWeek || []).sort();
    const finalDate = (finalDays.length > 0) ? undefined : date;

    if (isSleepOrWake) {
      const existing = allRoutines.find(item => {
        if (item.id === editingId) return false;
        if (item.task.toLowerCase() !== normalizedTask) return false;
        return item.daysOfWeek?.some(day => finalDays.includes(day));
      });
      if (existing) {
        Alert.alert("Duplicate Task", `A "${task.trim()}" task already exists for one or more of these days!`);
        return;
      }
    }

    if (editingId) {
      const updated = allRoutines.map((item) =>
        item.id === editingId
          ? {
            ...item,
            time: time.trim(),
            task: task.trim(),
            description: description.trim(),
            imageKey: (formData.imageKey && formData.imageKey !== "breathe") ? formData.imageKey : (item.imageKey || guessRoutineIconKey(task.trim())),
            daysOfWeek: finalDays,
            date: finalDate,
            duration: duration || item.duration || 30,
            subtasks: subtasks || [],
          }
          : item
      );
      saveRoutines(updated);
    } else {
      const newItem: RoutineItem = {
        id: Date.now().toString(),
        time: time.trim(),
        task: task.trim(),
        description: description.trim(),
        imageKey: (formData.imageKey && formData.imageKey !== "breathe") ? formData.imageKey : guessRoutineIconKey(task.trim()),
        insertionOrder: nextInsertionOrder,
        daysOfWeek: finalDays,
        date: finalDate,
        duration: duration || 30,
        subtasks: subtasks || [],
      };
      saveRoutines([...allRoutines, newItem]);
      setNextInsertionOrder((prev) => prev + 1);
    }
    closeForm();
  }, [formData, editingId, nextInsertionOrder, closeForm, allRoutines, saveRoutines]);

  const handleDelete = useCallback(() => {
    if (!selectedTask) return;
    const taskToDelete = selectedTask;
    const taskNameLower = taskToDelete.task?.toLowerCase().trim();
    if (taskNameLower === "wake up" || taskNameLower === "sleep") return;

    const isRepeating = taskToDelete.daysOfWeek && taskToDelete.daysOfWeek.length > 0;

    if (isRepeating) {
      if (Platform.OS === 'web') {
        const wantsSkip = window.confirm("Do you want to SKIP this task for THIS DATE ONLY? (Cancel to delete for ALL days)");
        if (wantsSkip) {
          const dateStr = getDateString(selectedDate || new Date());
          const newItem: RoutineItem = {
             ...taskToDelete,
             id: Date.now().toString(),
             parentId: taskToDelete.id,
             isSkipped: true,
             daysOfWeek: [],
             date: dateStr,
          };
          saveRoutines([...allRoutines, newItem]);
          closeModal();
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
                const dateStr = getDateString(selectedDate || new Date());
                const newItem: RoutineItem = {
                    ...taskToDelete,
                    id: Date.now().toString(),
                    parentId: taskToDelete.id,
                    isSkipped: true,
                    daysOfWeek: [],
                    date: dateStr,
                };
                saveRoutines([...allRoutines, newItem]);
                closeModal();
              }
            },
            {
              text: "Delete all days",
              style: "destructive",
              onPress: () => {
                 saveRoutines(allRoutines.filter((item) => item.id !== taskToDelete.id));
                 setTimeout(() => closeModal(), 50);
              }
            }
          ]
        );
        return;
      }
    }

    requestConfirm('Delete Routine', `Are you sure you want to delete ${taskToDelete.task}?`, 'Delete', () => {
      saveRoutines(allRoutines.filter((item) => item.id !== taskToDelete.id));
      setTimeout(() => closeModal(), 50);
      setConfirmState(prev => ({ ...prev, visible: false }));
    });
  }, [selectedTask, closeModal, allRoutines, saveRoutines, requestConfirm, selectedDate]);

  const handleEditFromModal = useCallback(() => {
    if (selectedTask) {
      closeModal();
      setTimeout(() => openForm(selectedTask), 300);
    }
  }, [selectedTask, closeModal, openForm]);

  const handleSaveFromModal = useCallback((updatedTask: RoutineItem) => {
    const originalTask = allRoutines.find(i => i.id === updatedTask.id);
    if (!originalTask) return;

    const isDifferent = originalTask.time !== updatedTask.time || originalTask.task !== updatedTask.task || originalTask.duration !== updatedTask.duration;
    const isRepeating = originalTask.daysOfWeek && originalTask.daysOfWeek.length > 0;

    const doFinalSave = () => {
      const updated = allRoutines.map(item => item.id === updatedTask.id ? updatedTask : item);
      saveRoutines(updated);
    };

    if (isRepeating && isDifferent) {
      if (Platform.OS === 'web') {
        const wantsInstance = window.confirm("Do you want to save this change for THIS DATE ONLY? (Cancel saves for ALL days)");
        if (wantsInstance) {
          const dateStr = getDateString(selectedDate || new Date());
          const newItem: RoutineItem = {
            ...updatedTask,
            id: Date.now().toString(),
            parentId: originalTask.id,
            daysOfWeek: [],
            date: dateStr,
          };
          saveRoutines([...allRoutines, newItem]);
          setNextInsertionOrder(prev => prev + 1);
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
                const dateStr = getDateString(selectedDate || new Date());
                const newItem: RoutineItem = {
                  ...updatedTask,
                  id: Date.now().toString(),
                  parentId: originalTask.id,
                  daysOfWeek: [],
                  date: dateStr,
                };
                saveRoutines([...allRoutines, newItem]);
                setNextInsertionOrder(prev => prev + 1);
              }
            },
            { text: "All days", style: "destructive", onPress: doFinalSave }
          ]
        );
        return;
      }
    }
    doFinalSave();
  }, [allRoutines, saveRoutines, selectedDate]);

  const handleToggleComplete = useCallback((targetItem: RoutineItem) => {
    setAllRoutines((prev) => {
      const updated = prev.map((item) =>
        item.id === targetItem.id ? { ...item, completed: !item.completed } : item
      );
      saveRoutines(updated);
      return updated;
    });
  }, [saveRoutines]);

  const updateFormField = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTimelineTaskPress = useCallback((item: RoutineItem) => {
    openModal(item);
  }, [openModal]);

  const handleDayListTaskPress = useCallback((item: RoutineItem) => {
    openModal(item);
  }, [openModal]);

  const handleFabPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openForm();
  }, [openForm]);

  const handleCloseBarPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeList();
  }, [closeList]);

  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      const p = new Date(date); p.setDate(p.getDate() - 1);
      const n = new Date(date); n.setDate(n.getDate() + 1);
      setPageDates([p, date, n]);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} testID="routine-safe-area">
      {/* ---- Day Timeline View (Unified with Calendar) ---- */}
      <View style={styles.panelWrapper}>
        <DayTimelineView
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          routineItems={allRoutines}
          onPressPeek={toggleList}
          scrollY={scrollY}
          listAnim={listAnim}
          isTaskModalOpen={listOpen || modalVisible || formVisible}
          onPressTask={handleTimelineTaskPress}
        />
      </View>

      {/* ---- Collapsed Task Modal (Styled Identically to Tab Bar Container) ---- */}
      <RoutinePeekBar
        bottomOffset={bottomOffset}
        tabBarWidth={tabBarWidth}
        listOpen={listOpen}
        opacity={collapsedPillOpacity}
        translateY={collapsedPillTranslateY}
        nextTask={nextTask}
        nextTaskBadgeColor={nextTaskBadgeColor}
        nextTaskIcon={nextTaskIcon}
        onOpenList={openList}
        panHandlers={collapsedPanResponder.panHandlers}
      />

      {/* ---- Detail Task List (Pager) ---- */}
      <Animated.View
        style={[
          styles.listOverlay,
          {
            top: overlayTop,
            transform: [{ translateY: listTranslateY }],
            opacity: listOpacity,
          },
        ]}
        pointerEvents={listOpen ? "auto" : "none"}
      >
        <LinearGradient
          colors={[theme.colors.primarySoft, "transparent"]}
          style={styles.gradientTop}
          pointerEvents="none"
        />

        <View style={styles.listHeader} {...listHeaderPanResponder.panHandlers}>
          <Pressable
            style={({ pressed }) => [styles.closeBar, pressed && { opacity: 0.6 }]}
            hitSlop={14}
            onPress={handleCloseBarPress}
            accessibilityRole="button"
            accessibilityLabel="Collapse routine panel"
          />
          <Text style={styles.listTitle}>Daily Routine</Text>
        </View>

        {/* 3-panel infinite pager */}
        <View
          style={styles.pagerContainer}
          onLayout={e => setPagerHeight(e.nativeEvent.layout.height)}
        >
          <Animated.View
            {...pagerPanResponder.panHandlers}
            style={[
              {
                flexDirection: 'row',
                width: SCREEN_WIDTH * 3,
                height: pagerHeight || undefined,
              },
              { transform: [{ translateX: pagerTranslateX }] },
            ]}
          >
            {([0, 1, 2] as const).map(idx => {
              const pageItems = allPageItems[idx];
              return (
                <RoutineDayList
                  key={idx}
                  pageItems={pageItems}
                  isLoading={isLoading}
                  isCenterPage={idx === 1}
                  onScroll={idx === 1 ? handleScroll : undefined}
                  onPullDownToClose={idx === 1 ? handleCloseBarPress : undefined}
                  onPressTask={handleDayListTaskPress}
                  onToggleComplete={handleToggleComplete}
                  onAddRitual={handleFabPress}
                  width={SCREEN_WIDTH}
                  height={pagerHeight}
                />
              );
            })}
          </Animated.View>
        </View>

        {/* Floating Action Button (FAB) */}
        {listOpen && (
          <View style={styles.fabContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={handleFabPress}
              accessibilityRole="button"
              accessibilityLabel="Add new ritual"
              testID="routine-fab"
            >
              <Ionicons name="add" size={32} color={theme.colors.onPrimary} />
            </Pressable>
          </View>
        )}
      </Animated.View>

      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        onClose={closeModal}
        onEdit={handleEditFromModal}
        onSaveTask={handleSaveFromModal}
        onDelete={handleDelete}
        onChainNextTask={(endTime) => openForm(undefined, endTime)}
      />

      <TaskForm
        visible={formVisible}
        isEditing={!!editingId}
        formData={formData}
        onUpdateField={updateFormField}
        onSave={handleSave}
        onSaveAndAddAnother={handleSaveAndAddAnother}
        onBatchSave={handleBatchSave}
        onSaveInstance={handleSaveInstance}
        onClose={closeForm}
        existingRoutines={allRoutines}
        selectedDate={selectedDate || undefined}
      />

      <RoutineConfirmModal
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onCancel={() => setConfirmState(prev => ({ ...prev, visible: false }))}
        onConfirm={() => confirmState.action()}
      />
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const stylesCache = new Map<string, ReturnType<typeof getStyles>>();
const getCachedStyles = (theme: Theme) => {
  const key = `${theme.colors.background}-${theme.colors.primary}-${theme.colors.surface}`;
  let s = stylesCache.get(key);
  if (!s) {
    s = getStyles(theme);
    stylesCache.set(key, s);
  }
  return s;
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    panelWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: themeTokens.borderRadius.xl * 2,
      borderTopRightRadius: themeTokens.borderRadius.xl * 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
      zIndex: 10,
    },
    listHeader: {
      alignItems: "center",
      paddingVertical: themeTokens.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: themeTokens.borderRadius.xl * 2,
      borderTopRightRadius: themeTokens.borderRadius.xl * 2,
    },
    gradientTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 70,
      borderTopLeftRadius: themeTokens.borderRadius.xl * 2,
      borderTopRightRadius: themeTokens.borderRadius.xl * 2,
      zIndex: 20,
    },
    closeBar: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: !theme.isDarkMode
        ? "rgba(0, 0, 0, 0.28)"
        : "rgba(255, 255, 255, 0.35)",
      marginBottom: themeTokens.spacing.sm,
    },
    listTitle: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    pagerContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    fabContainer: {
      position: "absolute",
      bottom: 30,
      right: 24,
      zIndex: 100,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 25,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      zIndex: 100,
    },
    fabPressed: {
      transform: [{ scale: 0.92 }],
      opacity: 0.9,
    },
  });
