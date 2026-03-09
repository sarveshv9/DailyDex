import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Animated, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarEventCard from "../components/CalendarEventCard";
import RoutineCard from "../components/RoutineCard";
import TaskForm from "../components/TaskForm";
import TaskModal from "../components/TaskModal";
import { getSharedStyles, Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { CalendarEvent, getTodaysCalendarEvents } from "../utils/calendar";
import { FormData, RoutineItem, sortRoutineItems, timeToMinutes } from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */
const DEFAULT_IMAGE = require("./assets/images/pixel/breathe.png");
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  const [routineItems, setRoutineItems] = useState<RoutineItem[]>(INITIAL_ROUTINE);
  const [selectedTask, setSelectedTask] = useState<RoutineItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ time: "", task: "", description: "" });
  const [nextInsertionOrder, setNextInsertionOrder] = useState(13);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const { animatedStyle, openAnimation, closeAnimation } = useModalAnimation();
  const sortedRoutineItems = useMemo(() => sortRoutineItems(routineItems), [routineItems]);

  /* -------------------- Data Fetching -------------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          setRoutineItems(parsed);
          setNextInsertionOrder(parsed.length > 0 ? Math.max(...parsed.map((i: RoutineItem) => i.insertionOrder || 0)) + 1 : 1);
        } else {
          // First launch
          setRoutineItems(INITIAL_ROUTINE);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ROUTINE));
        }
      } catch (e) {
        console.error("Failed to load routines.", e);
      }
    };
    loadData();
  }, []);

  // Fetch today's device calendar events
  useEffect(() => {
    getTodaysCalendarEvents().then(setCalendarEvents).catch(() => { });
  }, []);

  const saveRoutines = async (newItems: RoutineItem[]) => {
    try {
      setRoutineItems(newItems);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save routines.", e);
    }
  };

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
      setFormData({ time: item.time, task: item.task, description: item.description });
    } else {
      setEditingId(null);
      setFormData({ time: "", task: "", description: "" });
    }
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingId(null);
    setFormData({ time: "", task: "", description: "" });
  }, []);

  const handleSave = useCallback(() => {
    const { time, task, description } = formData;
    if (!time.trim() || !task.trim() || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields to continue");
      return;
    }

    if (editingId) {
      const updated = routineItems.map((item) => (item.id === editingId ? { ...item, time: time.trim(), task: task.trim(), description: description.trim(), imageKey: formData.imageKey || item.imageKey || "breathe" } : item));
      saveRoutines(updated);
    } else {
      const newItem: RoutineItem = {
        id: Date.now().toString(),
        time: time.trim(),
        task: task.trim(),
        description: description.trim(),
        imageKey: formData.imageKey || "breathe",
        insertionOrder: nextInsertionOrder,
      };
      saveRoutines([...routineItems, newItem]);
      setNextInsertionOrder((prev) => prev + 1);
    }
    closeForm();
  }, [formData, editingId, nextInsertionOrder, closeForm, routineItems, saveRoutines]);

  const handleDelete = useCallback(() => {
    if (!selectedTask) return;
    const taskToDelete = selectedTask;

    if (Platform.OS === 'web') {
      if (window.confirm(`Transfer ${taskToDelete.task} away?`)) {
        const remaining = routineItems.filter((item) => item.id !== taskToDelete.id);
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
            const remaining = routineItems.filter((item) => item.id !== taskToDelete.id);
            saveRoutines(remaining);
            setTimeout(() => closeModal(), 50);
          },
        },
      ]);
    }
  }, [selectedTask, closeModal]);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>TRAINER'S LOG</Text>
        <Text style={styles.headerTitle}>Daily Deck</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardList}>
          {sortedRoutineItems.length === 0 && calendarEvents.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>Your deck is empty!</Text>
              <Text style={styles.emptyStateSub}>Tap the Pokéball below to start building your routine.</Text>
            </View>
          ) : (
            (() => {
              // Merge and sort routine items + calendar events chronologically
              const allItems: Array<{ minutes: number; type: "routine" | "calendar"; data: RoutineItem | CalendarEvent }> = [
                ...sortedRoutineItems.map(r => ({ minutes: timeToMinutes(r.time), type: "routine" as const, data: r })),
                ...calendarEvents.map(e => ({ minutes: e.startMinutes, type: "calendar" as const, data: e })),
              ].sort((a, b) => a.minutes - b.minutes);

              return allItems.map((entry, idx) =>
                entry.type === "routine" ? (
                  <RoutineCard
                    key={(entry.data as RoutineItem).id}
                    item={entry.data as RoutineItem}
                    onPress={openModal}
                  />
                ) : (
                  <CalendarEventCard
                    key={(entry.data as CalendarEvent).id}
                    event={entry.data as CalendarEvent}
                    theme={theme}
                  />
                )
              );
            })()
          )}
        </View>

        {/* Bottom padding for scrolling past FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) - Minimalist Pokéball Style */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => openForm()}
      >
        <View style={styles.fabTop} />
        <View style={styles.fabBottom} />
        <View style={styles.fabCenter} />
        <View style={styles.fabButton} />
      </Pressable>

      {/* Back Button (Absolute Top Left) */}
      <Pressable style={styles.backButtonAbsolute} onPress={() => router.push("/")}>
        <Text style={styles.backButtonText}>←</Text>
      </Pressable>

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
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    /* Header Area */
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      zIndex: 1,
      alignItems: 'flex-start',
    },
    headerSubtitle: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.secondary,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 2,
      opacity: 0.7,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.colors.primary,
      letterSpacing: 0.5,
    },
    backButtonAbsolute: {
      position: "absolute",
      top: Platform.OS === 'ios' ? 60 : 40,
      right: 20,
      padding: 12,
      zIndex: 10,
      backgroundColor: theme.colors.white,
      borderRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    backButtonText: {
      fontSize: 20,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },

    /* Scroll Area */
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 10,
    },
    cardList: {
      gap: 8, // Tighter gap for smaller cards
    },

    /* Minimalist Pokéball FAB */
    fab: {
      position: "absolute",
      bottom: 30,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    fabTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 30,
      backgroundColor: theme.colors.primary,
    },
    fabBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 30,
      backgroundColor: theme.colors.white,
    },
    fabCenter: {
      width: 60,
      height: 6,
      backgroundColor: theme.colors.primary,
      position: 'absolute',
      top: 27,
      zIndex: 2,
    },
    fabButton: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      position: 'absolute',
      top: 21,
      left: 21,
      zIndex: 3,
    },
    fabPressed: {
      transform: [{ scale: 0.95 }],
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