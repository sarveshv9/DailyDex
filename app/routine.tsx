import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Animated, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import RoutineCard from "../components/RoutineCard";
import TaskForm from "../components/TaskForm";
import TaskModal from "../components/TaskModal";
import { getSharedStyles, Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { FormData, RoutineItem, sortRoutineItems } from "../utils/utils";

/* -------------------- Assets & Constants -------------------- */
const DEFAULT_IMAGE = require("./assets/images/pixel/breathe.png");
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* Initial routine preserved */
const INITIAL_ROUTINE: RoutineItem[] = [
  { id: "1", time: "6:00 AM", task: "Wake Up", description: "A wild day appears! Start gently.", image: require("./assets/images/pixel/wakeup.png"), insertionOrder: 1 },
  { id: "2", time: "6:30 AM", task: "Hydrate", description: "It's super effective! Drink water.", image: require("./assets/images/pixel/water.png"), insertionOrder: 2 },
  { id: "3", time: "7:00 AM", task: "Stretch", description: "Limber up to increase evasion.", image: require("./assets/images/pixel/yoga.png"), insertionOrder: 3 },
  { id: "4", time: "8:00 AM", task: "Tea Time", description: "Restore PP and focus your mind.", image: require("./assets/images/pixel/tea_journal.png"), insertionOrder: 4 },
  { id: "5", time: "9:00 AM", task: "Breakfast", description: "Boost Attack stat with nutrition.", image: require("./assets/images/pixel/breakfast.png"), insertionOrder: 5 },
  { id: "6", time: "10:00 AM", task: "Study", description: "Gain XP in a new skill.", image: require("./assets/images/pixel/study.png"), insertionOrder: 6 },
  { id: "7", time: "1:00 PM", task: "Lunch", description: "Refuel HP for the afternoon.", image: require("./assets/images/pixel/lunch.png"), insertionOrder: 7 },
  { id: "8", time: "3:00 PM", task: "Walk", description: "Encounter nature in the tall grass.", image: require("./assets/images/pixel/walk.png"), insertionOrder: 8 },
  { id: "9", time: "5:00 PM", task: "Reflect", description: "Check your progress badge.", image: require("./assets/images/pixel/reflect.png"), insertionOrder: 9 },
  { id: "10", time: "7:00 PM", task: "Dinner", description: "Share a meal with your party.", image: require("./assets/images/pixel/dinner.png"), insertionOrder: 10 },
  { id: "11", time: "9:00 PM", task: "Wind Down", description: "Lower defense, prepare to rest.", image: require("./assets/images/pixel/prepare_sleep.png"), insertionOrder: 11 },
  { id: "12", time: "10:00 PM", task: "Sleep", description: "Save your game and recharge.", image: require("./assets/images/pixel/sleep.png"), insertionOrder: 12 },
];

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

  const { animatedStyle, openAnimation, closeAnimation } = useModalAnimation();
  const sortedRoutineItems = useMemo(() => sortRoutineItems(routineItems), [routineItems]);

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
      setRoutineItems((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, time: time.trim(), task: task.trim(), description: description.trim() } : item))
      );
    } else {
      const newItem: RoutineItem = {
        id: Date.now().toString(),
        time: time.trim(),
        task: task.trim(),
        description: description.trim(),
        image: DEFAULT_IMAGE,
        insertionOrder: nextInsertionOrder,
      };
      setRoutineItems((prev) => [...prev, newItem]);
      setNextInsertionOrder((prev) => prev + 1);
    }
    closeForm();
  }, [formData, editingId, nextInsertionOrder, closeForm]);

  const handleDelete = useCallback(() => {
    if (!selectedTask) return;
    const taskToDelete = selectedTask;
    Alert.alert("Transfer", `Transfer ${taskToDelete.task} away?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Transfer",
        style: "destructive",
        onPress: () => {
          setRoutineItems((currentItems) => currentItems.filter((item) => item.id !== taskToDelete.id));
          setTimeout(() => closeModal(), 50);
        },
      },
    ]);
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
          {sortedRoutineItems.map((item) => (
             <RoutineCard
               key={item.id}
               item={item}
               onPress={openModal}
             />
          ))}
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
  });