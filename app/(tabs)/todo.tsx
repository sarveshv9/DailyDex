import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { TASKS_STORAGE_KEY, STORAGE_KEYS } from "../../constants/storageKeys";
import { useTimerStore } from "../../stores/timerStore";
import { ActiveTimerBadge } from "../../components/common/ActiveTimerBadge";
import { EmptyState as SharedEmptyState } from "../../components/ui/EmptyState";
import { Chip } from "../../components/ui/Chip";
import { themeTokens } from "../../constants/themeTokens";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { addTaskCompleted, removeTaskCompleted } from "../../utils/stats";

/* ---------------------- TYPES & CONSTANTS ------------------------ */
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category: "today" | "later";
}

export type TaskCategory = Task["category"];
export type FilterTab = "all" | "today" | "later";

const STORAGE_KEY = TASKS_STORAGE_KEY;

const generateTaskId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

const createNewTask = (text: string, category: TaskCategory): Task => ({
  id: generateTaskId(),
  text,
  completed: false,
  createdAt: new Date().toISOString(),
  category,
});

/* ---------------------- STORAGE & SYNC ------------------------ */
const loadTasks = async (): Promise<Task[]> => {
  try {
    const localData = await AsyncStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error("Failed to parse local tasks:", e);
      }
    }

    // Migrate from legacy key if it exists
    const legacyData = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_TASKS);
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      } catch (e) {
        console.error("Failed to parse legacy @todo_tasks:", e);
      }
    }

    return [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
};

const saveTasks = async (tasks: Task[]) => {
  try {
    // Save locally immediately
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));


  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};

/* ---------------------- TASK ITEM CARD ------------------------ */
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  theme: Theme;
  isDarkMode: boolean;
}

const TaskItemComponent = ({
  task,
  onToggle,
  onEdit,
  onDelete,
  theme,
  isDarkMode,
}: TaskItemProps) => {
  const router = useRouter();
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const strikeWidth = useSharedValue(task.completed ? 100 : 0);
  const textWidth = useSharedValue(0);

  const checkedProgress = useSharedValue(task.completed ? 1 : 0);

  useEffect(() => {
    if (task.completed) {
      checkedProgress.value = withTiming(1, {
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      strikeWidth.value = withDelay(
        50,
        withTiming(100, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );
    } else {
      checkedProgress.value = withTiming(0, {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      strikeWidth.value = withTiming(0, {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [task.completed, strikeWidth, checkedProgress]);

  const animatedStrikeStyle = useAnimatedStyle(() => ({
    width: (strikeWidth.value / 100) * textWidth.value,
    opacity: strikeWidth.value > 0 ? 0.6 : 0,
  }));

  const animatedCheckboxFillStyle = useAnimatedStyle(() => ({
    opacity: checkedProgress.value,
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.88 + checkedProgress.value * 0.12 }],
    opacity: checkedProgress.value,
  }));

  const handleToggle = useCallback(() => {
    if (!task.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.selectionAsync();
    }
    if (!task.completed && useTimerStore.getState().taskId === task.id) {
      useTimerStore.getState().stopTimer();
    }
    onToggle(task.id);
  }, [task.completed, task.id, onToggle]);

  const handleOpenFocus = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/focus" as any,
      params: { taskId: task.id, taskName: task.text },
    });
  }, [router, task.id, task.text]);

  const handleEditPress = useCallback(
    (e: any) => {
      e.stopPropagation();
      Haptics.selectionAsync();
      onEdit(task);
    },
    [onEdit, task]
  );

  const handleDeletePress = useCallback(
    (e: any) => {
      e.stopPropagation();
      onDelete(task.id);
    },
    [onDelete, task.id]
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
      onPress={handleToggle}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed }}
      accessibilityLabel={`${task.text}, ${task.category === "today" ? "Today priority" : "Later"}, ${task.completed ? "completed" : "not completed"}`}
    >
      {/* Tactile Checkbox */}
      <Pressable
        style={styles.checkboxTouchTarget}
        onPress={handleToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        <View style={styles.checkbox}>
          <Animated.View
            style={[styles.checkboxFill, animatedCheckboxFillStyle]}
          />
          <Animated.View style={checkAnimatedStyle}>
            <Ionicons name="checkmark" size={13} color={theme.colors.onPrimary} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Task Content */}
      <View style={styles.taskContentCol}>
        <View style={styles.taskTextRow}>
          <View style={styles.strikeContainer}>
            <Text
              style={[
                styles.taskTitleText,
                task.completed && styles.taskTitleTextDone,
              ]}
              onLayout={(e) => {
                textWidth.value = e.nativeEvent.layout.width;
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {task.text}
            </Text>
            <Animated.View style={[styles.strikeLine, animatedStrikeStyle]} />
          </View>
        </View>

        {/* Priority & Category Tag Row */}
        <View style={styles.taskMetaRow}>
          <View
            style={[
              styles.categoryTag,
              task.category === "today"
                ? styles.categoryTagToday
                : styles.categoryTagLater,
            ]}
          >
            <Ionicons
              name={task.category === "today" ? "star" : "time-outline"}
              size={11}
              color={
                task.category === "today"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
              style={{ marginRight: 3 }}
            />
            <Text
              style={[
                styles.categoryTagText,
                task.category === "today"
                  ? { color: theme.colors.primary }
                  : { color: theme.colors.textSecondary },
              ]}
            >
              {task.category === "today" ? "Today" : "Later"}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.taskActionsRow}>
        {!task.completed && (
          <ActiveTimerBadge
            taskId={task.id}
            onOpenFocus={handleOpenFocus}
            primaryColor={theme.colors.primary}
            badgeStyle={styles.activeTimerBadge}
            textStyle={styles.activeTimerText}
            fallback={
              <Pressable
                style={styles.iconActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenFocus();
                }}
                hitSlop={8}
                accessibilityLabel="Start Focus Timer"
              >
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </Pressable>
            }
          />
        )}

        {/* Edit Button */}
        <Pressable
          style={styles.iconActionButton}
          onPress={handleEditPress}
          hitSlop={8}
          accessibilityLabel="Edit Task"
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        {/* Delete Button */}
        <Pressable
          style={styles.iconActionButton}
          onPress={handleDeletePress}
          hitSlop={8}
          accessibilityLabel="Delete Task"
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={`${theme.colors.textSecondary}99`}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};

const TaskItem = React.memo(TaskItemComponent);

/* ---------------------- TASK MODAL (ADD / EDIT) ------------------------ */
interface TaskModalProps {
  visible: boolean;
  task: Task | null;
  defaultCategory: TaskCategory;
  onSave: (text: string, category: TaskCategory) => void;
  onDeleteTask?: (id: string) => void;
  onClose: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const TaskModalInner = ({
  task,
  defaultCategory,
  onSave,
  onDeleteTask,
  onClose,
  theme,
  isDarkMode,
}: Omit<TaskModalProps, "visible">) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const [taskText, setTaskText] = useState(task ? task.text : "");
  const [category, setCategory] = useState<TaskCategory>(
    task ? task.category : defaultCategory
  );

  const handleSave = () => {
    const trimmed = taskText.trim();
    if (!trimmed) {
      if (Platform.OS === "web") {
        window.alert("Please enter a task description");
      } else {
        Alert.alert("Task Required", "Please enter what you want to accomplish.");
      }
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmed, category);
  };

  return (
    <View style={styles.modalBackdrop}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.scrim },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalKeyboardAvoid}
      >
        <Pressable style={styles.modalOverlayDismiss} onPress={onClose}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
            {/* Top Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {task ? "Edit Task" : "New Task"}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {task
                    ? "Refine your intention for this item"
                    : "Define a clear, actionable goal"}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.modalCloseButton}
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Task Text Input */}
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInput}
                placeholder="What do you want to accomplish?"
                placeholderTextColor={theme.colors.textSecondary}
                value={taskText}
                onChangeText={setTaskText}
                multiline={false}
                numberOfLines={1}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus
                maxLength={240}
                selectionColor={theme.colors.primary}
              />
              {taskText.length > 0 && (
                <Pressable
                  style={styles.modalInputClearBtn}
                  onPress={() => setTaskText("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear task text"
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Category Chips */}
            <Text style={styles.modalSectionLabel}>Priority & Timeline</Text>
            <View style={styles.categoryChipsRow}>
              <Pressable
                style={[
                  styles.modalCategoryChip,
                  category === "today" && styles.modalCategoryChipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory("today");
                }}
                accessibilityRole="button"
                accessibilityLabel="Priority Today"
                accessibilityState={{ selected: category === "today" }}
              >
                <Ionicons
                  name={category === "today" ? "star" : "star-outline"}
                  size={16}
                  color={
                    category === "today"
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modalCategoryChipText,
                    category === "today" && styles.modalCategoryChipTextActive,
                  ]}
                >
                  Priority (Today)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalCategoryChip,
                  category === "later" && styles.modalCategoryChipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory("later");
                }}
                accessibilityRole="button"
                accessibilityLabel="Later"
                accessibilityState={{ selected: category === "later" }}
              >
                <Ionicons
                  name={category === "later" ? "time" : "time-outline"}
                  size={16}
                  color={
                    category === "later"
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modalCategoryChipText,
                    category === "later" && styles.modalCategoryChipTextActive,
                  ]}
                >
                  Later
                </Text>
              </Pressable>
            </View>

            {/* Primary Action Button - 56px height, 22px border radius */}
            <Pressable
              style={({ pressed }) => [
                styles.modalSaveButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleSave}
            >
              <Ionicons
                name={task ? "checkmark-circle-outline" : "add-circle-outline"}
                size={20}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.modalSaveButtonText}>
                {task ? "Update Task" : "Save Task"}
              </Text>
            </Pressable>

            {/* Delete Task Button if editing an existing task */}
            {task && onDeleteTask && (
              <Pressable
                style={({ pressed }) => [
                  styles.modalDeleteButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  onClose();
                  onDeleteTask(task.id);
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.modalDeleteButtonText}>Delete Task</Text>
              </Pressable>
            )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
};

const TaskModal = ({
  visible,
  task,
  defaultCategory,
  onSave,
  onDeleteTask,
  onClose,
  theme,
  isDarkMode,
}: TaskModalProps) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TaskModalInner
        key={task?.id ?? "new"}
        task={task}
        defaultCategory={defaultCategory}
        onSave={onSave}
        onDeleteTask={onDeleteTask}
        onClose={onClose}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </Modal>
  );
};

/* ---------------------- CONFIRM MODAL ------------------------ */
interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  theme: Theme;
  isDarkMode: boolean;
}

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  onCancel,
  onConfirm,
  theme,
  isDarkMode,
}: ConfirmModalProps) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.scrim },
          ]}
        />
        <View style={styles.confirmCenterWrapper}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.confirmTitle}>{title}</Text>
            <Text style={styles.confirmMessage}>{message}</Text>

            <View style={styles.confirmButtonsRow}>
              <Pressable
                style={[styles.confirmButton, styles.confirmCancelBtn]}
                onPress={onCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, styles.confirmActionBtn]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmActionText}>{confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ---------------------- EMPTY STATE ------------------------ */
interface EmptyStateProps {
  filter: FilterTab;
  onAddTask: () => void;
}

const EmptyState = ({
  filter,
  onAddTask,
}: EmptyStateProps) => {
  const message =
    filter === "today"
      ? "No tasks set for today. Plan your key priorities."
      : filter === "later"
        ? "Nothing pending for later. All caught up!"
        : "A clean slate. Intention is the first step to progress.";

  return (
    <Animated.View
      entering={FadeIn.delay(120).duration(260)}
      layout={LinearTransition.springify()}
    >
      <SharedEmptyState
        title="Clear & Focused"
        description={message}
        actionLabel="Add a Task"
        onAction={onAddTask}
      />
    </Animated.View>
  );
};

/* ---------------------- HEADER COMPONENT (MEMOIZED) ------------------------ */
interface TodoHeaderProps {
  dateFormatted: string;
  completedCount: number;
  tasksCount: number;
  todayTasksCount: number;
  laterTasksCount: number;
  activeFilter: FilterTab;
  onClearCompleted: () => void;
  onSelectFilter: (tab: FilterTab) => void;
  onQuickAdd: (text: string) => void;
  theme: Theme;
  isDarkMode: boolean;
}

const TodoHeaderComponent = ({
  dateFormatted,
  completedCount,
  tasksCount,
  todayTasksCount,
  laterTasksCount,
  activeFilter,
  onClearCompleted,
  onSelectFilter,
  onQuickAdd,
  theme,
  isDarkMode,
}: TodoHeaderProps) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const [quickInputText, setQuickInputText] = useState("");
  const quickInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = quickInputText.trim();
    if (!trimmed) return;
    onQuickAdd(trimmed);
    setQuickInputText("");
    Keyboard.dismiss();
  }, [quickInputText, onQuickAdd]);

  return (
    <View style={styles.heroHeader}>
      {/* Eyebrow, Title & Action */}
      <View style={styles.headerTitleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tasks Hub</Text>
          <Text style={styles.headerEyebrow}>{dateFormatted}</Text>
        </View>

        {completedCount > 0 && (
          <Pressable
            style={styles.clearDoneBtn}
            onPress={onClearCompleted}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear completed tasks"
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.clearDoneBtnText}>Clear done</Text>
          </Pressable>
        )}
      </View>

      {/* Category Filter Tabs */}
      <View style={styles.filterTabsRow} accessibilityRole="tablist">
        {(
          [
            { id: "all", label: "All", count: tasksCount },
            { id: "today", label: "Today", count: todayTasksCount },
            { id: "later", label: "Later", count: laterTasksCount },
          ] as const
        ).map((tab) => (
          <Chip
            key={tab.id}
            label={tab.label}
            selected={activeFilter === tab.id}
            onPress={() => onSelectFilter(tab.id)}
            badgeCount={tab.count}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {/* Quick-Add Inline Input */}
      <View style={styles.quickAddBar}>
        <Ionicons
          name="add-circle-outline"
          size={22}
          color={theme.colors.primary}
          style={{ marginLeft: 2 }}
        />
        <TextInput
          ref={quickInputRef}
          style={styles.quickAddInput}
          placeholder={
            activeFilter === "later"
              ? "Quick-add task for Later..."
              : "Quick-add task for Today..."
          }
          placeholderTextColor={theme.colors.textSecondary}
          value={quickInputText}
          onChangeText={setQuickInputText}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          maxLength={240}
        />
        {quickInputText.length > 0 && (
          <Pressable
            style={styles.quickAddClearBtn}
            onPress={() => setQuickInputText("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        )}
        {quickInputText.trim().length > 0 && (
          <Pressable
            style={styles.quickAddSubmitBtn}
            onPress={handleSubmit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add task"
          >
            <Ionicons name="arrow-up" size={18} color={theme.colors.onPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const TodoHeader = React.memo(TodoHeaderComponent);

/* ---------------------- MAIN TODO SCREEN ------------------------ */
export default function TodoScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    action: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    action: () => { },
  });

  const requestConfirm = useCallback(
    (
      title: string,
      message: string,
      confirmText: string,
      action: () => void
    ) => {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", confirmText],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 0,
            title,
            message,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) action();
          }
        );
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setConfirmState({ visible: true, title, message, confirmText, action });
      }
    },
    []
  );

  // 1. Load tasks on mount and tab focus
  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const loaded = await loadTasks();
    setTasks(loaded);
    setIsLoading(false);
    if (isRefresh) {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const onRefresh = useCallback(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // 2. Persist whenever tasks change
  useEffect(() => {
    if (!isLoading) {
      saveTasks(tasks).catch((e) =>
        console.error("[TodoScreen] saveTasks failed:", e)
      );
    }
  }, [tasks, isLoading]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.category === "today"),
    [tasks]
  );
  const laterTasks = useMemo(
    () => tasks.filter((t) => t.category === "later"),
    [tasks]
  );

  const displayedTasks = useMemo(() => {
    if (activeFilter === "today") return todayTasks;
    if (activeFilter === "later") return laterTasks;
    return tasks;
  }, [activeFilter, todayTasks, laterTasks, tasks]);

  // Task actions - stable callbacks
  const handleSaveTask = useCallback(
    (text: string, category: TaskCategory) => {
      if (editingTask) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id ? { ...task, text, category } : task
          )
        );
      } else {
        const newTask = createNewTask(text, category);
        setTasks((prev) => [newTask, ...prev]);
      }
      setModalVisible(false);
      setEditingTask(null);
    },
    [editingTask]
  );

  const handleQuickAdd = useCallback(
    (text: string) => {
      const defaultCategory: TaskCategory =
        activeFilter === "later" ? "later" : "today";
      const newTask = createNewTask(text, defaultCategory);

      setTasks((prev) => [newTask, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [activeFilter]
  );

  const handleSelectFilter = useCallback((tab: FilterTab) => {
    setActiveFilter(tab);
  }, []);

  const handleToggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newlyCompleted = !t.completed;
          if (newlyCompleted) {
            addTaskCompleted();
          } else {
            removeTaskCompleted(1);
          }
          return { ...t, completed: newlyCompleted };
        }
        return t;
      })
    );
  }, []);

  const handleEditTask = useCallback((t: Task) => {
    setEditingTask(t);
    setModalVisible(true);
  }, []);

  const handleDeleteTask = useCallback(
    (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      requestConfirm(
        "Delete Task?",
        "Are you sure you want to permanently delete this task?",
        "Delete",
        () => {
          if (useTimerStore.getState().taskId === id) {
            useTimerStore.getState().stopTimer();
          }
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }
      );
    },
    [requestConfirm]
  );

  const handleClearCompleted = useCallback(() => {
    if (completedCount === 0) {
      if (Platform.OS === "web") {
        window.alert("There are no completed tasks to clear.");
      } else {
        Alert.alert("No Completed Tasks", "There are no completed tasks to clear.");
      }
      return;
    }

    requestConfirm(
      "Clear Completed?",
      `Are you sure you want to clear ${completedCount} completed task${
        completedCount === 1 ? "" : "s"
      }?`,
      "Clear All",
      () => {
        const completedIds = new Set(
          tasks.filter((t) => t.completed).map((t) => t.id)
        );
        const activeTimerId = useTimerStore.getState().taskId;
        if (activeTimerId && completedIds.has(activeTimerId)) {
          useTimerStore.getState().stopTimer();
        }
        setTasks((prev) => prev.filter((t) => !t.completed));
        setConfirmState((prev) => ({ ...prev, visible: false }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    );
  }, [completedCount, requestConfirm, tasks]);

  const handleOpenAddModal = useCallback(() => {
    setEditingTask(null);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingTask(null);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleConfirmAction = useCallback(() => {
    confirmState.action();
    setConfirmState((prev) => ({ ...prev, visible: false }));
  }, [confirmState]);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <View style={styles.taskCardWrapper}>
        <TaskItem
          task={item}
          onToggle={handleToggleTask}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>
    ),
    [
      handleToggleTask,
      handleEditTask,
      handleDeleteTask,
      theme,
      isDarkMode,
      styles.taskCardWrapper,
    ]
  );

  const renderItemSeparator = useCallback(
    () => <View style={styles.itemSeparator} />,
    [styles.itemSeparator]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <EmptyState filter={activeFilter} onAddTask={handleOpenAddModal} />
      </View>
    ),
    [activeFilter, handleOpenAddModal, styles.emptyContainer]
  );

  // Greeting & Date formatting
  const now = new Date();
  const dateFormatted = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  const renderHeader = useCallback(
    () => (
      <TodoHeader
        dateFormatted={dateFormatted}
        completedCount={completedCount}
        tasksCount={tasks.length}
        todayTasksCount={todayTasks.length}
        laterTasksCount={laterTasks.length}
        activeFilter={activeFilter}
        onClearCompleted={handleClearCompleted}
        onSelectFilter={handleSelectFilter}
        onQuickAdd={handleQuickAdd}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    ),
    [
      dateFormatted,
      completedCount,
      tasks.length,
      todayTasks.length,
      laterTasks.length,
      activeFilter,
      handleClearCompleted,
      handleSelectFilter,
      handleQuickAdd,
      theme,
      isDarkMode,
    ]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlashList
          data={displayedTasks}
          renderItem={renderTaskItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      </KeyboardAvoidingView>

      {/* ── 3. Add / Edit Task Modal ── */}
      <TaskModal
        visible={modalVisible}
        task={editingTask}
        defaultCategory={activeFilter === "later" ? "later" : "today"}
        onSave={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onClose={handleCloseModal}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      {/* ── 4. Confirm Dialog ── */}
      <ConfirmModal
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmAction}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

/* ---------------------- STYLES GENERATOR ------------------------ */
const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const neutralFill = isDarkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.05)";
  const activeTint = `${theme.colors.primary}${theme.glass?.iconTintAlpha ?? (isDarkMode ? "29" : "1C")
    }`;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    mainScrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 110,
    },

    /* Header & Hero */
    heroHeader: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerEyebrow: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      letterSpacing: 1.5,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.display,
      lineHeight: 34,
      color: theme.colors.text,
      letterSpacing: -0.6,
    },
    clearDoneBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: activeTint,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 2,
    },
    clearDoneBtnText: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.primary,
    },

    /* Category Filter Tabs */
    filterTabsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    filterTabButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterTabButtonActive: {
      backgroundColor: activeTint,
      borderColor: theme.colors.primary,
    },
    filterTabLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
    },
    filterTabLabelActive: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    filterTabBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterTabBadgeActive: {
      backgroundColor: theme.colors.primary,
    },
    filterTabBadgeText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
    },
    filterTabBadgeTextActive: {
      color: theme.colors.onPrimary,
    },

    /* Quick-Add Bar */
    quickAddBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 22,
      paddingHorizontal: 14,
      height: 52,
      gap: 10,
    },
    quickAddInput: {
      flex: 1,
      fontFamily: theme.fonts.regular,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    quickAddClearBtn: {
      padding: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    quickAddSubmitBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    /* Task List Section & FlashList wrappers */
    tasksListSection: {
      paddingHorizontal: 20,
      gap: 10,
    },
    taskCardWrapper: {
      paddingHorizontal: 20,
    },
    itemSeparator: {
      height: 10,
    },

    /* Task Card */
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 14,
      elevation: 0,
    },
    checkboxTouchTarget: {
      padding: 4,
      marginRight: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.6,
      borderColor: isDarkMode
        ? "rgba(255,255,255,0.28)"
        : "rgba(0,0,0,0.22)",
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    checkboxFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.primary,
    },

    taskContentCol: {
      flex: 1,
      justifyContent: "center",
      gap: 4,
    },
    taskTextRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    strikeContainer: {
      alignSelf: "flex-start",
      position: "relative",
    },
    taskTitleText: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.text,
      lineHeight: 20,
    },
    taskTitleTextDone: {
      color: theme.colors.textSecondary,
      opacity: 0.65,
    },
    strikeLine: {
      position: "absolute",
      height: 1.5,
      backgroundColor: theme.colors.textSecondary,
      top: "52%",
      left: 0,
      borderRadius: 1,
    },

    taskMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryTag: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
    },
    categoryTagToday: {
      backgroundColor: activeTint,
    },
    categoryTagLater: {
      backgroundColor: neutralFill,
    },
    categoryTagText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      letterSpacing: 0.3,
    },

    taskActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: 8,
    },
    iconActionButton: {
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
      borderColor: theme.colors.border,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 14,
    },
    activeTimerText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.primary,
      fontVariant: ["tabular-nums"],
    },

    /* Empty State */
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: activeTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xl,
      color: theme.colors.text,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
      maxWidth: 280,
    },
    emptyCtaButton: {
      height: 56,
      paddingHorizontal: 28,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.45 : 0.3,
          shadowRadius: 12,
        },
        android: { elevation: 0 },
      }),
    },
    emptyCtaButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.onPrimary,
    },

    /* Modal Styling */
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalKeyboardAvoid: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalOverlayDismiss: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 36 : 24,
      ...Platform.select({
        ios: {
          shadowColor: themeTokens.colors.black,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        },
        android: { elevation: 0 },
      }),
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.2)"
        : "rgba(0,0,0,0.15)",
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
    },
    modalHeaderTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xl,
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    modalHeaderSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: neutralFill,
      alignItems: "center",
      justifyContent: "center",
    },

    modalInputWrapper: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 18,
      padding: 14,
      marginBottom: 18,
    },
    modalInput: {
      fontFamily: theme.fonts.regular,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.text,
      minHeight: 44,
      paddingVertical: 10,
    },

    modalSectionLabel: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    categoryChipsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    modalCategoryChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    modalCategoryChipActive: {
      backgroundColor: activeTint,
      borderColor: theme.colors.primary,
    },
    modalCategoryChipText: {
      fontFamily: theme.fonts.medium,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
    },
    modalCategoryChipTextActive: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },

    /* Standardized 56px height, 22px border radius button */
    modalSaveButton: {
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: isDarkMode ? 0.45 : 0.35,
          shadowRadius: 14,
        },
        android: { elevation: 0 },
      }),
    },
    modalInputClearBtn: {
      position: "absolute",
      right: 12,
      top: 12,
      padding: 4,
    },
    modalSaveButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.onPrimary,
    },
    modalDeleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      marginTop: 12,
      borderRadius: 20,
      backgroundColor: isDarkMode ? "rgba(255, 77, 79, 0.12)" : "rgba(255, 77, 79, 0.08)",
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(255, 77, 79, 0.25)" : "rgba(255, 77, 79, 0.18)",
    },
    modalDeleteButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.primary,
    },

    /* Confirm Dialog */
    confirmCenterWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    confirmCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 26,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 22,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: themeTokens.colors.black,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        },
        android: { elevation: 0 },
      }),
    },
    confirmIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: activeTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    confirmTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.lg,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    confirmMessage: {
      fontFamily: theme.fonts.regular,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
    },
    confirmButtonsRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    confirmButton: {
      flex: 1,
      height: 50,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmCancelBtn: {
      backgroundColor: neutralFill,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    confirmCancelText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.text,
    },
    confirmActionBtn: {
      backgroundColor: theme.colors.primary,
    },
    confirmActionText: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.md,
      color: theme.colors.onPrimary,
    },
  });
};