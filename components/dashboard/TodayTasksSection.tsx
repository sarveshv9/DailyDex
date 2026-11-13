import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { themeTokens } from "../../constants/themeTokens";
import { Theme, getSharedStyles } from "../../styles/shared";
import { Task } from "../../app/(tabs)/todo";

export interface TodayTasksSectionProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTask: (text: string) => void;
  onOpenTasks: () => void;
  onOpenFocusForTask?: (task: Task) => void;
  theme: Theme;
  isDarkMode: boolean;
}

const TodayTasksSectionComponent: React.FC<TodayTasksSectionProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onOpenTasks,
  onOpenFocusForTask,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const [newText, setNewText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.category === "today");
  }, [tasks]);

  const completedCount = useMemo(() => {
    return todayTasks.filter((t) => t.completed).length;
  }, [todayTasks]);

  // Show up to 4 items on the dashboard: pending first, then completed
  const displayedTasks = useMemo(() => {
    const pending = todayTasks.filter((t) => !t.completed);
    const completed = todayTasks.filter((t) => t.completed);
    return [...pending, ...completed].slice(0, 4);
  }, [todayTasks]);

  const remainingCount = todayTasks.length - displayedTasks.length;

  const handleSubmit = useCallback(() => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setNewText("");
    setIsFocused(false);
    Keyboard.dismiss();
  }, [newText, onAddTask]);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(180)}
      style={styles.sectionContainer}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.sectionLabel}>TODAY'S INTENTIONS</Text>
          {todayTasks.length > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>
                {completedCount}/{todayTasks.length}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onOpenTasks}
          accessibilityRole="button"
          accessibilityLabel="View all tasks"
          style={({ pressed }) => [styles.viewAllButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.viewAllText}>See all →</Text>
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        {displayedTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No intentions set for today yet.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {displayedTasks.map((task, index) => {
              const isLast = index === displayedTasks.length - 1 && remainingCount <= 0;
              return (
                <View key={task.id}>
                  <View style={styles.taskRow}>
                    <Pressable
                      testID={`task-checkbox-${task.id}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => onToggleTask(task.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.completed }}
                      accessibilityLabel={
                        task.completed ? "Mark incomplete" : "Mark complete"
                      }
                      style={[
                        styles.checkCircle,
                        task.completed && styles.checkCircleCompleted,
                      ]}
                    >
                      {task.completed && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={theme.colors.onPrimary}
                        />
                      )}
                    </Pressable>

                    <Text
                      style={[
                        styles.taskText,
                        task.completed && styles.taskCompletedText,
                      ]}
                      numberOfLines={2}
                    >
                      {task.text}
                    </Text>

                    {!task.completed && onOpenFocusForTask && (
                      <Pressable
                        testID={`task-timer-${task.id}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => onOpenFocusForTask(task)}
                        accessibilityRole="button"
                        accessibilityLabel={`Start focus timer for ${task.text}`}
                        style={({ pressed }) => [
                          styles.timerButton,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons
                          name="timer-outline"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </Pressable>
                    )}
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}

            {remainingCount > 0 && (
              <Pressable
                onPress={onOpenTasks}
                style={({ pressed }) => [
                  styles.moreRow,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.moreText}>
                  +{remainingCount} more {remainingCount === 1 ? "intention" : "intentions"} in Tasks
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* Quick Add Bar */}
        <View style={styles.quickAddRow}>
          {(isFocused || newText.length > 0) && (
            <Ionicons
              name="add"
              size={18}
              color={theme.colors.primary}
              style={{ marginRight: 6 }}
            />
          )}
          <TextInput
            testID="today-tasks-quick-add-input"
            style={[
              styles.quickAddInput,
              { textAlign: isFocused || newText.length > 0 ? "left" : "center" },
            ]}
            placeholder={
              isFocused ? "Type an intention..." : "+ Add an intention for today..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            value={newText}
            onChangeText={setNewText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            maxLength={140}
          />
          {newText.trim().length > 0 && (
            <Pressable
              testID="today-tasks-quick-add-submit"
              onPress={handleSubmit}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={({ pressed }) => [
                styles.quickAddSubmit,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={theme.colors.onPrimary}
              />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export const TodayTasksSection = React.memo(TodayTasksSectionComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);

  return StyleSheet.create({
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    headerTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionLabel: {
      ...shared.sectionLabel,
    },
    counterBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: theme.colors.primarySoft,
    },
    counterBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
      fontVariant: ["tabular-nums"],
    },
    viewAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    viewAllText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    contentContainer: {
      gap: 0,
    },
    tasksList: {
      paddingHorizontal: 0,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 8,
      gap: 14,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "rgba(255, 255, 255, 0.25)" : "#CBD5E1",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkCircleCompleted: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    taskText: {
      flex: 1,
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      lineHeight: 22,
    },
    taskCompletedText: {
      textDecorationLine: "line-through",
      color: theme.colors.textSecondary,
      opacity: 0.6,
    },
    timerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#E0F0FE",
    },
    divider: {
      height: 1,
      backgroundColor: "transparent",
    },
    moreRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingLeft: 36,
    },
    moreText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    emptyTitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
    },
    emptySubtitle: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
    },
    quickAddRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? theme.colors.surfaceMuted : "#E8EFF9",
      paddingHorizontal: 16,
      marginTop: 8,
      borderWidth: 0,
    },
    quickAddInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
      padding: 0,
      ...Platform.select({
        web: { outlineStyle: "none" as any },
      }),
    },
    quickAddSubmit: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
  });
};
