import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DayTimelineView } from "../components/dashboard/DayTimelineView";
import TaskForm from "../components/todo/TaskForm";
import TaskModal from "../components/todo/TaskModal";
import { TimelineEventCard } from "../components/dashboard/TimelineEventCard";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { CalendarEvent, getCalendarEventsForDate } from "../utils/calendar";
import { FormData, getDateString, RoutineItem, sortRoutineItems, timeToMinutes } from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Height of the timeline panel when fully expanded.
 *  BODY_HEIGHT(320) + day header(~55) + peek card(~90) + padding(~30) */
const PANEL_EXPANDED_HEIGHT = 510;

/* Initial routine preserved */
const INITIAL_ROUTINE: RoutineItem[] = [
  { id: "1", time: "6:00 AM", task: "Wake Up", description: "A wild day appears! Start gently.", imageKey: "wakeup", insertionOrder: 1 },
  { id: "2", time: "6:30 AM", task: "Hydrate", description: "It's super effective! Drink water.", imageKey: "water", insertionOrder: 2 },
  { id: "3", time: "7:00 AM", task: "Stretch", description: "Limber up to increase evasion.", imageKey: "yoga", insertionOrder: 3 },
  { id: "4", time: "8:00 AM", task: "Tea Time", description: "Restore PP and focus your mind.", imageKey: "tea_journal", insertionOrder: 4 },
  { id: "5", time: "9:00 AM", task: "Breakfast", description: "Boost Attack stat with nutrition.", imageKey: "breakfast", insertionOrder: 5 },
  { id: "6", time: "10:00 AM", task: "Study", description: "Gain XP in a new skill.", imageKey: "study", insertionOrder: 6 },
  { id: "7", time: "1:00 PM", task: "Lunch", description: "Refuel HP for the afternoon.", imageKey: "lunch", insertionOrder: 7 },
  { id: "8", time: "3:00 PM", task: "Walk", description: "Encounter nature in the tall grass.", imageKey: "walk", insertionOrder: 8 },
  { id: "9", time: "5:00 PM", task: "Reflect", description: "Check your progress badge.", imageKey: "reflect", insertionOrder: 9 },
  { id: "10", time: "7:00 PM", task: "Dinner", description: "Share a meal with your party.", imageKey: "dinner", insertionOrder: 10 },
  { id: "11", time: "9:00 PM", task: "Wind Down", description: "Lower defense, prepare to rest.", imageKey: "prepare_sleep", insertionOrder: 11 },
  { id: "12", time: "10:00 PM", task: "Sleep", description: "Save your game and recharge.", imageKey: "sleep", insertionOrder: 12 },
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
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false, tension: 100, friction: 9 }),
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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const routineItems = useMemo(() => {
    const dayOfWeek = selectedDate.getDay(); // 0-6
    return allRoutines.filter(item => item.daysOfWeek?.includes(dayOfWeek));
  }, [allRoutines, selectedDate]);

  /* -------------------- Timeline panel state -------------------- */
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Track scroll position to only trigger swipe-down from the top
  const scrollOffsetRef = useRef(0);
  // Track last known drag direction from scroll events
  const lastScrollY = useRef(0);

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

  /* -------------------- Scroll-based reveal -------------------- */
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

  useEffect(() => {
    getCalendarEventsForDate(selectedDate).then(setCalendarEvents).catch(() => { });
  }, [selectedDate]);

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
        daysOfWeek: item.daysOfWeek || [new Date().getDay()]
      });
    } else {
      setEditingId(null);
      setFormData({ time: "", task: "", description: "", daysOfWeek: [selectedDate.getDay()] });
    }
    setFormVisible(true);
  }, [selectedDate]);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingId(null);
    setFormData({ time: "", task: "", description: "", daysOfWeek: [] });
  }, []);

  const handleSave = useCallback(() => {
    const { time, task, description, daysOfWeek } = formData;
    if (!time.trim() || !task.trim() || !description.trim() || !daysOfWeek || daysOfWeek.length === 0) {
      Alert.alert("Missing Information", "Please fill in all fields and select days to continue");
      return;
    }

    const normalizedTask = task.trim().toLowerCase();
    const isSleepOrWake = normalizedTask === "sleep" || normalizedTask === "wake up";
    const finalDays = isSleepOrWake ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek.sort();

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
              daysOfWeek: finalDays
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
      };
      saveRoutines([...allRoutines, newItem]);
      setNextInsertionOrder((prev) => prev + 1);
    }
    closeForm();
  }, [formData, editingId, nextInsertionOrder, closeForm, allRoutines, saveRoutines]);

  const handleDelete = useCallback(() => {
    if (!selectedTask) return;
    const taskToDelete = selectedTask;

    if (Platform.OS === 'web') {
      if (window.confirm(`Transfer ${taskToDelete.task} away?`)) {
        const remaining = allRoutines.filter((item) => item.id !== taskToDelete.id);
        saveRoutines(remaining);
        setTimeout(() => closeModal(), 50);
      }
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

  const updateFormField = useCallback((field: keyof FormData, value: string) => {
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
          }}
          routineItems={allRoutines}
          onPressPeek={toggleList}
          scrollY={scrollY}
          listAnim={listAnim}
        />
      </View>

      {/* ---- Detail Task List (Animated Reveal) ---- */}
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
        <View style={styles.listHeader}>
          <Pressable style={styles.closeBar} onPress={closeList} />
          <Text style={styles.listTitle}>Daily Routine</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          testID="routine-scroll-view"
        >
          <View style={styles.cardList}>
            {sortedRoutineItems.length === 0 && calendarEvents.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>Your deck is empty!</Text>
                <Text style={styles.emptyStateSub}>Tap the Pokéball below to start building your routine.</Text>
              </View>
            ) : (
              (() => {
                const allItems: Array<{ minutes: number; type: "routine" | "calendar"; data: RoutineItem | CalendarEvent }> = [
                  ...sortedRoutineItems.map(r => ({ minutes: timeToMinutes(r.time), type: "routine" as const, data: r })),
                  ...calendarEvents.map(e => ({ minutes: e.startMinutes, type: "calendar" as const, data: e })),
                ].sort((a, b) => a.minutes - b.minutes);

                return allItems.map((entry, idx) => {
                  const prevMinutes = idx > 0 ? allItems[idx - 1].minutes : null;
                  const showBreakBefore = prevMinutes !== null && (entry.minutes - prevMinutes) > 45;
                  return (
                    <TimelineEventCard
                      key={`${entry.type}-${(entry.data as any).id}`}
                      item={entry.data}
                      type={entry.type}
                      isFirst={idx === 0}
                      isLast={idx === allItems.length - 1}
                      showBreakBefore={showBreakBefore}
                      onPress={entry.type === 'routine' ? () => openModal(entry.data as RoutineItem, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2) : undefined}
                    />
                  );
                });
              })()
            )}
          </View>

          {/* Bottom padding for scrolling past FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Action Button (FAB) - Minimalist Pokéball Style */}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
            !listOpen && { opacity: 0, transform: [{ scale: 0 }] }
          ]}
          onPress={() => openForm()}
          testID="routine-fab"
          disabled={!listOpen}
        >
          <Ionicons name="add" size={32} color={theme.colors.white} />
        </Pressable>
      </Animated.View>

      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        animatedStyle={animatedStyle}
        onClose={closeModal}
        onEdit={handleEditFromModal}
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
      top: 110, // Higher default state
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.text}12`,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },
    closeBar: {
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: `${theme.colors.textSecondary}33`,
      marginBottom: 8,
    },
    listTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* Scroll Area */
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
    fab: {
      position: "absolute",
      bottom: 30,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
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
