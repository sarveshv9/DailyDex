import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { RoutineItem, SubTask, parseTime, getRoutineIcon } from "../../utils/utils";
import { TimePickerSheet } from "../common/TimePickerSheet";

// SwiftUI liquid glass (iOS dev build only)
import { GlassEffectContainer, Host, VStack } from '@expo/ui/swift-ui';
import { glassEffect, frame, cornerRadius as swiftCornerRadius } from '@expo/ui/swift-ui/modifiers';

interface TaskModalProps {
  visible: boolean;
  task: RoutineItem | null;
  animatedStyle?: any;
  onClose: () => void;
  onEdit: () => void; // Legacy edit handler (optional now)
  onSaveTask?: (updatedTask: RoutineItem) => void;
  onDelete: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DAYS_OF_WEEK = [
  { label: "S", full: "Sun", value: 0 },
  { label: "M", full: "Mon", value: 1 },
  { label: "T", full: "Tue", value: 2 },
  { label: "W", full: "Wed", value: 3 },
  { label: "T", full: "Thu", value: 4 },
  { label: "F", full: "Fri", value: 5 },
  { label: "S", full: "Sat", value: 6 },
];

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  onClose,
  onSaveTask,
  onDelete,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [editedTask, setEditedTask] = useState<RoutineItem | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const isDark = theme.colors.background === "#000000" || theme.colors.background === "#1A1A1A" || theme.colors.background.startsWith('#0');

  const scrollOffset = useRef(0);
  const handleSaveRef = useRef<(() => void) | null>(null);

  const closeAndSave = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      handleSaveRef.current?.();
    });
  };

  const closeWithoutSave = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handlePanResponderMove = (_: any, gestureState: any) => {
    if (gestureState.dy > 0) {
      slideAnim.setValue(gestureState.dy);
    }
  };

  const handlePanResponderRelease = (_: any, gestureState: any) => {
    if (gestureState.dy > 80 || gestureState.vy > 1) {
      closeAndSave();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  };

  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: handlePanResponderMove,
      onPanResponderRelease: handlePanResponderRelease,
    })
  ).current;

  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return gestureState.dy > 15 && scrollOffset.current <= 1;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 15 && scrollOffset.current <= 1;
      },
      onPanResponderMove: handlePanResponderMove,
      onPanResponderRelease: handlePanResponderRelease,
    })
  ).current;

  const handleScroll = (e: any) => {
    scrollOffset.current = e.nativeEvent.contentOffset.y;
    if (scrollOffset.current < -60) {
      closeAndSave();
    }
  };

  const handleScrollEndDrag = (e: any) => {
    if (e.nativeEvent.contentOffset.y < -40) {
      closeAndSave();
    }
  };

  useEffect(() => {
    if (visible && task) {
      setEditedTask(JSON.parse(JSON.stringify(task)));
      setShowDays(false);
      setShowTimePicker(false);
    }
  }, [visible, task]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!task || !editedTask) return null;

  const handleSave = () => {
    if (onSaveTask && editedTask) {
      onSaveTask(editedTask);
    }
    onClose();
  };

  handleSaveRef.current = handleSave;

  const getRepeatText = () => {
    if (!editedTask.daysOfWeek || editedTask.daysOfWeek.length === 0) return "Once";
    if (editedTask.daysOfWeek.length === 7) return "Every day";
    if (editedTask.daysOfWeek.length === 5 && !editedTask.daysOfWeek.includes(0) && !editedTask.daysOfWeek.includes(6)) return "Weekdays";
    if (editedTask.daysOfWeek.length === 2 && editedTask.daysOfWeek.includes(0) && editedTask.daysOfWeek.includes(6)) return "Weekends";
    return `${editedTask.daysOfWeek.length} days/week`;
  };

  const toggleDay = (dayValue: number) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const current = prev.daysOfWeek || [];
      const next = current.includes(dayValue)
        ? current.filter((d) => d !== dayValue)
        : [...current, dayValue].sort();
      return { ...prev, daysOfWeek: next };
    });
  };

  const toggleSubtask = (id: string) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const subtasks = prev.subtasks?.map(st => st.id === id ? { ...st, completed: !st.completed } : st);
      return { ...prev, subtasks };
    });
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setEditedTask((prev) => {
      if (!prev) return prev;
      const newSt: SubTask = { id: Date.now().toString(), title: newSubtaskText.trim(), completed: false };
      return { ...prev, subtasks: [...(prev.subtasks || []), newSt] };
    });
    setNewSubtaskText("");
  };

  const editSubtask = (id: string, text: string) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const subtasks = prev.subtasks?.map(st => st.id === id ? { ...st, title: text } : st);
      return { ...prev, subtasks };
    });
  };

  const deleteSubtask = (id: string) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const subtasks = prev.subtasks?.filter(st => st.id !== id);
      return { ...prev, subtasks };
    });
  };

  const CardRow = ({
    icon,
    iconColor,
    title,
    titleColor,
    value,
    badge,
    showChevron = true,
    isLast = false,
    onPress,
  }: {
    icon: any;
    iconColor: string;
    title: string;
    titleColor?: string;
    value?: string;
    badge?: string;
    showChevron?: boolean;
    isLast?: boolean;
    onPress?: () => void;
  }) => (
    <View>
      <TouchableOpacity
        style={styles.cardRow}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardRowLeft}>
          <Ionicons name={icon} size={22} color={iconColor} />
          <Text style={[styles.cardRowTitle, titleColor ? { color: titleColor } : {}]}>
            {title}
          </Text>
        </View>
        <View style={styles.cardRowRight}>
          {value && <Text style={styles.cardRowValue}>{value}</Text>}
          {badge && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={10} color="#8E8E93" style={{ marginRight: 2 }} />
              <Text style={styles.proBadgeText}>{badge}</Text>
            </View>
          )}
          {showChevron && (
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );

  const getDisplayTime = () => {
    const startStr = editedTask?.time || "1:00 AM";
    const dur = editedTask?.duration;
    if (!dur) return startStr;

    const { hours, minutes, isValid } = parseTime(startStr);
    if (!isValid) return startStr;

    let endTotalMins = hours * 60 + minutes + dur;
    let endH = Math.floor(endTotalMins / 60) % 24;
    let endM = endTotalMins % 60;
    const ampm = endH >= 12 ? 'PM' : 'AM';
    endH = endH % 12 || 12;

    return `${startStr} - ${endH}:${String(endM).padStart(2, '0')} ${ampm}`;
  };

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
              extrapolate: 'clamp'
            })
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAndSave}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
              <GlassEffectContainer>
                <VStack modifiers={[glassEffect(), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                  {null}
                </VStack>
              </GlassEffectContainer>
            </Host>
          </Pressable>
        ) : (
          <>
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={40}
              tint={isDark ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
            />
            <Pressable style={StyleSheet.absoluteFill} onPress={closeAndSave} />
          </>
        )}
      </Animated.View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }], backgroundColor: theme.colors.background },
          ]}
        >
          {/* --- Draggable Header area --- */}
          <View {...headerPanResponder.panHandlers} style={[styles.headerSection, { backgroundColor: theme.colors.primary }]}>
            <View style={styles.handle} />

            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={closeWithoutSave} hitSlop={10}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={closeAndSave}
                hitSlop={10}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.titleRow}>
              <View style={styles.dashedLineContainer}>
                <View style={styles.dashedLine} />
              </View>
              <View style={styles.iconPill}>
                <Ionicons 
                  name={getRoutineIcon(editedTask.imageKey)} 
                  size={42} 
                  color={theme.colors.primary} 
                />
                <View style={[styles.paletteBadge, { borderColor: theme.colors.primary }]}>
                  <Ionicons name="color-palette" size={16} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.titleDetails}>
                <Text style={styles.timeTag}>{getDisplayTime()}</Text>
                <View style={styles.titleWithCheckRow}>
                  <View style={styles.titleBox}>
                    <TextInput
                      style={styles.taskTitleInput}
                      value={editedTask.task}
                      onChangeText={(t) => setEditedTask(prev => prev ? { ...prev, task: t } : null)}
                      placeholder="Task Name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                  </View>
                </View>
                <Ionicons name="sync" size={16} color="rgba(255,255,255,0.6)" style={{ marginTop: 6 }} />
              </View>
            </View>
          </View>

          {/* --- Bottom Body Section --- */}
          <View {...bodyPanResponder.panHandlers} style={{ flex: 1 }}>
            <ScrollView
              style={[styles.bodySection, { backgroundColor: theme.colors.background }]}
              bounces={true}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
            >

              <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <CardRow
                  icon="time-outline"
                  iconColor={theme.colors.primary}
                  title={getDisplayTime()}
                  titleColor={theme.colors.text}
                  onPress={() => setShowTimePicker(true)}
                />
                <CardRow
                  icon="sync"
                  iconColor={theme.colors.primary}
                  title={getRepeatText()}
                  titleColor={theme.colors.text}
                  isLast={!showDays}
                  onPress={() => setShowDays(!showDays)}
                />
                {showDays && (
                  <View style={styles.daysContainer}>
                    {DAYS_OF_WEEK.map((day) => {
                      const active = (editedTask.daysOfWeek || []).includes(day.value);
                      return (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.dayBtn,
                            active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                          ]}
                          onPress={() => toggleDay(day.value)}
                        >
                          <Text style={[styles.dayBtnText, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                {editedTask.subtasks?.map((st) => (
                  <View key={st.id} style={styles.subtaskRow}>
                    <TouchableOpacity onPress={() => toggleSubtask(st.id)} style={styles.subtaskCheck}>
                      <Ionicons name={st.completed ? "checkmark-circle" : "square-outline"} size={22} color={st.completed ? theme.colors.primary : theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.subtaskInput, { color: theme.colors.text }, st.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]}
                      value={st.title}
                      onChangeText={(t) => editSubtask(st.id, t)}
                    />
                    <TouchableOpacity onPress={() => deleteSubtask(st.id)} style={styles.subtaskDelete}>
                      <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addSubtaskRow}>
                  <Ionicons name="add" size={22} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.subtaskInput, { color: theme.colors.text }]}
                    placeholder="Add Subtask"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newSubtaskText}
                    onChangeText={setNewSubtaskText}
                    onSubmitEditing={addSubtask}
                    returnKeyType="done"
                  />
                  {newSubtaskText.length > 0 && (
                    <TouchableOpacity onPress={addSubtask} style={styles.subtaskAddBtn}>
                      <Ionicons name="arrow-up-circle" size={26} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.divider} />
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={[styles.textArea, { color: theme.colors.text }]}
                    placeholder="Add notes, meeting links or phone numbers..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    value={editedTask.description}
                    onChangeText={(t) => setEditedTask(prev => prev ? { ...prev, description: t } : null)}
                  />
                </View>
              </View>

            </ScrollView>

            {(() => {
              const taskName = editedTask?.task?.toLowerCase().trim();
              const isProtected = taskName === "wake up" || taskName === "sleep";
              if (isProtected) return null;
              return (
                <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
                  <TouchableOpacity style={styles.deletePillBtn} onPress={() => { onDelete(); closeWithoutSave(); }} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color="#FF453A" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteText}>Delete Task</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>

          {/* Time Picker Overlay */}
          {showTimePicker && (
            <View style={styles.pickerOverlay}>
              <TimePickerSheet
                initialTime={editedTask.time || "1:00 AM"}
                initialDuration={editedTask.duration}
                onTimeChange={(time) => setEditedTask(prev => prev ? { ...prev, time } : null)}
                onDurationChange={(duration) => setEditedTask(prev => prev ? { ...prev, duration } : null)}
                onClose={() => setShowTimePicker(false)}
              />
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
};

export default TaskModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    height: SCREEN_HEIGHT * 0.88,
    maxHeight: SCREEN_HEIGHT * 0.95,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSection: { paddingHorizontal: 20, paddingBottom: 25 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, position: 'relative' },
  dashedLineContainer: { position: 'absolute', top: -200, bottom: '100%', left: 39, width: 4, alignItems: 'center', overflow: 'hidden' },
  dashedLine: { height: 1000, width: 4, borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)', borderStyle: 'dashed', borderRadius: 1 },
  iconPill: { width: 80, height: 154, borderRadius: 40, backgroundColor: '#4A4A4A', borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 20, position: 'relative' },
  paletteBadge: { position: 'absolute', bottom: -6, left: -10, width: 34, height: 34, borderRadius: 17, backgroundColor: '#1F3C5E', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  titleDetails: { flex: 1, justifyContent: 'center', paddingTop: 15 },
  timeTag: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  titleWithCheckRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleBox: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.4)', paddingBottom: 6, marginRight: 16 },
  taskTitleInput: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', padding: 0, margin: 0 },
  bodySection: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  card: { borderRadius: 16, marginBottom: 16, paddingVertical: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  cardRowLeft: { flexDirection: 'row', alignItems: 'center' },
  cardRowRight: { flexDirection: 'row', alignItems: 'center' },
  cardRowTitle: { fontSize: 16, marginLeft: 12, fontWeight: '400' },
  cardRowValue: { color: '#8E8E93', fontSize: 16, marginRight: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(150,150,150,0.2)', marginLeft: 50 },
  proBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(150,150,150,0.1)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'rgba(150,150,150,0.15)' },
  proBadgeText: { color: '#8E8E93', fontSize: 10, fontWeight: '600' },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.2)' },
  dayBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(150,150,150,0.2)', alignItems: 'center', justifyContent: 'center' },
  dayBtnText: { fontSize: 14, fontWeight: 'bold' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  subtaskCheck: { marginRight: 10 },
  subtaskInput: { flex: 1, fontSize: 16 },
  subtaskDelete: { padding: 4 },
  subtaskAddBtn: { padding: 2 },
  textAreaContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10 },
  textArea: { fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  bottomBar: { alignItems: 'center', paddingTop: 16 },
  deletePillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24, backgroundColor: 'rgba(255, 69, 58, 0.15)', borderRadius: 24 },
  deleteText: { color: '#FF453A', fontSize: 16, fontWeight: '600' },
  pickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", alignItems: "center", zIndex: 100 },
  pickerCard: { borderRadius: 28, paddingVertical: 24, paddingHorizontal: 20, width: "90%", maxWidth: 320 },
});