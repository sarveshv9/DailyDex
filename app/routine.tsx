import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DayTimelineView } from "../components/dashboard/DayTimelineView";
import TaskForm from "../components/dashboard/TaskForm";
import TaskModal from "../components/dashboard/TaskModal";
import { TimelineEventCard } from "../components/dashboard/TimelineEventCard";
import { Theme } from "../constants/shared";

// SwiftUI liquid glass (iOS dev build only)
import { ContextMenu, Button as SwiftUIButton, Text as SwiftUIText, Host } from '@expo/ui/swift-ui';
import { useTheme } from "../context/ThemeContext";
import { FormData, RoutineItem, getDateString, sortRoutineItems, timeToMinutes } from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Height of the timeline panel when fully expanded.
 *  BODY_HEIGHT(320) + day header(~55) + peek card(~90) + padding(~30) */
const PANEL_EXPANDED_HEIGHT = 510;

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

const STORAGE_KEY = "@zen_routine";

/* -------------------- Modal Hook -------------------- */
const useModalAnimation = () => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  const animatedStyle = useMemo(
    () => ({ transform: [{ translateX }, { translateY }, { scale: scaleAnim }] }),
    [translateX, translateY, scaleAnim]
  );

  const openAnimation = useCallback(
    (x: number, y: number) => {
      translateX.setValue(x - SCREEN_WIDTH / 2);
      translateY.setValue(y - SCREEN_HEIGHT / 2);
      scaleAnim.setValue(0);

      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 9 }),
      ]).start();
    },
    [translateX, translateY, scaleAnim]
  );

  const closeAnimation = useCallback(
    (onComplete: () => void) => {
      Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }).start(onComplete);
    },
    [scaleAnim]
  );

  return { animatedStyle, openAnimation, closeAnimation };
};

/* -------------------- Screen Component -------------------- */
export default function RoutineScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [allRoutines, setAllRoutines] = useState<RoutineItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<RoutineItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ time: "", task: "", description: "", daysOfWeek: [] });
  const [nextInsertionOrder, setNextInsertionOrder] = useState(13);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Stable 3-slot page array: [prev, center, next]
  const [pageDates, setPageDates] = useState<[Date, Date, Date]>(() => {
    const c = new Date();
    const p = new Date(c); p.setDate(p.getDate() - 1);
    const n = new Date(c); n.setDate(n.getDate() + 1);
    return [p, c, n];
  });

  const routineItems = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const dateStr = getDateString(selectedDate);
    return allRoutines.filter(item =>
      item.daysOfWeek?.includes(dayOfWeek) || item.date === dateStr
    );
  }, [allRoutines, selectedDate]);

  /* -------------------- Timeline panel state -------------------- */
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Track scroll position to only trigger swipe-down from the top
  const scrollOffsetRef = useRef(0);
  // Track last known drag direction from scroll events
  const lastScrollY = useRef(0);
  // Pager container height (measured via onLayout)
  const [pagerHeight, setPagerHeight] = useState(0);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    Animated.spring(panelAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    Animated.spring(panelAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 80,
      friction: 14,
    }).start(() => setPanelOpen(false));
  }, [panelAnim]);

  const togglePanel = useCallback(() => {
    if (panelOpen) closePanel();
    else openPanel();
  }, [panelOpen, openPanel, closePanel]);

  // Animated panel height (fixed expanded height for the DayTimelineView part)
  const panelHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_EXPANDED_HEIGHT, PANEL_EXPANDED_HEIGHT], // Keep it constant for now, or use to hide it if needed
  });

  // Animation for the detail list expansion
  const listAnim = useRef(new Animated.Value(1)).current;
  const [listOpen, setListOpen] = useState(true);

  const openList = useCallback(() => {
    setListOpen(true);
    Animated.spring(listAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }, [listAnim]);

  const closeList = useCallback(() => {
    Animated.spring(listAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 80,
      friction: 14,
    }).start(() => setListOpen(false));
  }, [listAnim]);

  const toggleList = useCallback(() => {
    if (listOpen) closeList();
    else openList();
  }, [listOpen, openList, closeList]);

  const scrollY = useRef(new Animated.Value(0)).current;
  // Horizontal pager offset — starts at 0 (center panel)
  const pagerX = useRef(new Animated.Value(0)).current;
  // Stable Animated.add node — never recreated on re-render
  const pagerTranslateX = useRef(Animated.add(pagerX, new Animated.Value(-SCREEN_WIDTH))).current;
  const isDraggingHorizontal = useRef(false);
  // Flag set when a swipe completes — tells useLayoutEffect to reset pagerX
  // after the new pageDates have been committed, preventing the flicker.
  const pendingReset = useRef(false);

  const shiftDate = useCallback((delta: number) => {
    // Do NOT reset pagerX here — if we do it before React commits the new
    // pageDates the center panel briefly shows stale content (the flicker).
    // Instead, flag a reset and let useLayoutEffect do it after the commit.
    pendingReset.current = true;
    setPageDates(prev => {
      if (delta === 1) {
        // Swiped left → next day. Slide previous slot out, make next the new right
        const newRight = new Date(prev[2]); newRight.setDate(newRight.getDate() + 1);
        return [prev[1], prev[2], newRight];
      } else {
        // Swiped right → prev day. Make prev the new left
        const newLeft = new Date(prev[0]); newLeft.setDate(newLeft.getDate() - 1);
        return [newLeft, prev[0], prev[1]];
      }
    });
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  // Reset pagerX AFTER React has committed the new pageDates to the tree.
  // useLayoutEffect fires synchronously post-commit, before the browser paints,
  // so the center panel already shows the correct new day when we snap back to 0.
  useLayoutEffect(() => {
    if (pendingReset.current) {
      pendingReset.current = false;
      pagerX.setValue(0);
    }
  }, [pageDates, pagerX]);

  const pagerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const isHoriz = Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
        const isDown = g.dy > 15 && scrollOffsetRef.current <= 1 && Math.abs(g.dy) > Math.abs(g.dx);
        return isHoriz || isDown;
      },
      onMoveShouldSetPanResponder: (_, g) => {
        const isHoriz = Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
        const isDown = g.dy > 15 && scrollOffsetRef.current <= 1 && Math.abs(g.dy) > Math.abs(g.dx);
        return isHoriz || isDown;
      },
      onPanResponderGrant: () => {
        isDraggingHorizontal.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8) {
          isDraggingHorizontal.current = true;
          pagerX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (isDraggingHorizontal.current) {
          const LEFT = g.dx < -60 || g.vx < -0.8;
          const RIGHT = g.dx > 60 || g.vx > 0.8;
          if (LEFT || RIGHT) {
            const target = LEFT ? -SCREEN_WIDTH : SCREEN_WIDTH;
            Animated.timing(pagerX, {
              toValue: target,
              duration: 220,
              useNativeDriver: false,
            }).start(() => {
              shiftDate(LEFT ? 1 : -1);
              // pagerX already reset inside shiftDate
            });
          } else {
            Animated.spring(pagerX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 80,
              friction: 12,
            }).start();
          }
        } else if (g.dy > 50 || g.vy > 1) {
          closeList();
        }
        isDraggingHorizontal.current = false;
      },
    })
  ).current;

  const listHeaderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50 || g.vy > 1) closeList();
      },
    })
  ).current;

  const listTranslateY = listAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const collapseTranslateY = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, -90],
    extrapolate: "clamp",
  });

  const listOpacity = listAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });

  const fabScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const fabTranslate = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 40],
    extrapolate: "clamp",
  });

  /* -------------------- Per-day items helper -------------------- */
  const getItemsForDate = useCallback((date: Date) => {
    const dow = date.getDay();
    const dateStr = getDateString(date);
    const items = allRoutines.filter(item =>
      item.daysOfWeek?.includes(dow) || item.date === dateStr
    );
    const sorted = sortRoutineItems(items);

    const all: Array<{ minutes: number; type: 'routine'; data: RoutineItem }> = [
      ...sorted.map(r => ({ minutes: timeToMinutes(r.time), type: 'routine' as const, data: r })),
    ].sort((a, b) => a.minutes - b.minutes);
    return all;
  }, [allRoutines]);

  // When the list is scrolled to the top AND the user over-scrolls downward,
  // we interpret that as a "pull-down" to open the panel.
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        scrollOffsetRef.current = y;

        // Pull down to close the list if scrolled to top
        if (y < -60 && listOpen) {
          closeList();
        }
        lastScrollY.current = y;
      },
    }
  );

  const { animatedStyle, openAnimation, closeAnimation } = useModalAnimation();
  const sortedRoutineItems = useMemo(() => sortRoutineItems(routineItems), [routineItems]);


  /* -------------------- Data Fetching -------------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          let parsed: RoutineItem[] = JSON.parse(stored);

          // Migration: if items use `date` or have no `daysOfWeek`, convert them.
          let needsMigration = false;
          parsed = parsed.map(item => {
            if (!item.daysOfWeek) {
              needsMigration = true;
              // If it's a sleep/wakeup task, apply to all days
              const taskLo = item.task?.toLowerCase().trim();
              if (taskLo === "sleep" || taskLo === "wake up") {
                return { ...item, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
              }
              // Otherwise, if it has a specific date, map to that day of the week, else today
              if ((item as any).date) {
                const parts = (item as any).date.split('-');
                if (parts.length === 3) {
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  return { ...item, daysOfWeek: [d.getDay()] };
                }
              }
              return { ...item, daysOfWeek: [new Date().getDay()] };
            }
            return item;
          });

          if (needsMigration) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }

          setAllRoutines(parsed);
          setNextInsertionOrder(parsed.length > 0 ? Math.max(...parsed.map((i: RoutineItem) => i.insertionOrder || 0)) + 1 : 1);
        } else {
          const initialWithDays = INITIAL_ROUTINE.map(item => {
            const isDaily = item.task.toLowerCase() === "sleep" || item.task.toLowerCase() === "wake up";
            return { ...item, daysOfWeek: isDaily ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()] };
          });
          setAllRoutines(initialWithDays);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialWithDays));
        }
      } catch (e) {
        console.error("Failed to load routines.", e);
      }
    };
    loadData();
  }, []);

  const saveRoutines = useCallback(async (newItems: RoutineItem[]) => {
    try {
      setAllRoutines(newItems);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save routines.", e);
    }
  }, []);

  /* -------------------- Handlers -------------------- */
  const openModal = useCallback((task: RoutineItem, x: number, y: number) => {
    setSelectedTask(task);
    setModalVisible(true);
    openAnimation(x, y);
  }, [openAnimation]);

  const closeModal = useCallback(() => {
    closeAnimation(() => {
      setModalVisible(false);
      setSelectedTask(null);
    });
  }, [closeAnimation]);

  const openForm = useCallback((item?: RoutineItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        time: item.time,
        task: item.task,
        description: item.description,
        daysOfWeek: item.daysOfWeek || [],
        date: item.date,
        duration: item.duration || 30,
        imageKey: item.imageKey
      });
    } else {
      setEditingId(null);
      setFormData({
        time: "",
        task: "",
        description: "",
        daysOfWeek: [],
        date: getDateString(selectedDate),
        duration: 30
      });
    }
    setFormVisible(true);
  }, [selectedDate]);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingId(null);
    setFormData({ time: "", task: "", description: "", daysOfWeek: [], date: "" });
  }, []);

  const handleSave = useCallback(() => {
    const { time, task, description, daysOfWeek, duration, date } = formData;
    if (!time.trim() || !task.trim()) {
      Alert.alert("Missing Information", "Please enter a task name and time.");
      return;
    }

    const normalizedTask = task.trim().toLowerCase();
    const isSleepOrWake = normalizedTask === "sleep" || normalizedTask === "wake up";

    // If it's a sleep/wake task, it repeating every day.
    // Otherwise, it's repeating if daysOfWeek is not empty, or one-off if it has a date.
    let finalDays = isSleepOrWake ? [0, 1, 2, 3, 4, 5, 6] : (daysOfWeek || []).sort();
    let finalDate = (finalDays.length > 0) ? undefined : date;

    if (isSleepOrWake) {
      // Check if for ANY of the final days, a sleep/wake up task already exists (other than the editing one)
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
            imageKey: formData.imageKey || item.imageKey || "breathe",
            daysOfWeek: finalDays,
            date: finalDate,
            duration: duration || item.duration || 30
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
        imageKey: formData.imageKey || "breathe",
        insertionOrder: nextInsertionOrder,
        daysOfWeek: finalDays,
        date: finalDate,
        duration: duration || 30,
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

    if (Platform.OS === 'web') {
      if (window.confirm(`Transfer ${taskToDelete.task} away?`)) {
        const remaining = allRoutines.filter((item) => item.id !== taskToDelete.id);
        saveRoutines(remaining);
        setTimeout(() => closeModal(), 50);
      }
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Transfer Out'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Transfer Routine',
          message: `Transfer ${taskToDelete.task} away?`,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            const remaining = allRoutines.filter((item) => item.id !== taskToDelete.id);
            saveRoutines(remaining);
            setTimeout(() => closeModal(), 50);
          }
        }
      );
    } else {
      Alert.alert("Transfer", `Transfer ${taskToDelete.task} away?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: () => {
            const remaining = allRoutines.filter((item) => item.id !== taskToDelete.id);
            saveRoutines(remaining);
            setTimeout(() => closeModal(), 50);
          },
        },
      ]);
    }
  }, [selectedTask, closeModal, allRoutines, saveRoutines]);

  const handleEditFromModal = useCallback(() => {
    if (selectedTask) {
      closeModal();
      setTimeout(() => openForm(selectedTask), 300);
    }
  }, [selectedTask, closeModal, openForm]);

  const handleSaveFromModal = useCallback((updatedTask: RoutineItem) => {
    const updated = allRoutines.map(item => item.id === updatedTask.id ? updatedTask : item);
    saveRoutines(updated);
    // Automatically close modal after save if desired, but here we let the Modal decide.
  }, [allRoutines, saveRoutines]);

  const handleDirectEdit = useCallback((task: RoutineItem) => {
    openForm(task);
  }, [openForm]);

  const handleDirectDelete = useCallback((task: RoutineItem) => {
    const taskNameLower = task.task?.toLowerCase().trim();
    if (taskNameLower === "wake up" || taskNameLower === "sleep") return;

    if (Platform.OS === 'web') {
      if (window.confirm(`Transfer ${task.task} away?`)) {
        saveRoutines(allRoutines.filter(item => item.id !== task.id));
      }
    } else {
      Alert.alert("Transfer", `Transfer ${task.task} away?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Transfer", style: "destructive", onPress: () => {
            saveRoutines(allRoutines.filter(item => item.id !== task.id));
        } },
      ]);
    }
  }, [allRoutines, saveRoutines]);

  const updateFormField = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} testID="routine-safe-area">
      {/* ---- Day Timeline View (Unified with Calendar) ---- */}
      <View style={styles.panelWrapper}>
        <DayTimelineView
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            const p = new Date(date); p.setDate(p.getDate() - 1);
            const n = new Date(date); n.setDate(n.getDate() + 1);
            setPageDates([p, date, n]);
          }}
          routineItems={allRoutines}
          onPressPeek={toggleList}
          scrollY={scrollY}
          listAnim={listAnim}
          onPressTask={(item) => openModal(item, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)}
        />
      </View>

      {/* ---- Detail Task List (Pager) ---- */}
      <Animated.View
        style={[
          styles.listOverlay,
          {
            transform: [{ translateY: listTranslateY }],
            opacity: listOpacity,
          },
        ]}
        pointerEvents={listOpen ? "auto" : "none"}
      >
        {/* Unified top gradient (corners and center) with a subtle glow */}
        <LinearGradient
          colors={[`${theme.colors.primary}3A`, `${theme.colors.primary}1A`, "transparent"]}
          style={styles.gradientTop}
          pointerEvents="none"
        />

        <View style={styles.listHeader} {...listHeaderPanResponder.panHandlers}>
          <Pressable style={styles.closeBar} onPress={closeList} />
          <Text style={styles.listTitle}>Daily Routine</Text>
        </View>

        {/* 3-panel infinite pager */}
        <View
          style={{ flex: 1, overflow: 'hidden' }}
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
              const date = pageDates[idx];
              const pageItems = getItemsForDate(date);
              return (
                <ScrollView
                  key={idx}
                  style={{ width: SCREEN_WIDTH, height: pagerHeight || undefined }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  onScroll={idx === 1 ? handleScroll : undefined}
                  scrollEventThrottle={16}
                  bounces={false}
                >
                  <View style={styles.cardList}>
                    {pageItems.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateTitle}>Your deck is empty!</Text>
                        <Text style={styles.emptyStateSub}>Tap the + below to start building your routine.</Text>
                      </View>
                    ) : (
                      pageItems.map((entry, itemIdx) => {
                        const prevMins = itemIdx > 0 ? pageItems[itemIdx - 1].minutes : null;
                        const showBreakBefore = prevMins !== null && (entry.minutes - prevMins) > 45;
                        const isProtected = entry.data.task?.toLowerCase().trim() === "wake up" || entry.data.task?.toLowerCase().trim() === "sleep";
                        return (
                          Platform.OS === 'ios' && idx === 1 ? (
                            <Host key={`${idx}-${(entry.data as any).id}`}>
                              <ContextMenu>
                                <ContextMenu.Trigger>
                                  <TimelineEventCard
                                    item={entry.data}
                                    isFirst={itemIdx === 0}
                                    isLast={itemIdx === pageItems.length - 1}
                                    showBreakBefore={showBreakBefore}
                                    onPress={() => openModal(entry.data as RoutineItem, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)}
                                  />
                                </ContextMenu.Trigger>
                                <ContextMenu.Items>
                                  <SwiftUIButton systemImage="pencil" onPress={() => handleDirectEdit(entry.data as RoutineItem)}>
                                    <SwiftUIText>Edit</SwiftUIText>
                                  </SwiftUIButton>
                                  {!isProtected && (
                                    <SwiftUIButton systemImage="trash" role="destructive" onPress={() => handleDirectDelete(entry.data as RoutineItem)}>
                                      <SwiftUIText>Transfer Out</SwiftUIText>
                                    </SwiftUIButton>
                                  )}
                                </ContextMenu.Items>
                              </ContextMenu>
                            </Host>
                          ) : (
                            <TimelineEventCard
                              key={`${idx}-${(entry.data as any).id}`}
                              item={entry.data}
                              isFirst={itemIdx === 0}
                              isLast={itemIdx === pageItems.length - 1}
                              showBreakBefore={showBreakBefore}
                              onPress={idx === 1
                                ? () => openModal(entry.data as RoutineItem, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
                                : undefined}
                            />
                          )
                        );
                      })
                    )}
                  </View>
                  <View style={{ height: 100 }} />
                </ScrollView>
              );
            })}
          </Animated.View>
        </View>

        {/* Floating Action Button (FAB) - Minimalist Pokéball Style (Moved inside to sync with animation) */}
        {listOpen && (
          <Animated.View
            style={[
              styles.fabContainer,
              {
                opacity: fabScale, // Use fabScale for both scale and opacity for a smooth "going" effect
                transform: [{ scale: fabScale }, { translateY: fabTranslate }],
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={() => openForm()}
              testID="routine-fab"
            >
              <Ionicons name="add" size={32} color={theme.colors.white} />
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>


      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        animatedStyle={animatedStyle}
        onClose={closeModal}
        onEdit={handleEditFromModal}
        onSaveTask={handleSaveFromModal}
        onDelete={handleDelete}
      />

      <TaskForm
        visible={formVisible}
        isEditing={!!editingId}
        formData={formData}
        onUpdateField={updateFormField}
        onSave={handleSave}
        onClose={closeForm}
      />
    </SafeAreaView >
  );
}


/* -------------------- Styles -------------------- */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    /* Animated timeline panel */
    panelWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    listOverlay: {
      ...StyleSheet.absoluteFillObject,
      top: 150, // Lowered for better accessibility and to reveal more timeline
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
      zIndex: 10,
    },
    listHeader: {
      alignItems: "center",
      paddingVertical: 16,
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
    },
    gradientTop: {
      position: "absolute",
      top: 0, // Aligned with overlay top
      left: 0,
      right: 0,
      height: 70, // Height to follow the 50px rounded corners
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
      zIndex: 20,
    },
    closeBar: {
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: `${theme.colors.secondary}33`,
      marginBottom: 8,
    },
    listTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* Pager */
    pagerStrip: {
      flexDirection: 'row',
      width: SCREEN_WIDTH * 3,
      flex: 1,
      overflow: 'hidden',
    },
    pagerPage: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 10,
    },
    cardList: {
      gap: 0,
    },

    /* Minimalist Pokéball FAB */
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

    /* Empty State */
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: 8,
    },
    emptyStateSub: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
      textAlign: "center",
      lineHeight: 22,
      opacity: 0.8,
    }
  });