import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSharedStyles, Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import { useTimer } from "../../context/TimerContext";

const STORAGE_KEY = "@todo_tasks";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category: "today" | "later";
}

type TaskCategory = Task["category"];

const generateTaskId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

const createNewTask = (text: string, category: TaskCategory): Task => ({
  id: generateTaskId(),
  text,
  completed: false,
  createdAt: new Date().toISOString(),
  category,
});

const loadTasks = async (): Promise<Task[]> => {
  try {
    const tasksJson = await AsyncStorage.getItem(STORAGE_KEY);
    return tasksJson ? JSON.parse(tasksJson) : [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
};

const saveTasks = async (tasks: Task[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};

/* ---------------------- TASK ITEM ------------------------ */
const TaskItem = ({
  task,
  onToggle,
  onEdit,
  onDelete,
  theme,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  theme: Theme;
}) => {
  const router = useRouter();
  const timer = useTimer();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const isCurrentTimer = timer.taskId === task.id;
  const isTimerActive = isCurrentTimer && timer.isActive;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(task.id);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(task);
  };

  const handleFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Always open the modal to pick time or see the active timer details
    router.push({
      pathname: "/focus" as any,
      params: { taskId: task.id, taskName: task.text },
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.taskItemWrapper}>
      <Pressable
        style={styles.taskItemContainer}
        onPress={handleToggle}
        android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed && (
            <Ionicons name="checkmark" size={16} color={theme.colors.white} />
          )}
        </View>

        <Text
          style={[
            styles.taskItemText,
            task.completed && styles.taskItemTextDone,
          ]}
        >
          {task.text}
        </Text>
      </Pressable>

      <View style={styles.taskActions}>
        {isCurrentTimer && timer.timeLeft > 0 && (
          <Text style={{
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: isTimerActive ? theme.colors.primary : theme.colors.secondary,
            marginRight: 4,
            alignSelf: 'center',
            fontVariant: ["tabular-nums"]
          }}>
            {formatTime(timer.timeLeft)}
          </Text>
        )}
        <Pressable
          style={styles.taskActionButton}
          onPress={handleFocus}
          hitSlop={8}
        >
          <Ionicons
            name={isTimerActive ? "pause" : "play"}
            size={18}
            color={theme.colors.primary}
          />
        </Pressable>

        <Pressable
          style={styles.taskActionButton}
          onPress={handleEdit}
          hitSlop={8}
        >
          <Ionicons name="pencil" size={18} color={theme.colors.secondary} />
        </Pressable>

        <Pressable
          style={styles.taskActionButton}
          onPress={handleDelete}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={`${theme.colors.secondary}80`} />
        </Pressable>
      </View>
    </View>
  );
};

/* ---------------------- CONFIRM MODAL (IN-APP) ------------------------ */
const ConfirmModal = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  theme,
}: {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  theme: Theme;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.modalOverlayPressable} onPress={onCancel}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={onConfirm}
              >
                <Text style={styles.saveButtonText}>Clear</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ---------------------- TASK MODAL ------------------------ */
const TaskModal = ({
  visible,
  task,
  onSave,
  onClose,
  theme,
}: {
  visible: boolean;
  task: Task | null;
  onSave: (text: string, category: TaskCategory) => void;
  onClose: () => void;
  theme: Theme;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [taskText, setTaskText] = useState("");
  const [category, setCategory] = useState<TaskCategory>("today");

  useEffect(() => {
    if (visible) {
      if (task) {
        setTaskText(task.text);
        setCategory(task.category);
      } else {
        setTaskText("");
        setCategory("today");
      }
    }
  }, [visible, task]);

  const handleSave = () => {
    const trimmed = taskText.trim();
    if (!trimmed) {
      if (Platform.OS === 'web') {
        window.alert("Enter a task description");
      } else {
        Alert.alert("Error", "Enter a task description");
      }
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmed, category);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.modalOverlayPressable} onPress={onClose}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {task ? "Edit Task" : "Add Task"}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.taskInput}
              placeholder="What do you want to accomplish?"
              placeholderTextColor={theme.colors.secondary}
              value={taskText}
              onChangeText={setTaskText}
              multiline
              autoFocus
            />

            <Text style={styles.categoryLabel}>Focus Area</Text>

            <View style={styles.categoryContainer}>
              <Pressable
                style={[
                  styles.categoryButton,
                  category === "today" && styles.categoryButtonActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory("today");
                }}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === "today" && styles.categoryButtonTextActive,
                  ]}
                >
                  Priority (Today)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.categoryButton,
                  category === "later" && styles.categoryButtonActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory("later");
                }}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === "later" && styles.categoryButtonTextActive,
                  ]}
                >
                  Later
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.saveActionButton}
              onPress={handleSave}
            >
              <Text style={styles.saveActionButtonText}>
                {task ? "Update Task" : "Save Task"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ---------------------- TASK SECTION ------------------------ */
const TaskSection = ({
  title,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  theme,
  icon
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  theme: Theme;
  icon: keyof typeof Ionicons.glyphMap;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (tasks.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <View style={styles.sectionTasks}>
        {tasks.map((task, index) => (
          <View key={task.id}>
            {index > 0 && <View style={styles.taskDivider} />}
            <TaskItem
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              theme={theme}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

/* ---------------------- EMPTY STATE ------------------------ */
const EmptyState = ({ styles, theme }: { styles: any, theme: Theme }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyStateIconWrap}>
      <Ionicons name="leaf-outline" size={48} color={theme.colors.primary} />
    </View>
    <Text style={styles.emptyStateTitle}>Your mind is clear</Text>
    <Text style={styles.emptyStateSubtitle}>
      Add a new task when you&apos;re ready to focus.
    </Text>
  </View>
);

/* ---------------------- MAIN SCREEN ------------------------ */
export default function TodoScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Confirm modal for clearing
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await loadTasks();
      console.log("[TodoScreen] loaded tasks:", loaded.length);
      setTasks(loaded);
      setIsLoading(false);
    })();
  }, []);

  // Persist whenever tasks change
  useEffect(() => {
    if (!isLoading) {
      saveTasks(tasks).catch((e) =>
        console.error("[TodoScreen] saveTasks failed:", e)
      );
    }
  }, [tasks, isLoading]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const todayTasks = tasks.filter((t) => t.category === "today");
  const laterTasks = tasks.filter((t) => t.category === "later");

  const handleSaveTask = (text: string, category: TaskCategory) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? { ...task, text, category } : task
        )
      );
    } else {
      setTasks((prev) => [...prev, createNewTask(text, category)]);
    }
    setModalVisible(false);
    setEditingTask(null);
  };

  const handleToggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

  const handleDeleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  /* show in-app confirm modal */
  const handleClearCompleted = () => {
    if (completedCount === 0) {
      const msg = "There are no completed tasks to clear.";
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert("No completed tasks", msg);
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmVisible(true);
  };

  const performClearCompleted = () => {
    // Use functional update and immediately persist
    setTasks((prev) => {
      const next = prev.filter((t) => !t.completed);
      // persist immediately to avoid races
      saveTasks(next).catch((e) => console.error("saveTasks:", e));
      console.log(`[TodoScreen] cleared ${prev.length - next.length} completed tasks`);
      return next;
    });
    setConfirmVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={styles.loadingContainer}>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.container}>
      {/* Header Container */}
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>My Tasks</Text>
        {completedCount > 0 && (
          <Pressable style={styles.clearButton} onPress={handleClearCompleted} hitSlop={8}>
            <Text style={styles.clearButtonText}>Clear completed</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.topAddButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditingTask(null);
            setModalVisible(true);
          }}
          android_ripple={{ color: "rgba(0,0,0,0.05)" }}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.topAddButtonText}>Add New Task</Text>
        </Pressable>

        <TaskSection
          title="Priority (Today)"
          tasks={todayTasks}
          onToggle={handleToggleTask}
          onEdit={(t) => {
            setEditingTask(t);
            setModalVisible(true);
          }}
          onDelete={handleDeleteTask}
          theme={theme}
          icon="star"
        />

        <TaskSection
          title="Later"
          tasks={laterTasks}
          onToggle={handleToggleTask}
          onEdit={(t) => {
            setEditingTask(t);
            setModalVisible(true);
          }}
          onDelete={handleDeleteTask}
          theme={theme}
          icon="time"
        />

        {tasks.length === 0 && <EmptyState styles={styles} theme={theme} />}
      </ScrollView>



      <TaskModal
        visible={modalVisible}
        task={editingTask}
        onSave={handleSaveTask}
        onClose={() => {
          setModalVisible(false);
          setEditingTask(null);
        }}
        theme={theme}
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Clear Completed"
        message={`Remove ${completedCount} completed task${completedCount === 1 ? "" : "s"}?`}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={performClearCompleted}
        theme={theme}
      />
    </SafeAreaView>
  );
}

/* ---------------------- STYLES ------------------------ */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContainer: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    // Header
    headerArea: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    screenTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      color: theme.colors.primary,
    },
    clearButton: {
      backgroundColor: `${theme.colors.secondary}15`,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: 20,
    },
    clearButtonText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: theme.colors.primary,
    },

    // Top Add Button
    topAddButton: {
      backgroundColor: `${theme.colors.primary}10`,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}20`,
      borderStyle: 'dashed',
    },
    topAddButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: theme.colors.primary,
    },

    // Section 
    sectionContainer: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 4,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    sectionTasks: {
      gap: 0,
    },

    // Task Item
    taskDivider: {
      height: 1,
      backgroundColor: `${theme.colors.secondary}15`,
      marginVertical: 4,
    },
    taskItemWrapper: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    taskItemContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    checkboxDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    taskItemText: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
    },
    taskItemTextDone: {
      textDecorationLine: "line-through",
      color: theme.colors.secondary,
      opacity: 0.6,
    },
    taskActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    taskActionButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },

    // Empty State
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyStateIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${theme.colors.primary}08`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtitle: {
      fontSize: 15,
      fontFamily: theme.fonts.regular,
      color: theme.colors.secondary,
      textAlign: "center",
      paddingHorizontal: theme.spacing.xl,
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalOverlayPressable: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    modalContainer: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: "100%",
      maxWidth: 400,
      maxHeight: "85%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    modalMessage: {
      fontFamily: theme.fonts.regular,
      fontSize: 16,
      color: theme.colors.secondary,
      marginBottom: theme.spacing.lg,
    },
    taskInput: {
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}30`,
      backgroundColor: `${theme.colors.background}`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: theme.colors.primary,
      minHeight: 120,
      textAlignVertical: "top",
      marginBottom: theme.spacing.lg,
    },
    categoryLabel: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
    },
    categoryContainer: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    categoryButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}30`,
      alignItems: "center",
    },
    categoryButtonActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    categoryButtonTextActive: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
    },

    saveActionButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    saveActionButtonText: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
      fontSize: 16,
    },

    modalButtons: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: `${theme.colors.secondary}15`,
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
  });