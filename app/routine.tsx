import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "../utils/haptics";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { DayTimelineView, TASK_COLORS } from "../components/dashboard/DayTimelineView";
import TaskForm from "../components/dashboard/TaskForm";
import TaskModal from "../components/dashboard/TaskModal";
import { TimelineEventCard, SkeletonTimelineEventCard } from "../components/dashboard/TimelineEventCard";
import { Theme } from "../styles/shared";
import { useTheme } from "../context/ThemeContext";
import { scheduleRoutineNotifications } from "../utils/notifications";
import { FormData, RoutineItem, getDateString, sortRoutineItems, timeToMinutes, getRoutineItemsForDate, addMinutesToTime, guessRoutineIconKey, isWakeupOrSleep, ICON_MAP } from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */

// Use useWindowDimensions() inside components for dynamic values on web
// These fallbacks are only used for initial/modal animations outside the component
const { width: INITIAL_SCREEN_WIDTH, height: INITIAL_SCREEN_HEIGHT } = Dimensions.get("window");

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
const useModalAnimation = (screenWidth: number, screenHeight: number) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  const animatedStyle = useMemo(
    () => ({ transform: [{ translateX }, { translateY }, { scale: scaleAnim }] }),
    [translateX, translateY, scaleAnim]
  );

  const openAnimation = useCallback(
    (x: number, y: number) => {
      translateX.setValue(x - screenWidth / 2);
      translateY.setValue(y - screenHeight / 2);
      scaleAnim.setValue(0);

      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 9 }),
      ]).start();
    },
    [translateX, translateY, scaleAnim, screenWidth, screenHeight]
  );

  const closeAnimation = useCallback(
    (onComplete: () => void) => {
      Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 9 }).start(onComplete);
    },
    [scaleAnim]
  );

  return { animatedStyle, openAnimation, closeAnimation };
};

/* -------------------- CONFIRM MODAL (IN-APP) -------------------- */
const ConfirmModal = ({ visible, title, message, confirmText, onCancel, onConfirm, theme, isDarkMode }: any) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 25 : 100}
          tint={isDarkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            backgroundColor: theme.colors.card,
            width: '100%',
            maxWidth: 340,
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Text style={{ fontSize: 19, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 8, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 14,
                  backgroundColor: theme.colors.background,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.glass.borderColor,
                },
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCancel();
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: theme.fonts.bold, color: theme.colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 14,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 14,
                  alignItems: 'center',
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onConfirm();
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: theme.fonts.bold, color: theme.colors.white }}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------- Screen Component -------------------- */
export default function RoutineScreen() {
  const { theme, isDarkMode } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(16, insets.bottom + 8);
  const tabBarWidth = Math.min(SCREEN_WIDTH * 0.9, 440);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [allRoutines, setAllRoutines] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<RoutineItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ time: "", task: "", description: "", daysOfWeek: [] });
  const [nextInsertionOrder, setNextInsertionOrder] = useState(13);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [confirmState, setConfirmState] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Transfer",
    action: () => { },
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

  const routineItems = useMemo(() => {
    return getRoutineItemsForDate(allRoutines, selectedDate);
  }, [allRoutines, selectedDate]);

  const sortedDayTasks = useMemo(() => {
    return [...routineItems].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [routineItems]);

  const nextTask = useMemo(() => {
    if (sortedDayTasks.length === 0) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const isToday = getDateString(selectedDate) === getDateString(now);
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

  const collapsedSubtitle = useMemo(() => {
    if (sortedDayTasks.length === 0) return "No tasks scheduled for today";
    const completedCount = sortedDayTasks.filter(t => t.completed).length;
    if (completedCount === sortedDayTasks.length) {
      return "All tasks completed";
    }
    if (nextTask) {
      return `Next: ${nextTask.time} • ${nextTask.task}`;
    }
    return `${completedCount} of ${sortedDayTasks.length} tasks completed`;
  }, [sortedDayTasks, nextTask]);

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
  // Uses initial screen width since this is only created once and mobile web won't resize
  const pagerTranslateX = useRef(Animated.add(pagerX, new Animated.Value(-INITIAL_SCREEN_WIDTH))).current;
  const isDraggingHorizontal = useRef(false);
  // Flag set when a swipe completes — tells useLayoutEffect to reset pagerX
  // after the new pageDates have been committed, preventing the flicker.
  const pendingReset = useRef(false);

  const shiftDate = useCallback((delta: number) => {
    Haptics.selectionAsync();
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

  // PanResponder for native gesture handling - disabled on web where it doesn't work well
  const pagerPanResponder = useRef(
    Platform.OS === 'web' 
      ? { panHandlers: {} }
      : PanResponder.create({
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeList();
            }
            isDraggingHorizontal.current = false;
          },
        })
  ).current;

  const listHeaderPanResponder = useRef(
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
        })
  ).current;

  const collapsedPanResponder = useRef(
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
        })
  ).current;

  const listTranslateY = listAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT - 142, 0],
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
    const items = getRoutineItemsForDate(allRoutines, date);
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          closeList();
        }
        lastScrollY.current = y;
      },
    }
  );

  const { animatedStyle, openAnimation, closeAnimation } = useModalAnimation(SCREEN_WIDTH, SCREEN_HEIGHT);
  const sortedRoutineItems = useMemo(() => sortRoutineItems(routineItems), [routineItems]);


  /* -------------------- Data Fetching -------------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        let finalRoutines: RoutineItem[] | null = null;
        let localRoutines: RoutineItem[] | null = null;
        
        // 1. Try to load local data (saved from setup or previous sessions)
        const localDataStr = await AsyncStorage.getItem(STORAGE_KEY);
        if (localDataStr) {
          try {
            localRoutines = JSON.parse(localDataStr);
          } catch (e) {}
        }

        // 2. Fetch from Supabase (if authenticated)
        if (localRoutines && localRoutines.length > 0) {
          finalRoutines = localRoutines;
        }

        if (!finalRoutines || finalRoutines.length === 0) {
          finalRoutines = INITIAL_ROUTINE.map(item => {
            const isDaily = item.task.toLowerCase() === "sleep" || item.task.toLowerCase() === "wake up";
            return { ...item, daysOfWeek: isDaily ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()] };
          });
          
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalRoutines));
          
          // And back it up to cloud if currently signed in
        }

        setAllRoutines(finalRoutines);
        setNextInsertionOrder(finalRoutines.length > 0 ? Math.max(...finalRoutines.map((i: RoutineItem) => i.insertionOrder || 0)) + 1 : 1);

      } catch (e) {
        console.error("Failed to load routines.", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const saveRoutines = useCallback(async (newItems: RoutineItem[]) => {
    try {
      setAllRoutines(newItems);
      // Immediately save to local storage for offline preservation
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      await scheduleRoutineNotifications(newItems);
      
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
      let defaultTime = customSuggestedTime;
      if (!defaultTime) {
        const dayTasks = getRoutineItemsForDate(allRoutines, selectedDate);
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
        date: getDateString(selectedDate),
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

    let finalDays = (daysOfWeek || []).sort();
    let finalDate = (finalDays.length > 0) ? undefined : date;

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

    let order = nextInsertionOrder;
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

    const dateStr = getDateString(selectedDate);
    
    // Create new task mapped specifically to this date, without modifying the repeating original
    const newItem: RoutineItem = {
      id: Date.now().toString(),
      time: time.trim(),
      task: task.trim(),
      description: description.trim(),
      imageKey: formData.imageKey || originalTask.imageKey || "breathe",
      insertionOrder: nextInsertionOrder,
      daysOfWeek: [], // Single exact date
      date: dateStr,
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

    // Allow sleep/wake tasks to have varying days of week, just like other tasks.
    let finalDays = (daysOfWeek || []).sort();
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
          const dateStr = getDateString(selectedDate);
          const newItem: RoutineItem = {
             ...taskToDelete,
             id: Date.now().toString(),
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
                const dateStr = getDateString(selectedDate);
                const newItem: RoutineItem = {
                    ...taskToDelete,
                    id: Date.now().toString(),
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
          const dateStr = getDateString(selectedDate);
          const newItem: RoutineItem = {
            ...updatedTask,
            id: Date.now().toString(),
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
                const dateStr = getDateString(selectedDate);
                const newItem: RoutineItem = {
                  ...updatedTask,
                  id: Date.now().toString(),
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
          isTaskModalOpen={listOpen || modalVisible || formVisible}
          onPressTask={(item) => openModal(item, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)}
        />
      </View>

      {/* ---- Collapsed Task Modal (Styled Identically to Tab Bar Container) ---- */}
      <Animated.View
        style={[
          styles.tabBarContainer,
          {
            bottom: bottomOffset,
            opacity: collapsedPillOpacity,
            transform: [{ translateY: collapsedPillTranslateY }],
          },
        ]}
        pointerEvents={listOpen ? "none" : "auto"}
      >
        <Pressable
          style={({ pressed }) => [
            styles.tabBar,
            { width: tabBarWidth },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openList();
          }}
          {...collapsedPanResponder.panHandlers}
        >
          {/* Blur background - fallback to solid bg on web */}
          {Platform.OS === 'web' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.colors.background, opacity: 0.92 }
              ]}
              pointerEvents="none"
            />
          ) : (
            <BlurView
              intensity={100}
              tint={theme.colors.background === '#FFFFFF' || theme.colors.background.startsWith('#F') ? 'systemMaterialLight' : 'systemMaterialDark'}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
          {/* Glass tint overlay */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.cardBg }]} />

          {/* Collapsed Pill Content */}
          <View style={styles.collapsedPillContent}>
            <View
              style={[
                styles.collapsedIconCircle,
                {
                  backgroundColor: `${nextTaskBadgeColor}22`,
                  borderColor: `${nextTaskBadgeColor}45`,
                },
              ]}
            >
              <Ionicons
                name={nextTaskIcon as any}
                size={20}
                color={nextTaskBadgeColor}
              />
            </View>

            <View style={styles.collapsedTextWrapper}>
              <View style={styles.collapsedTimeRow}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={theme.colors.textSecondary}
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.collapsedTime}>
                  {nextTask ? nextTask.time : "Today"}
                </Text>
                {nextTask && (
                  <View
                    style={[
                      styles.collapsedBadge,
                      { backgroundColor: `${nextTaskBadgeColor}18` },
                    ]}
                  >
                    {nextTask.daysOfWeek?.length ? (
                      <Ionicons
                        name="repeat"
                        size={10}
                        color={nextTaskBadgeColor}
                        style={{ marginRight: 3 }}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.collapsedBadgeText,
                        { color: nextTaskBadgeColor },
                      ]}
                    >
                      {nextTask.daysOfWeek?.length ? "Daily" : "Once"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.collapsedTitle} numberOfLines={1}>
                {nextTask ? nextTask.task : "Daily Routine"}
              </Text>
            </View>

            <View style={styles.collapsedChevronCircle}>
              <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

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
          <Pressable
            style={({ pressed }) => [styles.closeBar, pressed && { opacity: 0.6 }]}
            hitSlop={14}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeList();
            }}
          />
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
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, itemIdx) => (
                        <SkeletonTimelineEventCard
                          key={`skeleton-${itemIdx}`}
                          isFirst={itemIdx === 0}
                          isLast={itemIdx === 4}
                        />
                      ))
                    ) : pageItems.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyStateIconCircle}>
                          <Ionicons name="sparkles-outline" size={30} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.emptyStateTitle}>No Rituals Scheduled</Text>
                        <Text style={styles.emptyStateSub}>Tap the + below to add a ritual to your day.</Text>
                      </View>
                    ) : (
                      (() => {
                        const chainPositions: ('none' | 'start' | 'middle' | 'end')[] = new Array(pageItems.length).fill('none');
                        for (let i = 0; i < pageItems.length; i++) {
                          const item = pageItems[i].data as RoutineItem;
                          if (isWakeupOrSleep(item)) {
                            chainPositions[i] = 'none';
                            continue;
                          }
                          if (chainPositions[i] !== 'none') continue;

                          const startMins = pageItems[i].minutes;
                          const dur = item.duration ?? 30;
                          let runEnd = startMins + dur;
                          let j = i + 1;
                          while (j < pageItems.length) {
                            const nextItem = pageItems[j].data as RoutineItem;
                            if (isWakeupOrSleep(nextItem)) break;
                            const nextStart = pageItems[j].minutes;
                            if (nextStart < runEnd) {
                              runEnd = Math.max(runEnd, nextStart + (nextItem.duration ?? 30));
                              j++;
                            } else {
                              break;
                            }
                          }

                          if (j - i >= 2) {
                            chainPositions[i] = 'start';
                            for (let k = i + 1; k < j - 1; k++) {
                              chainPositions[k] = 'middle';
                            }
                            chainPositions[j - 1] = 'end';
                            i = j - 1;
                          }
                        }

                        return pageItems.map((entry, itemIdx) => {
                          const prevMins = itemIdx > 0 ? pageItems[itemIdx - 1].minutes : null;
                          const breakMinutes = prevMins !== null ? (entry.minutes - prevMins) : 0;
                          const showBreakBefore = prevMins !== null && breakMinutes > 45;
                          return (
                            <TimelineEventCard
                              key={`${idx}-${(entry.data as any).id}`}
                              item={entry.data}
                              chainPosition={chainPositions[itemIdx]}
                              isFirst={itemIdx === 0}
                              isLast={itemIdx === pageItems.length - 1}
                              showBreakBefore={showBreakBefore}
                              breakDurationMinutes={showBreakBefore ? breakMinutes : undefined}
                              onToggleComplete={idx === 1 ? handleToggleComplete : undefined}
                              onPress={idx === 1
                                ? () => openModal(entry.data as RoutineItem, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
                                : undefined}
                            />
                          );
                        });
                      })()
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
                opacity: 1,
                transform: [],
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openForm();
              }}
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
        selectedDate={selectedDate}
      />

      <ConfirmModal
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onCancel={() => setConfirmState(prev => ({ ...prev, visible: false }))}
        onConfirm={() => confirmState.action()}
        theme={theme}
        isDarkMode={isDarkMode}
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
      top: 142, // Aligned directly beneath pinned week calendar header
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
      backgroundColor: `${theme.colors.text}35`,
      marginBottom: 8,
    },
    listTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* ── Collapsed Task Modal (Styled Identically to Tab Bar Container) ── */
    tabBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 68,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    tabBar: {
      flexDirection: 'row',
      height: 68,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    collapsedPillContent: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    collapsedIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      marginRight: 12,
    },
    collapsedTextWrapper: {
      flex: 1,
      justifyContent: 'center',
    },
    collapsedTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 3,
    },
    collapsedTime: {
      fontSize: 11.5,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      letterSpacing: 0.2,
    },
    collapsedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
      marginLeft: 5,
    },
    collapsedBadgeText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.2,
    },
    collapsedTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    collapsedChevronCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.colors.text}08`,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      borderWidth: 1,
      borderColor: `${theme.colors.text}10`,
    },

    /* Pager - these styles use initial dimensions but are overridden by inline styles in render */
    pagerStrip: {
      flexDirection: 'row',
      width: INITIAL_SCREEN_WIDTH * 3,
      flex: 1,
      overflow: 'hidden',
    },
    pagerPage: {
      width: INITIAL_SCREEN_WIDTH,
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
      paddingVertical: 64,
      paddingHorizontal: 24,
    },
    emptyStateIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 19,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyStateSub: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 260,
    }
  });
