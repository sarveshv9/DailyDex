import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme, getSharedStyles, themeTokens } from "../../styles/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";
import {
  RoutineItem,
  getRoutineIcon,
  addMinutesToTime,
  guessRoutineIconKey,
} from "../../utils/utils";
import { TimePicker } from "../ui/TimePicker";
import { DaysOfWeekPicker, DurationPicker, IconPickerModal, SubtaskList } from "../forms";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  TASK_COLORS,
  FALLBACK_COLORS,
  formatDuration,
} from "../../hooks/useRoutineTaskForm";

interface TaskModalProps {
  visible: boolean;
  task: RoutineItem | null;
  animatedStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  onEdit?: () => void;
  onSaveTask?: (updatedTask: RoutineItem) => void;
  onDelete: () => void;
  onChainNextTask?: (endTime: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  onClose,
  onSaveTask,
  onDelete,
  onChainNextTask,
}) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getCachedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));

  const cloneTask = (t: RoutineItem): RoutineItem => ({
    ...t,
    daysOfWeek: t.daysOfWeek ? [...t.daysOfWeek] : [],
    subtasks: t.subtasks ? t.subtasks.map((s) => ({ ...s })) : [],
  });

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(task?.id ?? null);
  const [editedTask, setEditedTask] = useState<RoutineItem | null>(() => (task ? cloneTask(task) : null));
  const [activeAccordion, setActiveAccordion] = useState<"none" | "time" | "duration" | "repeat">("none");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Synchronously sync state during render when a new task is received or modal becomes visible
  if (visible && task && (task.id !== currentTaskId || !editedTask)) {
    setCurrentTaskId(task.id);
    setEditedTask(cloneTask(task));
    setActiveAccordion("none");
    setShowIconPicker(false);
  }

  const scrollOffset = useRef(0);
  const handleSaveRef = useRef<(() => void) | null>(null);

  /* ── Harmonious Theme Accent Color ── */
  const taskColor = useMemo(() => {
    if (!editedTask) return theme.colors.primary;
    if (editedTask.imageKey && TASK_COLORS[editedTask.imageKey]) {
      return TASK_COLORS[editedTask.imageKey];
    }
    let hash = 0;
    const str = editedTask.task || "";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[idx];
  }, [editedTask, theme.colors.primary]);

  /* ── Save and Close ── */
  const closeAndSave = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      handleSaveRef.current?.();
    });
  };

  const closeWithoutSave = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  /* ── Pan Gesture for Smooth Pull-Down Dismiss ── */
  const handlePanResponderMove = (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (gestureState.dy > 0) {
      slideAnim.setValue(gestureState.dy);
    }
  };

  const handlePanResponderRelease = (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (gestureState.dy > 90 || gestureState.vy > 0.9) {
      closeAndSave();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 85,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  };

   const headerPanResponder = useMemo(
    () =>
      Platform.OS === "web"
        ? { panHandlers: {} }
        // eslint-disable-next-line react-hooks/refs
        : PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderMove: handlePanResponderMove,
            onPanResponderRelease: handlePanResponderRelease,
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slideAnim]
  );

   const bodyPanResponder = useMemo(
    () =>
      Platform.OS === "web"
        ? { panHandlers: {} }
        // eslint-disable-next-line react-hooks/refs
        : PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
              return gestureState.dy > 15 && scrollOffset.current <= 1;
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
              return gestureState.dy > 15 && scrollOffset.current <= 1;
            },
            onPanResponderMove: handlePanResponderMove,
            onPanResponderRelease: handlePanResponderRelease,
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slideAnim]
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = e.nativeEvent.contentOffset.y;
    if (scrollOffset.current < -60) {
      closeAndSave();
    }
  };

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 85,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleSave = () => {
    if (onSaveTask && editedTask) {
      onSaveTask(editedTask);
    }
    onClose();
  };

  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  if (!task || !editedTask) return null;

  /* ── Time Calculations ── */
  const getDisplayTime = () => {
    const startStr = editedTask?.time || "1:00 AM";
    const dur = editedTask?.duration || 30;
    const endStr = addMinutesToTime(startStr, dur);
    return `${startStr} – ${endStr}`;
  };

  const getRepeatText = () => {
    const days = editedTask.daysOfWeek ?? [];
    if (days.length === 0) return "Once";
    if (days.length === 7) return "Daily";
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Weekdays";
    if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
    return `${days.length}d/wk`;
  };

  const adjustDuration = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedTask((prev) => {
      if (!prev) return prev;
      const cur = prev.duration || 30;
      return { ...prev, duration: Math.max(5, Math.min(240, cur + delta)) };
    });
  };

  const subtasksList = editedTask.subtasks || [];
  const completedSubtasksCount = subtasksList.filter((s) => s.completed).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeAndSave}
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
        {Platform.OS === "ios" ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={25}
            tint={isDarkMode ? "dark" : "light"}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDarkMode ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.4)" },
            ]}
          />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAndSave} />
      </Animated.View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={70}
              tint={isDarkMode ? "dark" : "light"}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDarkMode ? theme.colors.surface : theme.colors.background },
              ]}
            />
          )}

          {/* ── Draggable Header Zone ── */}
          <View {...headerPanResponder.panHandlers} style={styles.headerSection}>
            <View style={styles.handle} />

            {/* Top Navigation Row */}
            <View style={styles.topActionsRow}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeWithoutSave();
                }}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>

              {/* Time Range Pill Header */}
              <View style={styles.timeRangePill}>
                <Ionicons name="time-outline" size={13} color={taskColor} style={{ marginRight: 5 }} />
                <Text style={styles.timeRangeText}>{getDisplayTime()}</Text>
              </View>

              <Button
                title="Save"
                variant="primary"
                size="sm"
                icon={<Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
                onPress={closeAndSave}
              />
            </View>

            {/* ── Hero Ritual Card: Icon Ring + Editable Title ── */}
            <View style={styles.heroRow}>
              {/* Icon Ring Button */}
              <TouchableOpacity
                style={[
                  styles.heroIconRing,
                  {
                    backgroundColor: `${taskColor}18`,
                    borderColor: `${taskColor}50`,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowIconPicker(true);
                }}
                activeOpacity={0.8}
                hitSlop={8}
              >
                <Ionicons
                  name={getRoutineIcon(editedTask.imageKey)}
                  size={30}
                  color={taskColor}
                />
                <View style={[styles.heroEditPencilDot, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="pencil" size={9} color={theme.colors.onPrimary} />
                </View>
              </TouchableOpacity>

              {/* Title & Subtle Category Hint */}
              <View style={styles.heroTitleWrap}>
                <TextInput
                  style={styles.heroTitleInput}
                  value={editedTask.task}
                  onChangeText={(t) => {
                    const autoKey = guessRoutineIconKey(t);
                    setEditedTask((prev) => {
                      if (!prev) return null;
                      const isDefault = !prev.imageKey || prev.imageKey === "breathe";
                      return {
                        ...prev,
                        task: t,
                        imageKey: isDefault && autoKey !== "breathe" ? autoKey : prev.imageKey,
                      };
                    });
                  }}
                  placeholder="Ritual Name..."
                  placeholderTextColor={`${theme.colors.textSecondary}50`}
                  returnKeyType="done"
                />
                <Text style={styles.heroDurationSub}>
                  Scheduled for {formatDuration(editedTask.duration || 30)} • {getRepeatText()}
                </Text>
              </View>
            </View>

            {/* ── Sleek Interactive Pills Row ── */}
            <View style={styles.pillsRow}>
              {/* Time Pill */}
              <Pressable
                style={[
                  styles.controlPill,
                  styles.timePillFlex,
                  activeAccordion === "time" && styles.controlPillActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveAccordion((prev) => (prev === "time" ? "none" : "time"));
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={activeAccordion === "time" ? "#FFFFFF" : taskColor}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.controlPillText,
                    activeAccordion === "time" && { color: "#FFFFFF" },
                  ]}
                >
                  {editedTask.time}
                </Text>
                <Ionicons
                  name={activeAccordion === "time" ? "chevron-up" : "chevron-down"}
                  size={11}
                  color={activeAccordion === "time" ? "#FFFFFF" : theme.colors.textSecondary}
                />
              </Pressable>

              {/* Duration Pill */}
              <Pressable
                style={[
                  styles.controlPill,
                  styles.durPillFlex,
                  activeAccordion === "duration" && styles.controlPillActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveAccordion((prev) => (prev === "duration" ? "none" : "duration"));
                }}
              >
                <Ionicons
                  name="hourglass-outline"
                  size={13}
                  color={activeAccordion === "duration" ? "#FFFFFF" : taskColor}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.controlPillText,
                    activeAccordion === "duration" && { color: "#FFFFFF" },
                  ]}
                >
                  {formatDuration(editedTask.duration || 30)}
                </Text>
                <Ionicons
                  name={activeAccordion === "duration" ? "chevron-up" : "chevron-down"}
                  size={11}
                  color={activeAccordion === "duration" ? "#FFFFFF" : theme.colors.textSecondary}
                />
              </Pressable>

              {/* Repeat Pill */}
              <Pressable
                style={[
                  styles.controlPill,
                  styles.repeatPillFlex,
                  activeAccordion === "repeat" && styles.controlPillActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveAccordion((prev) => (prev === "repeat" ? "none" : "repeat"));
                }}
              >
                <Ionicons
                  name="repeat-outline"
                  size={13}
                  color={activeAccordion === "repeat" ? "#FFFFFF" : taskColor}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.controlPillText,
                    activeAccordion === "repeat" && { color: "#FFFFFF" },
                  ]}
                >
                  {getRepeatText()}
                </Text>
                <Ionicons
                  name={activeAccordion === "repeat" ? "chevron-up" : "chevron-down"}
                  size={11}
                  color={activeAccordion === "repeat" ? "#FFFFFF" : theme.colors.textSecondary}
                />
              </Pressable>

              {/* Icon Palette Pill */}
              <Pressable
                style={[styles.controlPill, styles.iconPillFlex]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowIconPicker(true);
                }}
              >
                <Ionicons name="color-palette-outline" size={13} color={taskColor} />
                <Text numberOfLines={1} style={styles.controlPillText}>Icon</Text>
                <Ionicons name="chevron-down" size={11} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {/* ── Accordion: Inline Time Picker ── */}
            {activeAccordion === "time" && (
              <View style={styles.accordionContainer}>
                <TimePicker
                  value={editedTask.time || "8:00 AM"}
                  onChange={(t) => setEditedTask((prev) => (prev ? { ...prev, time: t } : null))}
                />
              </View>
            )}

            {/* ── Accordion: Duration Stepper & Presets ── */}
            {activeAccordion === "duration" && (
              <View style={styles.accordionContainer}>
                {/* Stepper */}
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustDuration(-5)}
                    hitSlop={8}
                  >
                    <Ionicons name="remove" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  <View style={styles.stepperDisplay}>
                    <Text style={styles.stepperDisplayText}>
                      {formatDuration(editedTask.duration || 30)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustDuration(5)}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Preset Chips */}
                <DurationPicker
                  selectedDuration={editedTask.duration || 30}
                  onChange={(dur) => setEditedTask((prev) => (prev ? { ...prev, duration: dur } : null))}
                  activeColor={taskColor}
                />
              </View>
            )}

            {/* ── Accordion: Repeat Schedule ── */}
            {activeAccordion === "repeat" && (
              <View style={styles.accordionContainer}>
                <DaysOfWeekPicker
                  selectedDays={editedTask.daysOfWeek || []}
                  onChange={(days) => setEditedTask((prev) => (prev ? { ...prev, daysOfWeek: days } : null))}
                  activeColor={taskColor}
                />

                {/* Quick Presets */}
                <View style={styles.repeatPresetRow}>
                  {[
                    { label: "Daily", days: [0, 1, 2, 3, 4, 5, 6] },
                    { label: "Weekdays", days: [1, 2, 3, 4, 5] },
                    { label: "Weekends", days: [0, 6] },
                    { label: "Once", days: [] },
                  ].map((p) => {
                    const isSelected =
                      (editedTask.daysOfWeek || []).length === p.days.length &&
                      p.days.every((d) => (editedTask.daysOfWeek || []).includes(d));
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.repeatPresetChip,
                          isSelected && {
                            backgroundColor: `${taskColor}20`,
                            borderColor: taskColor,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setEditedTask((prev) => (prev ? { ...prev, daysOfWeek: p.days } : null));
                        }}
                      >
                        <Text
                          style={[
                            styles.repeatPresetText,
                            isSelected && { color: taskColor, fontFamily: theme.fonts.bold },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* ── Scrollable Body Section ── */}
          <View {...bodyPanResponder.panHandlers} style={{ flex: 1 }}>
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {/* ── Subtasks Card ── */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWithIcon}>
                    <Ionicons name="checkbox-outline" size={17} color={taskColor} />
                    <Text style={styles.cardTitle}>Subtasks</Text>
                  </View>
                  {subtasksList.length > 0 && (
                    <View style={[styles.counterPill, { backgroundColor: `${taskColor}15` }]}>
                      <Text style={[styles.counterPillText, { color: taskColor }]}>
                        {completedSubtasksCount}/{subtasksList.length}
                      </Text>
                    </View>
                  )}
                </View>

                <SubtaskList
                  subtasks={subtasksList}
                  onChange={(updated) =>
                    setEditedTask((prev) => (prev ? { ...prev, subtasks: updated } : null))
                  }
                  activeColor={taskColor}
                />
              </View>

              {/* ── Notes / Intention Card ── */}
              <Card style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWithIcon}>
                    <Ionicons name="document-text-outline" size={17} color={taskColor} />
                    <Text style={styles.cardTitle}>Mindful Notes</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.notesTextArea, { color: theme.colors.text }]}
                  placeholder="Add notes, intentions, links or instructions for this ritual..."
                  placeholderTextColor={`${theme.colors.textSecondary}45`}
                  multiline
                  value={editedTask.description}
                  onChangeText={(t) =>
                    setEditedTask((prev) => (prev ? { ...prev, description: t } : null))
                  }
                  textAlignVertical="top"
                />
              </Card>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* ── Bottom Action Controls ── */}
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: Math.max(insets.bottom, 18) },
              ]}
            >
              {onChainNextTask && (
                <TouchableOpacity
                  style={[styles.chainPillBtn, { backgroundColor: theme.colors.primarySoft }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const dur = editedTask?.duration || 30;
                    const nextTime = addMinutesToTime(editedTask?.time || "8:00 AM", dur);
                    closeWithoutSave();
                    setTimeout(() => onChainNextTask(nextTime), 240);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={theme.colors.primaryText}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chainText, { color: theme.colors.primaryText }]}>
                    Add Ritual After
                  </Text>
                </TouchableOpacity>
              )}

              {(() => {
                const taskName = editedTask?.task?.toLowerCase().trim();
                const isProtected = taskName === "wake up" || taskName === "sleep";
                if (isProtected) return null;
                return (
                  <Button
                    title="Delete"
                    variant="destructive"
                    size="sm"
                    icon={<Ionicons name="trash-outline" size={16} color={themeTokens.colors.danger} />}
                    onPress={() => {
                      onDelete();
                      closeWithoutSave();
                    }}
                  />
                );
              })()}
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════
              ICON PICKER MODAL (CATEGORIZED 50+ ICONS)
             ══════════════════════════════════════════════════════════ */}
          {showIconPicker && (
            <IconPickerModal
              visible={showIconPicker}
              onClose={() => setShowIconPicker(false)}
              activeColor={taskColor}
              currentIconKey={editedTask?.imageKey}
              onSelectIcon={(iconKey) => {
                setEditedTask((prev) => (prev ? { ...prev, imageKey: iconKey } : null));
                setShowIconPicker(false);
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default React.memo(TaskModal);

const stylesCache = new Map<string, ReturnType<typeof getStyles>>();
const getCachedStyles = (theme: Theme) => {
  const key = `${theme.colors.background}-${theme.colors.primary}-${theme.colors.surface}`;
  let s = stylesCache.get(key);
  if (!s) {
    s = getStyles(theme);
    stylesCache.set(key, s);
  }
  return s;
};

const getStyles = (theme: Theme) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      height: SCREEN_HEIGHT * 0.88,
      maxHeight: SCREEN_HEIGHT * 0.94,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
        },
        android: { elevation: 22 },
      }),
    },
    handle: {
      ...shared.modalHandle,
      width: 38,
      marginBottom: 14,
    },

    /* ── Header Area ── */
    headerSection: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    topActionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    circleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    timeRangePill: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
    },
    timeRangeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.1,
    },
    saveActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 18,
    },
    saveActionText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontFamily: theme.fonts.bold,
    },

    /* ── Hero Row ── */
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 14,
    },
    heroIconRing: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      position: "relative",
    },
    heroEditPencilDot: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
    },
    heroTitleWrap: {
      flex: 1,
    },
    heroTitleInput: {
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      padding: 0,
      margin: 0,
      letterSpacing: -0.3,
    },
    heroDurationSub: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      marginTop: 3,
    },

    /* ── Pills Row ── */
    pillsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      marginTop: 2,
    },
    controlPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: 13,
      gap: 3.5,
    },
    controlPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    controlPillText: {
      fontSize: 11.5,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    timePillFlex: {
      flex: 1.25,
    },
    durPillFlex: {
      flex: 0.85,
    },
    repeatPillFlex: {
      flex: 1.0,
    },
    iconPillFlex: {
      flex: 0.9,
    },

    /* ── Accordion Containers ── */
    accordionContainer: {
      paddingTop: 12,
      marginTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      gap: 16,
    },
    stepperBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperDisplay: {
      minWidth: 90,
      alignItems: "center",
    },
    stepperDisplayText: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    presetChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
    },
    durChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    durChipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* Days of week row */
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    dayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    dayBtnText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
    },
    repeatPresetRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      justifyContent: "center",
    },
    repeatPresetChip: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    repeatPresetText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── Body Scroll ── */
    bodyScroll: {
      flex: 1,
    },
    bodyScrollContent: {
      paddingHorizontal: 18,
      paddingTop: 16,
      gap: 14,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    cardTitleWithIcon: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    cardTitle: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      opacity: 0.85,
    },
    counterPill: {
      ...shared.badge,
    },
    counterPillText: {
      ...shared.badgeText,
    },

    /* Subtask Rows */
    subtaskRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    subtaskCheck: {
      marginRight: 10,
    },
    subtaskInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      padding: 0,
      margin: 0,
    },
    subtaskDelete: {
      padding: 4,
    },
    addSubtaskRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    subtaskAddBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    /* Notes Area */
    notesTextArea: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      minHeight: 80,
      lineHeight: 20,
      padding: 0,
      margin: 0,
    },

    /* ── Bottom Bar ── */
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingTop: 14,
      paddingHorizontal: 18,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    chainPillBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 22,
    },
    chainText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
    },
    deletePillBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 13,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 22,
    },
    deleteText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontFamily: theme.fonts.bold,
    },

    /* ── Icon Picker Modal Styles ── */
    iconModalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    iconModalCard: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 18,
      maxHeight: SCREEN_HEIGHT * 0.65,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
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
      backgroundColor: theme.colors.surfaceMuted,
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
};
