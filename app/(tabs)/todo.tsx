import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import * as Haptics from "../../utils/haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
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
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSharedStyles, Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import { useTimer } from "../../context/TimerContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@zen_tasks";

const loadTasks = async (): Promise<Task[]> => {
  try {
    let finalTasks: Task[] | null = null;
    let localTasks: Task[] | null = null;
    
    // 1. Load from local storage
    const localData = await AsyncStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        localTasks = JSON.parse(localData);
      } catch (e) {}
    }

    // 2. Fetch from Supabase if authenticated
    const { data: userAuth } = await supabase.auth.getUser();
    
    if (userAuth?.user) {
      const { data: stored, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
      
      if (!error && stored && stored.length > 0) {
        // Remote data exists, use it and update local
        finalTasks = stored.map(d => ({
          id: d.id,
          text: d.text,
          completed: d.completed,
          category: d.category,
          createdAt: d.created_at
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalTasks));
        
      } else if (localTasks && localTasks.length > 0) {
        // No remote data but local data exists, sync local to remote
        finalTasks = localTasks;
        const dbTasks = localTasks.map((t) => ({
          id: t.id,
          user_id: userAuth.user.id,
          text: t.text,
          completed: t.completed,
          category: t.category,
          created_at: t.createdAt
        }));
        await supabase.from('tasks').insert(dbTasks);
      }
    }

    // 3. Fallback to local if unauthenticated or Supabase failed
    if (!finalTasks && localTasks) {
      finalTasks = localTasks;
    }

    return finalTasks || [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
};

const saveTasks = async (tasks: Task[]) => {
  try {
    // Immediately save locally
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    
    // Sync to Supabase if authenticated
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    
    // Handle remote deletes
    const { data: remoteData } = await supabase.from('tasks').select('id');
    const remoteRecordIds = remoteData ? remoteData.map((t: any) => t.id) : [];
    
    const incomingIds = tasks.map(t => t.id);
    const toDeleteIds = remoteRecordIds.filter(id => !incomingIds.includes(id));
    
    if (toDeleteIds.length > 0) {
      await supabase.from('tasks').delete().in('id', toDeleteIds);
    }
    
    // Handle remote inserts/updates
    const dbTasks = tasks.map((t) => ({
      id: t.id,
      user_id: user.user.id,
      text: t.text,
      completed: t.completed,
      category: t.category,
      created_at: t.createdAt
    }));
    
    if (dbTasks.length > 0) {
      await supabase.from('tasks').upsert(dbTasks);
    }
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

  const strikeWidth = useSharedValue(task.completed ? 100 : 0);
  const textWidth = useSharedValue(0);

  useEffect(() => {
    if (task.completed) {
      strikeWidth.value = withDelay(100, withTiming(100, { duration: 250 }));
    } else {
      strikeWidth.value = withTiming(0, { duration: 180 });
    }
  }, [task.completed, strikeWidth]);

  const animatedStrikeStyle = useAnimatedStyle(() => ({
    width: (strikeWidth.value / 100) * textWidth.value,
    opacity: strikeWidth.value > 0 ? 0.55 : 0,
  }));

  const isCurrentTimer = timer.taskId === task.id;
  const isTimerActive = isCurrentTimer && timer.isActive;

  const handleToggle = () => {
    onToggle(task.id);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(task.id);
  };

  const handleEdit = () => {
    onEdit(task);
  };

  const handleFocus = () => {
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

  const ActionButton = ({ onPress, icon, color }: { onPress: () => void, icon: any, color: string }) => {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        style={[styles.taskActionButton, animStyle]}
        onPressIn={() => { scale.value = withSpring(0.85, { damping: 18, stiffness: 200 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 180 }); }}
        onPress={onPress}
        hitSlop={8}
      >
        <Ionicons name={icon} size={18} color={color} />
      </AnimatedPressable>
    );
  };

  return (
    <View style={styles.taskItemWrapper}>
      <Pressable
        style={styles.taskItemContainer}
        onPress={handleToggle}
        android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      >
        <View style={styles.checkboxWrapper}>
          <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
            {task.completed && (
              <Ionicons name="checkmark" size={14} color={theme.colors.white} />
            )}
          </View>
        </View>

        <View style={styles.taskTextContainer}>
          <View style={styles.strikeContainer}>
            <Text
              style={[
                styles.taskItemText,
                task.completed && styles.taskItemTextDone,
              ]}
              onLayout={(e) => { textWidth.value = e.nativeEvent.layout.width; }}
            >
              {task.text}
            </Text>
            <Animated.View style={[styles.strikeThrough, animatedStrikeStyle]} />
          </View>
        </View>
      </Pressable>

      <View style={styles.taskActions}>
        {isCurrentTimer && timer.timeLeft > 0 && (
          <Text style={[
            styles.timerText,
            isTimerActive ? styles.timerTextActive : styles.timerTextPaused,
          ]}>
            {formatTime(timer.timeLeft)}
          </Text>
        )}
        <ActionButton
          onPress={handleFocus}
          icon={isTimerActive ? "pause" : "play"}
          color={theme.colors.primary}
        />
        <ActionButton
          onPress={handleEdit}
          icon="pencil"
          color={theme.colors.secondary}
        />
        <ActionButton
          onPress={handleDelete}
          icon="trash-outline"
          color={`${theme.colors.secondary}80`}
        />
      </View>
    </View>
  );
};

/* ---------------------- CONFIRM MODAL (IN-APP) ------------------------ */
const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  onCancel,
  onConfirm,
  theme,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  theme: Theme;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const cancelScale = useSharedValue(1);
  const confirmScale = useSharedValue(1);
  const cancelStyle = useAnimatedStyle(() => ({ transform: [{ scale: cancelScale.value }] }));
  const confirmStyle = useAnimatedStyle(() => ({ transform: [{ scale: confirmScale.value }] }));

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
              <AnimatedPressable
                style={[styles.modalButton, styles.cancelButton, cancelStyle]}
                onPressIn={() => { cancelScale.value = withSpring(0.95, { damping: 18 }); }}
                onPressOut={() => { cancelScale.value = withSpring(1, { damping: 12 }); }}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.modalButton, styles.saveButton, confirmStyle]}
                onPressIn={() => { confirmScale.value = withSpring(0.95, { damping: 18 }); }}
                onPressOut={() => { confirmScale.value = withSpring(1, { damping: 12 }); }}
                onPress={onConfirm}
              >
                <Text style={styles.saveButtonText}>{confirmText}</Text>
              </AnimatedPressable>
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

  const todayBtnScale = useSharedValue(1);
  const laterBtnScale = useSharedValue(1);
  const saveBtnScale = useSharedValue(1);

  const todayBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: todayBtnScale.value }] }));
  const laterBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: laterBtnScale.value }] }));
  const saveBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveBtnScale.value }] }));

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
              <AnimatedPressable
                style={[
                  styles.categoryButton,
                  category === "today" && styles.categoryButtonActive,
                  todayBtnStyle,
                ]}
                onPressIn={() => { todayBtnScale.value = withSpring(0.95, { damping: 18 }); }}
                onPressOut={() => { todayBtnScale.value = withSpring(1, { damping: 12 }); }}
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
              </AnimatedPressable>

              <AnimatedPressable
                style={[
                  styles.categoryButton,
                  category === "later" && styles.categoryButtonActive,
                  laterBtnStyle,
                ]}
                onPressIn={() => { laterBtnScale.value = withSpring(0.95, { damping: 18 }); }}
                onPressOut={() => { laterBtnScale.value = withSpring(1, { damping: 12 }); }}
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
              </AnimatedPressable>
            </View>

            <AnimatedPressable
              style={[styles.saveActionButton, saveBtnStyle]}
              onPressIn={() => { saveBtnScale.value = withSpring(0.96, { damping: 18 }); }}
              onPressOut={() => { saveBtnScale.value = withSpring(1, { damping: 12 }); }}
              onPress={handleSave}
            >
              <Text style={styles.saveActionButtonText}>
                {task ? "Update Task" : "Save Task"}
              </Text>
            </AnimatedPressable>
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
  icon,
  delayIndex = 0
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  theme: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  delayIndex?: number;
}) => {
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (tasks.length === 0) return null;

  const completedInSection = tasks.filter((t) => t.completed).length;

  return (
    <Animated.View
      style={styles.sectionContainer}
      entering={FadeIn.delay(delayIndex * 80 + 80).duration(200)}
      layout={LinearTransition.duration(200)}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>
            {completedInSection}/{tasks.length}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTasks}>
        {tasks.map((task, index) => (
          <Animated.View
            key={task.id}
            entering={FadeIn.delay(index * 30).duration(180)}
            exiting={FadeOut.duration(150)}
            layout={LinearTransition.duration(200)}
          >
            {index > 0 && <View style={styles.taskDivider} />}
            <TaskItem
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              theme={theme}
            />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

/* ---------------------- EMPTY STATE ------------------------ */
const EmptyState = ({ styles, theme }: { styles: any, theme: Theme }) => (
  <Animated.View
    style={styles.emptyState}
    entering={FadeIn.delay(200).duration(250)}
    layout={LinearTransition.duration(200)}
  >
    <View style={styles.emptyStateIconWrap}>
      <Ionicons name="leaf-outline" size={48} color={theme.colors.primary} />
    </View>
    <Text style={styles.emptyStateTitle}>A blank slate.</Text>
    <Text style={styles.emptyStateSubtitle}>
      Every great day starts with intention.{"\n"}What do you want to make happen?
    </Text>
  </Animated.View>
);

/* ---------------------- PROGRESS BAR ------------------------ */
const ProgressFill = ({ progress, color, style }: { progress: number, color: string, style: any }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(progress * 100, { damping: 20, stiffness: 60, mass: 0.8 });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return <Animated.View style={[style, { backgroundColor: color }, animStyle]} />;
};

/* ---------------------- MAIN SCREEN ------------------------ */
export default function TodoScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  const AnimatedSubGreeting = ({ text }: { text: string }) => {
    return (
      <Animated.View
        key={text}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(400)}
      >
        <Text style={styles.greetingSubtitle}>{text}</Text>
      </Animated.View>
    );
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Confirm modal state
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
    action: () => {},
  });

  const requestConfirm = (title: string, message: string, confirmText: string, action: () => void) => {
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
          if (buttonIndex === 1) action();
        }
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setConfirmState({ visible: true, title, message, confirmText, action });
    }
  };

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
      prev.map((t) => {
        if (t.id === id) {
          const newlyCompleted = !t.completed;
          import("../../utils/stats").then(({ addTaskCompleted, removeTaskCompleted }) => {
            if (newlyCompleted) {
              addTaskCompleted();
            } else {
              removeTaskCompleted();
            }
          });
          return { ...t, completed: newlyCompleted };
        }
        return t;
      })
    );

  const handleDeleteTask = (id: string) => {
    requestConfirm('Delete Task?', 'Are you sure you want to delete this task?', 'Delete', () => {
      setTasks((prev) => {
        const taskToDelete = prev.find((t) => t.id === id);
        if (taskToDelete?.completed) {
          import("../../utils/stats").then(({ removeTaskCompleted }) =>
            removeTaskCompleted(1)
          );
        }
        return prev.filter((t) => t.id !== id);
      });
    });
  };

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  /* show in-app confirm modal */
  const handleClearCompleted = () => {
    if (completedCount === 0) {
      if (Platform.OS === 'web') {
        window.alert("There are no completed tasks to clear.");
      } else {
        Alert.alert("No completed tasks", "There are no completed tasks to clear.");
      }
      return;
    }

    requestConfirm('Clear Completed?', 'Are you sure you want to clear all completed tasks?', 'Clear', () => {
      performClearCompleted();
    });
  };

  const performClearCompleted = () => {
    // Use functional update and immediately persist
    setTasks((prev) => {
      const completedTasks = prev.filter((t) => t.completed);
      if (completedTasks.length > 0) {
        import("../../utils/stats").then(({ removeTaskCompleted }) =>
          removeTaskCompleted(completedTasks.length)
        );
      }
      const next = prev.filter((t) => !t.completed);
      // persist immediately to avoid races
      saveTasks(next).catch((e) => console.error("saveTasks:", e));
      console.log(`[TodoScreen] cleared ${prev.length - next.length} completed tasks`);
      return next;
    });
    setConfirmState(prev => ({ ...prev, visible: false }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={sharedStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Still up?" :
      hour < 12 ? "Good morning." :
        hour < 17 ? "Good afternoon." :
          hour < 21 ? "Good evening." :
            "Late night grind.";

  const subGreeting =
    tasks.length === 0 ? "Nothing on the list yet." :
      completedCount === tasks.length ? "All done — you crushed it." :
        completedCount === 0 ? `${tasks.length} thing${tasks.length === 1 ? "" : "s"} waiting for you.` :
          `${tasks.length - completedCount} left to go.`;

  return (
    <SafeAreaView style={sharedStyles.container}>
      {/* ── Hero Header ── */}
      <View style={styles.heroHeader}>
        {/* Decorative dot grid */}
        <View style={styles.dotGrid} pointerEvents="none">
          {Array.from({ length: 35 }).map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.greetingEyebrow}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}
          </Text>
          <Text style={styles.greetingTitle}>{greeting}</Text>
          <AnimatedSubGreeting text={subGreeting} />

          {/* Progress pill */}
          {tasks.length > 0 && (
            <View style={styles.heroPillRow}>
              <View style={styles.heroPill}>
                <View style={styles.heroPillTrack}>
                  <ProgressFill
                    progress={completedCount / tasks.length}
                    color={theme.colors.primary}
                    style={styles.heroPillFill}
                  />
                </View>
                <Text style={styles.heroPillLabel}>
                  {Math.round((completedCount / tasks.length) * 100)}% complete
                </Text>
              </View>
              {completedCount > 0 && (
                <Pressable style={styles.clearButton} onPress={handleClearCompleted} hitSlop={8}>
                  <Text style={styles.clearButtonText}>Clear done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPressable
          style={[styles.topAddButton, buttonAnimatedStyle]}
          onPressIn={() => {
            buttonScale.value = withSpring(0.96, { damping: 18 });
          }}
          onPressOut={() => {
            buttonScale.value = withSpring(1, { damping: 12 });
          }}
          onPress={() => {
            setEditingTask(null);
            setModalVisible(true);
          }}
          android_ripple={{ color: "rgba(0,0,0,0.05)" }}
        >
          <View style={styles.topAddButtonIcon}>
            <Ionicons name="add" size={20} color={theme.colors.white} />
          </View>
          <Text style={styles.topAddButtonText}>New task</Text>
          <Ionicons name="chevron-forward" size={16} color={`${theme.colors.primary}50`} style={{ marginLeft: 'auto' as any }} />
        </AnimatedPressable>

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
          delayIndex={0}
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
          delayIndex={1}
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
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onCancel={() => setConfirmState(prev => ({ ...prev, visible: false }))}
        onConfirm={() => confirmState.action()}
        theme={theme}
      />
    </SafeAreaView>
  );
}

/* ---------------------- STYLES ------------------------ */
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    // Timer display
    timerText: {
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      marginRight: 2,
      alignSelf: 'center',
      fontVariant: ["tabular-nums"] as any,
    },
    timerTextActive: {
      color: theme.colors.primary,
    },
    timerTextPaused: {
      color: theme.colors.secondary,
    },

    // Section badge
    sectionBadge: {
      marginLeft: 'auto' as any,
      backgroundColor: `${theme.colors.primary}12`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    sectionBadgeText: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: theme.colors.primary,
    },

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

    // ── Hero Header ──────────────────────────────────────────
    heroHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      overflow: 'hidden',
      position: 'relative',
    },
    dotGrid: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 140,
      height: 120,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: theme.spacing.md,
      opacity: 0.08,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.primary,
    },
    heroContent: {
      gap: 4,
    },
    greetingEyebrow: {
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      letterSpacing: 2,
      color: theme.colors.secondary,
      marginBottom: 2,
    },
    greetingTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 32,
      lineHeight: 38,
      color: theme.colors.primary,
      letterSpacing: -0.5,
    },
    greetingSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      color: theme.colors.secondary,
      marginTop: 2,
      marginBottom: theme.spacing.md,
    },
    heroPillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: 4,
    },
    heroPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    heroPillTrack: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: `${theme.colors.secondary}20`,
      overflow: 'hidden',
    },
    heroPillFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    heroPillLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: theme.colors.secondary,
    },

    // Header (kept for clear button)
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
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    topAddButtonIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topAddButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: theme.colors.primary,
    },

    // Section 
    sectionContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
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
    checkboxWrapper: {
      position: 'relative',
      marginRight: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
    },
    checkboxDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    taskTextContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    strikeContainer: {
      alignSelf: 'flex-start',
      position: 'relative',
    },
    taskItemText: {
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
    },
    strikeThrough: {
      position: 'absolute',
      height: 1.5,
      backgroundColor: theme.colors.secondary,
      top: '52%',
      left: 0,
      borderRadius: 1,
    },
    taskItemTextDone: {
      color: theme.colors.secondary,
      opacity: 0.5,
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
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: "100%",
      maxWidth: 400,
      maxHeight: "85%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
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