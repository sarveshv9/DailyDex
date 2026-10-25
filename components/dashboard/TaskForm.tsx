import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Theme } from "../../styles/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";
import {
  addMinutesToTime,
  FormData,
  getDateString,
  getRoutineIcon,
  RoutineItem,
  SubTask,
  guessRoutineIconKey,
} from "../../utils/utils";
import { TimePicker } from "../ui/TimePicker";
import { DaysOfWeekPicker, DurationPicker, IconPickerModal } from "../forms";
import {
  DAYS_OF_WEEK,
  DURATION_PRESETS,
  formatDuration,
} from "../../hooks/useRoutineTaskForm";

/* ─────────────────────────────── Types ──────────────────────────────── */

export interface TaskFormProps {
  visible: boolean;
  isEditing: boolean;
  formData: FormData & { id?: string };
  initialItem?: RoutineItem;
  onUpdateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
  onBatchSave?: (items: RoutineItem[]) => void;
  onSaveInstance?: () => void;
  onClose: () => void;
  existingRoutines?: RoutineItem[];
  selectedDate?: Date;
}

interface StackedTask {
  id: string;
  task: string;
  time: string;
  duration: number;
  imageKey: string;
  daysOfWeek?: number[];
  notes?: string;
  subtasks?: SubTask[];
  activePicker?: "none" | "time" | "duration" | "repeat" | "details";
}

/* ─────────────────────────────── Constants ──────────────────────────── */

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const QUICK_INSPIRATIONS = [
  { task: "Meditate", duration: 15, icon: "meditate" },
  { task: "Hydrate", duration: 5, icon: "water" },
  { task: "Morning Stretch", duration: 15, icon: "yoga" },
  { task: "Cold Shower", duration: 10, icon: "cold_shower" },
  { task: "Gym Workout", duration: 45, icon: "gym" },
  { task: "Deep Work", duration: 45, icon: "deep_work" },
  { task: "Read", duration: 25, icon: "read" },
  { task: "Journal", duration: 15, icon: "journal" },
  { task: "Wind Down", duration: 20, icon: "prepare_sleep" },
];

/* ─────────────────────────────── Component ──────────────────────────── */

const TaskFormInner: React.FC<TaskFormProps> = ({
  visible,
  isEditing,
  formData,
  onUpdateField,
  onSave,
  onBatchSave,
  onSaveInstance,
  onClose,
  selectedDate,
}) => {
  const { theme, isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));

  /* ── Stacked tasks initialized once per open/identity lifecycle ── */
  const [stackedTasks, setStackedTasks] = useState<StackedTask[]>(() => {
    if (isEditing) return [];
    return [
      {
        id: Date.now().toString(),
        task: formData.task || "",
        time: formData.time || "8:00 AM",
        duration: formData.duration || 30,
        imageKey: formData.imageKey || "breathe",
        daysOfWeek: formData.daysOfWeek && formData.daysOfWeek.length > 0 ? formData.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        notes: formData.description || "",
        subtasks: formData.subtasks || [],
        activePicker: "none",
      },
    ];
  });
  const [editActivePicker, setEditActivePicker] = useState<"none" | "time" | "duration">("none");

  /* ── Icon Picker Modal State ── */
  const [iconPickerTarget, setIconPickerTarget] = useState<{
    type: "editing" | "stacked";
    id?: string;
  } | null>(null);

  /* ── Smooth open/close spring animation ── */
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  /* ── Update a specific task in the stack ── */
  const updateStackedItem = (id: string, updates: Partial<StackedTask>) => {
    setStackedTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;

      const next = [...prev];
      const updated = { ...next[idx], ...updates };

      // If user typed a task name and hasn't manually set an icon, auto-detect
      if (updates.task !== undefined && !updates.imageKey) {
        updated.imageKey = guessRoutineIconKey(updates.task);
      }

      next[idx] = updated;

      // If time or duration changed, automatically chain subsequent items consecutively
      if (updates.time !== undefined || updates.duration !== undefined) {
        let cursor = addMinutesToTime(updated.time, updated.duration);
        for (let i = idx + 1; i < next.length; i++) {
          next[i] = {
            ...next[i],
            time: cursor,
          };
          cursor = addMinutesToTime(cursor, next[i].duration);
        }
      }

      // Sync the first item with outer formData for compatibility
      if (idx === 0) {
        if (updates.task !== undefined) onUpdateField("task", updates.task);
        if (updates.time !== undefined) onUpdateField("time", updates.time);
        if (updates.duration !== undefined) onUpdateField("duration", updates.duration);
        if (updates.imageKey !== undefined) onUpdateField("imageKey", updates.imageKey);
      }

      return next;
    });
  };

  /* ── Add another task to the stack ── */
  const handleAddAnotherTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStackedTasks((prev) => {
      const last = prev[prev.length - 1];
      const nextTime = last ? addMinutesToTime(last.time, last.duration) : "8:00 AM";
      const newItem: StackedTask = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        task: "",
        time: nextTime,
        duration: 20,
        imageKey: "breathe",
        daysOfWeek: last?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        notes: "",
        subtasks: [],
        activePicker: "none",
      };
      return [...prev, newItem];
    });
  };

  /* ── Remove a stacked task ── */
  const handleRemoveStackedTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStackedTasks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((t) => t.id !== id);
    });
  };

  /* ── Apply quick inspiration to the currently active/first task ── */
  const applyInspiration = (item: typeof QUICK_INSPIRATIONS[number]) => {
    Haptics.selectionAsync();
    if (isEditing) {
      onUpdateField("task", item.task);
      onUpdateField("duration", item.duration);
      onUpdateField("imageKey", item.icon);
    } else {
      setStackedTasks((prev) => {
        if (prev.length === 0) return prev;
        const targetIdx = prev.findIndex((t) => !t.task.trim());
        const idx = targetIdx !== -1 ? targetIdx : prev.length - 1;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          task: item.task,
          duration: item.duration,
          imageKey: item.icon,
        };
        if (idx === 0) {
          onUpdateField("task", item.task);
          onUpdateField("duration", item.duration);
          onUpdateField("imageKey", item.icon);
        }
        return next;
      });
    }
  };

  /* ── Icon Selection from Modal ── */
  const handleSelectIcon = (chosenKey: string) => {
    Haptics.selectionAsync();
    if (!iconPickerTarget) return;

    if (iconPickerTarget.type === "editing") {
      onUpdateField("imageKey", chosenKey);
    } else if (iconPickerTarget.type === "stacked" && iconPickerTarget.id) {
      updateStackedItem(iconPickerTarget.id, { imageKey: chosenKey });
    }

    setIconPickerTarget(null);
  };

  /* ── Master Save Handler ── */
  const handleSaveAll = () => {
    if (isEditing) {
      if (!formData.task.trim() || !formData.time.trim()) {
        Alert.alert("Missing Information", "Please enter a task name and start time.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      return;
    }

    const validTasks = stackedTasks.filter((t) => t.task.trim().length > 0);
    if (validTasks.length === 0) {
      Alert.alert("Empty Task", "Please enter at least one task name.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (validTasks.length === 1) {
      const first = validTasks[0];
      onUpdateField("task", first.task.trim());
      onUpdateField("time", first.time);
      onUpdateField("duration", first.duration);
      onUpdateField("imageKey", first.imageKey);
      onUpdateField("description", first.notes || "");
      onUpdateField("daysOfWeek", first.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
      onSave();
    } else {
      const finalDate = selectedDate ? getDateString(selectedDate) : undefined;
      const routineItems: RoutineItem[] = validTasks.map((t, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        time: t.time,
        task: t.task.trim(),
        description: t.notes?.trim() || "",
        imageKey: t.imageKey || guessRoutineIconKey(t.task),
        duration: t.duration,
        date: finalDate,
        daysOfWeek: t.daysOfWeek && t.daysOfWeek.length > 0 ? t.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        subtasks: t.subtasks || [],
      }));
      onBatchSave?.(routineItems);
    }
  };

  /* ── Calculate total sequence summary for stacked tasks ── */
  const sequenceSummary = useMemo(() => {
    if (stackedTasks.length <= 1) return null;
    const totalMins = stackedTasks.reduce((sum, t) => sum + t.duration, 0);
    const firstTime = stackedTasks[0].time;
    const endTime = addMinutesToTime(firstTime, totalMins);
    return {
      count: stackedTasks.length,
      totalDuration: formatDuration(totalMins),
      timeRange: `${firstTime} – ${endTime}`,
    };
  }, [stackedTasks]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: slideAnim.interpolate({
              inputRange: [0, SCREEN_HEIGHT],
              outputRange: [1, 0],
              extrapolate: "clamp",
            }),
          },
        ]}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)" },
            ]}
          />
        ) : (
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={Platform.OS === "ios" ? 25 : 45}
            tint={isDark ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
          />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          testID="task-form-content"
        >
          {Platform.OS === "web" ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? theme.colors.card : theme.colors.background },
              ]}
            />
          ) : (
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={Platform.OS === "ios" ? 70 : 100}
              tint={isDark ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
            />
          )}

          {/* ── Drag Handle ── */}
          <View style={styles.handle} />

          {/* ── Minimal Header ── */}
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
              hitSlop={12}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              {isEditing ? "Edit Ritual" : "New Ritual"}
            </Text>

            <Pressable
              onPress={handleSaveAll}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              testID="task-form-save-btn"
              hitSlop={8}
            >
              <Text style={styles.saveText}>
                {stackedTasks.length > 1 ? `Save (${stackedTasks.length})` : "Save"}
              </Text>
            </Pressable>
          </View>

          {/* ── Scrollable Body ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Subtle Inspiration Bar (New Task only) ── */}
            {!isEditing && (
              <View style={styles.inspirationSection}>
                <Text style={styles.inspirationLabel}>
                  Quick suggestions (or type any task below):
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.inspirationScroll}
                >
                  {QUICK_INSPIRATIONS.map((item, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.inspirationChip,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => applyInspiration(item)}
                    >
                      <Ionicons
                        name={getRoutineIcon(item.icon)}
                        size={14}
                        color={theme.colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.inspirationText}>{item.task}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODE A: EDITING AN EXISTING TASK
               ══════════════════════════════════════════════════════════ */}
            {isEditing ? (
              <View style={styles.taskCard}>
                <View style={styles.taskInputRow}>
                  {/* Tap icon circle to choose any custom icon */}
                  <Pressable
                    style={styles.iconCircle}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIconPickerTarget({ type: "editing" });
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={getRoutineIcon(formData.imageKey) || "pencil-outline"}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <View style={styles.iconEditPencilDot}>
                      <Ionicons name="pencil" size={8} color={theme.colors.white} />
                    </View>
                  </Pressable>

                  <TextInput
                    style={styles.taskTitleInput}
                    value={formData.task}
                    onChangeText={(t) => {
                      onUpdateField("task", t);
                      onUpdateField("imageKey", guessRoutineIconKey(t));
                    }}
                    placeholder="Ritual name..."
                    placeholderTextColor={`${theme.colors.textSecondary}50`}
                    autoFocus
                  />
                </View>

                {/* Pill Controls */}
                <View style={styles.pillsRow}>
                  <Pressable
                    style={[
                      styles.controlPill,
                      editActivePicker === "time" && styles.controlPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditActivePicker((prev) => (prev === "time" ? "none" : "time"));
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={editActivePicker === "time" ? theme.colors.white : theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.controlPillText,
                        editActivePicker === "time" && { color: theme.colors.white },
                      ]}
                    >
                      {formData.time || "Set time"}
                    </Text>
                    <Ionicons
                      name={editActivePicker === "time" ? "chevron-up" : "chevron-down"}
                      size={12}
                      color={editActivePicker === "time" ? theme.colors.white : theme.colors.textSecondary}
                    />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.controlPill,
                      editActivePicker === "duration" && styles.controlPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditActivePicker((prev) => (prev === "duration" ? "none" : "duration"));
                    }}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={15}
                      color={editActivePicker === "duration" ? theme.colors.white : theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.controlPillText,
                        editActivePicker === "duration" && { color: theme.colors.white },
                      ]}
                    >
                      {formData.duration || 30}m
                    </Text>
                    <Ionicons
                      name={editActivePicker === "duration" ? "chevron-up" : "chevron-down"}
                      size={12}
                      color={editActivePicker === "duration" ? theme.colors.white : theme.colors.textSecondary}
                    />
                  </Pressable>
                </View>

                {/* Time Picker Accordion */}
                {editActivePicker === "time" && (
                  <View style={styles.accordionBox}>
                    <TimePicker
                      value={formData.time || "8:00 AM"}
                      onChange={(t) => onUpdateField("time", t)}
                    />
                  </View>
                )}

                {/* Duration Picker Accordion */}
                {editActivePicker === "duration" && (
                  <View style={styles.accordionBox}>
                    <DurationPicker
                      selectedDuration={formData.duration || 30}
                      onChange={(dur) => onUpdateField("duration", dur)}
                      activeColor={theme.colors.primary}
                    />
                  </View>
                )}

                {/* Repeat Days */}
                <View style={styles.repeatRow}>
                  <DaysOfWeekPicker
                    selectedDays={formData.daysOfWeek ?? []}
                    onChange={(days) => onUpdateField("daysOfWeek", days)}
                    activeColor={theme.colors.primary}
                  />
                </View>

                {/* Notes Input */}
                <TextInput
                  style={styles.notesInput}
                  value={formData.description}
                  onChangeText={(t) => onUpdateField("description", t)}
                  placeholder="Add intention or note (optional)..."
                  placeholderTextColor={`${theme.colors.textSecondary}40`}
                  multiline
                />

                {/* Save for this date only */}
                {isEditing && (formData.daysOfWeek?.length ?? 0) > 0 && onSaveInstance && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveInstanceBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSaveInstance();
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.saveInstanceText}>Apply to this date only</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              /* ══════════════════════════════════════════════════════════
                  MODE B: MINIMAL STACKED TASK CREATION FLOW
                 ══════════════════════════════════════════════════════════ */
              <View style={styles.stackedList}>
                {/* Consecutive Sequence summary pill if more than 1 task */}
                {sequenceSummary && (
                  <View style={styles.sequenceSummaryBar}>
                    <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                    <Text style={styles.sequenceSummaryText}>
                      Sequence: {sequenceSummary.count} rituals • {sequenceSummary.timeRange} (
                      {sequenceSummary.totalDuration})
                    </Text>
                  </View>
                )}

                {stackedTasks.map((item, index) => {
                  const isFirst = index === 0;

                  return (
                    <View key={item.id} style={styles.taskCard}>
                      {/* Top Row: Icon + Task Title + Delete */}
                      <View style={styles.taskInputRow}>
                        {/* Tap icon circle to pick ANY icon */}
                        <Pressable
                          style={styles.iconCircle}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIconPickerTarget({ type: "stacked", id: item.id });
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={getRoutineIcon(item.imageKey)}
                            size={20}
                            color={theme.colors.primary}
                          />
                          <View style={styles.iconEditPencilDot}>
                            <Ionicons name="pencil" size={8} color={theme.colors.white} />
                          </View>
                        </Pressable>

                        <TextInput
                          style={styles.taskTitleInput}
                          value={item.task}
                          onChangeText={(t) => updateStackedItem(item.id, { task: t })}
                          placeholder={
                            isFirst
                              ? "Type any task (e.g. Walk Dog, Clean)..."
                              : "Next task in flow..."
                          }
                          placeholderTextColor={`${theme.colors.textSecondary}50`}
                          autoFocus={isFirst}
                          returnKeyType="done"
                        />

                        {stackedTasks.length > 1 && (
                          <Pressable
                            style={styles.cardDeleteBtn}
                            onPress={() => handleRemoveStackedTask(item.id)}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close"
                              size={18}
                              color={`${theme.colors.textSecondary}70`}
                            />
                          </Pressable>
                        )}
                      </View>

                      {/* Pill Controls: Time & Duration */}
                      <View style={styles.pillsRow}>
                        {/* Time Pill */}
                        <Pressable
                          style={[
                            styles.controlPill,
                            item.activePicker === "time" && styles.controlPillActive,
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            updateStackedItem(item.id, {
                              activePicker: item.activePicker === "time" ? "none" : "time",
                            });
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={item.activePicker === "time" ? theme.colors.white : theme.colors.primary}
                          />
                          <Text
                            style={[
                              styles.controlPillText,
                              item.activePicker === "time" && { color: theme.colors.white },
                            ]}
                          >
                            {item.time}
                          </Text>
                          <Ionicons
                            name={item.activePicker === "time" ? "chevron-up" : "chevron-down"}
                            size={12}
                            color={item.activePicker === "time" ? theme.colors.white : theme.colors.textSecondary}
                          />
                        </Pressable>

                        {/* Duration Pill */}
                        <Pressable
                          style={[
                            styles.controlPill,
                            item.activePicker === "duration" && styles.controlPillActive,
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            updateStackedItem(item.id, {
                              activePicker: item.activePicker === "duration" ? "none" : "duration",
                            });
                          }}
                        >
                          <Ionicons
                            name="hourglass-outline"
                            size={14}
                            color={item.activePicker === "duration" ? theme.colors.white : theme.colors.primary}
                          />
                          <Text
                            style={[
                              styles.controlPillText,
                              item.activePicker === "duration" && { color: theme.colors.white },
                            ]}
                          >
                            {item.duration}m
                          </Text>
                          <Ionicons
                            name={item.activePicker === "duration" ? "chevron-up" : "chevron-down"}
                            size={12}
                            color={item.activePicker === "duration" ? theme.colors.white : theme.colors.textSecondary}
                          />
                        </Pressable>

                        {/* Repeat Pill (shows on EVERY task) */}
                        <Pressable
                          style={[
                            styles.controlPill,
                            item.activePicker === "repeat" && styles.controlPillActive,
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            updateStackedItem(item.id, {
                              activePicker: item.activePicker === "repeat" ? "none" : "repeat",
                            });
                          }}
                        >
                          <Ionicons
                            name="repeat-outline"
                            size={14}
                            color={item.activePicker === "repeat" ? theme.colors.white : theme.colors.primary}
                          />
                          <Text
                            style={[
                              styles.controlPillText,
                              item.activePicker === "repeat" && { color: theme.colors.white },
                            ]}
                          >
                            {(item.daysOfWeek ?? []).length === 7
                              ? "Daily"
                              : (item.daysOfWeek ?? []).length === 5 && !(item.daysOfWeek ?? []).includes(0) && !(item.daysOfWeek ?? []).includes(6)
                              ? "Weekdays"
                              : (item.daysOfWeek ?? []).length === 2 && (item.daysOfWeek ?? []).includes(0) && (item.daysOfWeek ?? []).includes(6)
                              ? "Weekends"
                              : (item.daysOfWeek ?? []).length === 0
                              ? "Once"
                              : `${(item.daysOfWeek ?? []).length}d/wk`}
                          </Text>
                          <Ionicons
                            name={item.activePicker === "repeat" ? "chevron-up" : "chevron-down"}
                            size={12}
                            color={item.activePicker === "repeat" ? theme.colors.white : theme.colors.textSecondary}
                          />
                        </Pressable>
                      </View>

                      {/* Expandable Time Picker */}
                      {item.activePicker === "time" && (
                        <View style={styles.accordionBox}>
                          <TimePicker
                            value={item.time}
                            onChange={(newTime) => updateStackedItem(item.id, { time: newTime })}
                          />
                        </View>
                      )}

                      {/* Expandable Duration Presets */}
                      {item.activePicker === "duration" && (
                        <View style={styles.accordionBox}>
                          <View style={styles.durPresetRow}>
                            {DURATION_PRESETS.map((mins) => (
                              <Pressable
                                key={mins}
                                style={[
                                  styles.durChip,
                                  item.duration === mins && {
                                    backgroundColor: theme.colors.primary,
                                    borderColor: theme.colors.primary,
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  updateStackedItem(item.id, { duration: mins, activePicker: "none" });
                                }}
                              >
                                <Text
                                  style={[
                                    styles.durChipText,
                                    item.duration === mins && { color: theme.colors.white },
                                  ]}
                                >
                                  {mins}m
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Expandable Repeat Days */}
                      {item.activePicker === "repeat" && (
                        <View style={styles.accordionBox}>
                          <View style={styles.repeatRow}>
                            {DAYS_OF_WEEK.map((day) => {
                              const active = (item.daysOfWeek ?? []).includes(day.value);
                              return (
                                <TouchableOpacity
                                  key={day.value}
                                  style={[
                                    styles.dayCircle,
                                    active && { backgroundColor: theme.colors.primary },
                                  ]}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    const current = item.daysOfWeek ?? [];
                                    const next = current.includes(day.value)
                                      ? current.filter((d) => d !== day.value)
                                      : [...current, day.value].sort();
                                    updateStackedItem(item.id, { daysOfWeek: next });
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.dayCircleText,
                                      active && { color: theme.colors.white },
                                    ]}
                                  >
                                    {day.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Quick Presets for Days */}
                          <View style={styles.repeatPresetRow}>
                            {[
                              { label: "Daily", days: [0, 1, 2, 3, 4, 5, 6] },
                              { label: "Weekdays", days: [1, 2, 3, 4, 5] },
                              { label: "Weekends", days: [0, 6] },
                            ].map((preset) => {
                              const isSelected =
                                (item.daysOfWeek ?? []).length === preset.days.length &&
                                preset.days.every((d) => (item.daysOfWeek ?? []).includes(d));
                              return (
                                <Pressable
                                  key={preset.label}
                                  style={[
                                    styles.repeatPresetChip,
                                    isSelected && styles.repeatPresetChipActive,
                                  ]}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    updateStackedItem(item.id, { daysOfWeek: preset.days });
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.repeatPresetText,
                                      isSelected && { color: theme.colors.primary, fontFamily: theme.fonts.bold },
                                    ]}
                                  >
                                    {preset.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* ── "+ Add another ritual" button ── */}
                <Pressable
                  style={({ pressed }) => [
                    styles.addAnotherCardBtn,
                    pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={handleAddAnotherTask}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={theme.colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.addAnotherCardText}>Add another ritual to flow</Text>
                </Pressable>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* ══════════════════════════════════════════════════════════
              ICON PICKER MODAL (FOR ANY CUSTOM RITUAL)
             ══════════════════════════════════════════════════════════ */}
          <IconPickerModal
            visible={!!iconPickerTarget}
            onClose={() => setIconPickerTarget(null)}
            onSelectIcon={(iconKey) => handleSelectIcon(iconKey)}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────── Styles ─────────────────────────────── */

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.glass.cardBg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 10,
      paddingBottom: 34,
      height: SCREEN_HEIGHT * 0.85,
      maxHeight: SCREEN_HEIGHT * 0.92,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.16,
          shadowRadius: 18,
        },
        android: { elevation: 20 },
      }),
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.colors.text}20`,
      alignSelf: "center",
      marginBottom: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.text}10`,
    },
    headerBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
      minWidth: 50,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    saveBtn: {
      paddingVertical: 7,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      alignItems: "center",
    },
    saveText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 12,
    },

    /* ── Quick Inspiration Bar ── */
    inspirationSection: {
      marginBottom: 14,
    },
    inspirationLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      marginLeft: 2,
    },
    inspirationScroll: {
      gap: 8,
      paddingRight: 10,
    },
    inspirationChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.text}08`,
      borderWidth: 1,
      borderColor: `${theme.colors.text}0E`,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    inspirationText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },

    /* ── Stacked List ── */
    stackedList: {
      gap: 12,
    },
    sequenceSummaryBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 14,
      gap: 8,
      marginBottom: 2,
    },
    sequenceSummaryText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      flex: 1,
    },

    /* ── Minimalist Task Card ── */
    taskCard: {
      backgroundColor: `${theme.colors.text}08`,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: `${theme.colors.text}0E`,
      padding: 14,
      gap: 12,
    },
    taskInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative",
    },
    iconEditPencilDot: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.colors.card,
    },
    taskTitleInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      padding: 0,
      margin: 0,
    },
    cardDeleteBtn: {
      padding: 4,
    },

    /* ── Clean Control Pills ── */
    pillsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    controlPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.text}0A`,
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: 14,
      gap: 5,
    },
    controlPillActive: {
      backgroundColor: theme.colors.primary,
    },
    controlPillText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* ── Accordion Box for Time / Duration ── */
    accordionBox: {
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${theme.colors.text}10`,
    },
    durPresetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingVertical: 4,
    },
    durChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: `${theme.colors.text}08`,
      borderWidth: 1,
      borderColor: "transparent",
    },
    durChipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── Repeat Days ── */
    repeatRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.text}0A`,
    },
    dayCircleText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
    },
    repeatPresetRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    repeatPresetChip: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: `${theme.colors.text}08`,
      borderWidth: 1,
      borderColor: "transparent",
    },
    repeatPresetChipActive: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}40`,
    },
    repeatPresetText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── Notes Input ── */
    notesInput: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.text,
      padding: 8,
      backgroundColor: `${theme.colors.text}05`,
      borderRadius: 12,
      minHeight: 50,
      textAlignVertical: "top",
    },

    /* ── Save Instance Option ── */
    saveInstanceBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
    },
    saveInstanceText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── "+ Add another ritual" dashed button ── */
    addAnotherCardBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.text}05`,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${theme.colors.primary}50`,
      paddingVertical: 14,
      borderRadius: 20,
    },
    addAnotherCardText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },

    /* ── Icon Picker Modal ── */
    iconModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    iconModalCard: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 18,
      maxHeight: SCREEN_HEIGHT * 0.65,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        },
        android: { elevation: 12 },
      }),
    },
    iconModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    iconModalTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    iconModalSub: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    iconModalCloseBtn: {
      padding: 4,
    },
    iconCatTabs: {
      gap: 8,
      paddingBottom: 12,
    },
    iconCatTab: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: `${theme.colors.text}0A`,
    },
    iconCatTabActive: {
      backgroundColor: theme.colors.primary,
    },
    iconCatTabText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
    },
    iconGridScroll: {
      maxHeight: 260,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      paddingVertical: 6,
    },
    iconGridItem: {
      width: "22%",
      alignItems: "center",
      gap: 6,
    },
    iconGridCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}14`,
      alignItems: "center",
      justifyContent: "center",
    },
    iconGridLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
      textAlign: "center",
    },
  });

export const TaskForm: React.FC<TaskFormProps> = (props) => {
  const { visible, isEditing, formData, initialItem } = props;
  const editId = initialItem?.id || formData.id || "edit";
  const formKey = visible ? (isEditing ? editId : "create") : "closed";
  return <TaskFormInner key={formKey} {...props} />;
};

export default TaskForm;
