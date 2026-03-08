import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.taskItemWrapper}>
      <Pressable
        style={styles.taskItemContainer}
        onPress={() => onToggle(task.id)}
      >
        <Ionicons
          name={task.completed ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={task.completed ? theme.colors.primary : theme.colors.secondary}
        />

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
        <Pressable
          style={styles.taskActionButton}
          onPress={() => onEdit(task)}
        >
          <Ionicons name="pencil" size={18} color={theme.colors.secondary} />
        </Pressable>

        <Pressable
          style={styles.taskActionButton}
          onPress={() => onDelete(task.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#e57373" />
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
            <Text style={{ marginBottom: 16, color: theme.colors.secondary }}>
              {message}
            </Text>

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
    onSave(trimmed, category);
  };

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
            <Text style={styles.modalTitle}>
              {task ? "Edit Task" : "Add New Task"}
            </Text>

            <TextInput
              style={styles.taskInput}
              placeholder="What do you want to accomplish?"
              placeholderTextColor={theme.colors.secondary}
              value={taskText}
              onChangeText={setTaskText}
              multiline
              autoFocus
            />

            <Text style={styles.categoryLabel}>Category</Text>

            <View style={styles.categoryContainer}>
              <Pressable
                style={[
                  styles.categoryButton,
                  category === "today" && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory("today")}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === "today" && styles.categoryButtonTextActive,
                  ]}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.categoryButton,
                  category === "later" && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory("later")}
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

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {task ? "Update" : "Add Task"}
                </Text>
              </Pressable>
            </View>
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
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  theme: Theme;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (tasks.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          theme={theme}
        />
      ))}
    </View>
  );
};

/* ---------------------- EMPTY STATE ------------------------ */
const EmptyState = ({ styles }: { styles: any }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateText}>📋</Text>
    <Text style={styles.emptyStateTitle}>No tasks yet</Text>
    <Text style={styles.emptyStateSubtitle}>
      Tap "Add New Task" to get started
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

  /* NEW: show in-app confirm modal (more reliable cross-platform) */
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
  };

  if (isLoading) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[sharedStyles.heading, styles.heading]}>✅ My Tasks</Text>

          {tasks.length > 0 && (
            <Text style={styles.progressText}>
              {completedCount}/{tasks.length} completed
            </Text>
          )}
        </View>

        <Pressable
          style={styles.enhancedAddButton}
          onPress={() => {
            setEditingTask(null);
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color={theme.colors.secondary} />
          <Text style={styles.enhancedAddButtonText}>Add New Task</Text>
        </Pressable>

        {/* CLEAR COMPLETED BUTTON */}
        {completedCount > 0 && (
          <Pressable style={styles.clearButton} onPress={handleClearCompleted}>
            <Text style={styles.clearButtonText}>
              Clear Completed ({completedCount})
            </Text>
          </Pressable>
        )}

        <TaskSection
          title="Today's Focus"
          tasks={todayTasks}
          onToggle={handleToggleTask}
          onEdit={(t) => {
            setEditingTask(t);
            setModalVisible(true);
          }}
          onDelete={handleDeleteTask}
          theme={theme}
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
        />

        {tasks.length === 0 && <EmptyState styles={styles} />}
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
      paddingTop: 60,
      paddingBottom: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    header: { marginBottom: theme.spacing.xl },
    heading: { marginBottom: theme.spacing.sm },
    progressText: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    enhancedAddButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      borderStyle: "dashed",
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    enhancedAddButtonText: {
      fontSize: 16,
      color: theme.colors.secondary,
      fontWeight: "600",
    },
    clearButton: {
      backgroundColor: "#ffebee",
      borderWidth: 1,
      borderColor: "#e57373",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
      alignItems: "center",
    },
    clearButtonText: {
      fontSize: 14,
      color: "#c62828",
      fontFamily: theme.fonts.medium,
    },
    sectionContainer: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
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
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    taskItemText: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
      marginLeft: theme.spacing.md,
    },
    taskItemTextDone: {
      textDecorationLine: "line-through",
      color: theme.colors.secondary,
      opacity: 0.6,
    },
    taskActions: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    taskActionButton: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyStateText: { fontSize: 48, marginBottom: theme.spacing.lg },
    emptyStateTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtitle: {
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: theme.colors.secondary,
      textAlign: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
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
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    taskInput: {
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: theme.colors.primary,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: theme.spacing.lg,
    },
    categoryLabel: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    categoryContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    categoryButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      alignItems: "center",
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    categoryButtonTextActive: {
      color: theme.colors.white,
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
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.secondary,
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.white,
    },
  });