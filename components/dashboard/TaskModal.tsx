import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Theme } from "../../styles/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";
import { RoutineItem, SubTask, parseTime, getRoutineIcon, addMinutesToTime, guessRoutineIconKey, ICON_GROUPS } from "../../utils/utils";
import { InlineTimePicker } from "../common/InlineTimePicker";

interface TaskModalProps {
  visible: boolean;
  task: RoutineItem | null;
  animatedStyle?: any;
  onClose: () => void;
  onEdit: () => void; // Legacy edit handler (optional now)
  onSaveTask?: (updatedTask: RoutineItem) => void;
  onDelete: () => void;
  onChainNextTask?: (endTime: string) => void;
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

const TASK_COLORS: Record<string, string> = {
    wakeup: '#FFB347',
    sleep: '#9CBBE3',
    water: '#77CCEE',
    tea_journal: '#E6D5B8',
    breakfast: '#FFD1BA',
    lunch: '#FFD1BA',
    dinner: '#FFD1BA',
    study: '#A0C4FF',
    walk: '#B9FBC0',
    yoga: '#CFBAF0',
    reflect: '#A0C4FF',
    prepare_sleep: '#BDB2FF',
    breathe: '#B9FBC0',
    commute: '#79B4B7',
    gym: '#FF9F80',
    cleaning: '#80CED7',
    pet: '#E3C75F',
    shopping: '#F6B8B8',
    coding: '#7EA0B7',
    gaming: '#BD93F9',
    finances: '#9AD0C2',
    laundry: '#C5DFF8',
    travel: '#7BC9FF',
    health: '#F875AA',
    podcast: '#C683D7',
};

const FALLBACK_COLORS = ['#7B8CDE', '#C084FC', '#4DA8DA', '#6BCB77', '#E8975E', '#B89B72'];

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  onClose,
  onSaveTask,
  onDelete,
  onChainNextTask,
}) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [editedTask, setEditedTask] = useState<RoutineItem | null>(null);
  const [showInlineTimePicker, setShowInlineTimePicker] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerCat, setIconPickerCat] = useState<number>(0);

  const scrollOffset = useRef(0);
  const handleSaveRef = useRef<(() => void) | null>(null);

  const taskColor = React.useMemo(() => {
    if (!editedTask) return theme.colors.primary;
    if (editedTask.imageKey && TASK_COLORS[editedTask.imageKey]) return TASK_COLORS[editedTask.imageKey];
    
    let hash = 0;
    const str = editedTask.task || "";
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[idx];
  }, [editedTask?.imageKey, editedTask?.task, theme.colors.primary]);

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
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: (_, gestureState) => Platform.OS !== 'web' && Math.abs(gestureState.dy) > 10,
      onPanResponderMove: handlePanResponderMove,
      onPanResponderRelease: handlePanResponderRelease,
    })
  ).current;

  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (Platform.OS === 'web') return false;
        return gestureState.dy > 15 && scrollOffset.current <= 1;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (Platform.OS === 'web') return false;
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
      setShowInlineTimePicker(false);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedTask((prev) => {
      if (!prev) return prev;
      const subtasks = prev.subtasks?.map(st => st.id === id ? { ...st, completed: !st.completed } : st);
      return { ...prev, subtasks };
    });
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        onPress={() => {
          if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
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
        {Platform.OS === 'web' ? (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }
            ]} 
          />
        ) : (
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={Platform.OS === 'ios' ? 20 : 40}
            tint={isDarkMode ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
          />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAndSave} />
      </Animated.View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }], backgroundColor: theme.colors.background },
          ]}
        >
          {/* --- Draggable Header area --- */}
          <View {...headerPanResponder.panHandlers} style={[styles.headerSection, { backgroundColor: taskColor }]}>
            <View style={styles.handle} />

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeWithoutSave();
                }}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  closeAndSave();
                }}
                hitSlop={10}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.titleRow}>
              <View style={styles.dashedLineContainer}>
                <View style={styles.dashedLine} />
              </View>
              <TouchableOpacity
                style={styles.iconPill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowIconPicker(true);
                }}
                activeOpacity={0.75}
                hitSlop={10}
              >
                <Ionicons 
                  name={getRoutineIcon(editedTask.imageKey)} 
                  size={42} 
                  color={taskColor} 
                />
                <View style={[styles.paletteBadge, { borderColor: taskColor }]}>
                  <Ionicons name="color-palette" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.titleDetails}>
                <Text style={styles.timeTag}>{getDisplayTime()}</Text>
                <View style={styles.titleWithCheckRow}>
                  <View style={styles.titleBox}>
                    <TextInput
                      style={styles.taskTitleInput}
                      value={editedTask.task}
                      onChangeText={(t) => {
                        const autoKey = guessRoutineIconKey(t);
                        setEditedTask(prev => {
                          if (!prev) return null;
                          const isDefault = !prev.imageKey || prev.imageKey === "breathe";
                          return {
                            ...prev,
                            task: t,
                            imageKey: (isDefault && autoKey !== "breathe") ? autoKey : prev.imageKey
                          };
                        });
                      }}
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
                  icon={getRoutineIcon(editedTask.imageKey)}
                  iconColor={taskColor}
                  title="Ritual Icon"
                  value={editedTask.imageKey ? editedTask.imageKey.replace('_', ' ') : 'Select'}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowIconPicker(true);
                  }}
                />
                <CardRow
                  icon="time-outline"
                  iconColor={taskColor}
                  title={getDisplayTime()}
                  titleColor={theme.colors.text}
                  onPress={() => setShowInlineTimePicker(!showInlineTimePicker)}
                />
                 {showInlineTimePicker && (
                   <View style={{ paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.1)' }}>
                     <InlineTimePicker
                       value={editedTask.time || "1:00 AM"}
                       onChange={(time) => setEditedTask(prev => prev ? { ...prev, time } : null)}
                     />
                     
                     <View style={[styles.divider, { marginLeft: 16, marginVertical: 10 }]} />
                     
                     <View style={{ paddingHorizontal: 16 }}>
                       <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 }}>Duration</Text>
                       <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                         {[15, 30, 45, 60, 90, 120].map((dur) => (
                           <TouchableOpacity
                             key={dur}
                             style={[
                               styles.durPill,
                               editedTask.duration === dur && { backgroundColor: taskColor }
                             ]}
                             onPress={() => {
                               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                               setEditedTask(prev => prev ? { ...prev, duration: dur } : null);
                             }}
                           >
                             <Text style={[styles.durPillText, editedTask.duration === dur && { color: '#FFF' }]}>
                               {dur < 60 ? `${dur}m` : `${dur/60}h${dur%60 === 0 ? '' : ' ' + (dur%60)+'m'}`}
                             </Text>
                           </TouchableOpacity>
                         ))}
                       </View>
                     </View>
                   </View>
                 )}
                <CardRow
                  icon="sync"
                  iconColor={taskColor}
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
                            active && { backgroundColor: taskColor, borderColor: taskColor },
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
                      <Ionicons name={st.completed ? "checkmark-circle" : "square-outline"} size={22} color={st.completed ? taskColor : theme.colors.textSecondary} />
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
                      <Ionicons name="arrow-up-circle" size={26} color={taskColor} />
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

            <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
              {onChainNextTask && (
                <TouchableOpacity
                  style={[styles.chainPillBtn, { backgroundColor: `${theme.colors.primary}18` }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const dur = editedTask?.duration || 30;
                    const nextTime = addMinutesToTime(editedTask?.time || "8:00 AM", dur);
                    closeWithoutSave();
                    setTimeout(() => onChainNextTask(nextTime), 250);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.chainText, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>
                    Add Ritual After
                  </Text>
                </TouchableOpacity>
              )}

              {(() => {
                const taskName = editedTask?.task?.toLowerCase().trim();
                const isProtected = taskName === "wake up" || taskName === "sleep";
                if (isProtected) return null;
                return (
                  <TouchableOpacity 
                    style={styles.deletePillBtn} 
                    onPress={() => { 
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onDelete(); 
                      closeWithoutSave(); 
                    }} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF453A" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>

          {/* --- Icon Picker Modal --- */}
          <Modal
            visible={showIconPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowIconPicker(false)}
            statusBarTranslucent
          >
            <Pressable
              style={styles.iconModalOverlay}
              onPress={() => setShowIconPicker(false)}
            >
              <Pressable
                style={styles.iconModalCard}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.iconModalHeader}>
                  <View>
                    <Text style={styles.iconModalTitle}>Choose an Icon</Text>
                    <Text style={styles.iconModalSub}>Pick an icon for this ritual</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowIconPicker(false)}
                    hitSlop={10}
                    style={styles.iconModalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Category Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconCatTabs}
                >
                  {ICON_GROUPS.map((grp, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.iconCatTab,
                        iconPickerCat === idx && styles.iconCatTabActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setIconPickerCat(idx);
                      }}
                    >
                      <Text
                        style={[
                          styles.iconCatTabText,
                          iconPickerCat === idx && { color: theme.colors.white },
                        ]}
                      >
                        {grp.category}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Icons Grid */}
                <ScrollView
                  style={styles.iconGridScroll}
                  contentContainerStyle={styles.iconGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {ICON_GROUPS[iconPickerCat].icons.map((item) => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [
                        styles.iconGridItem,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEditedTask((prev) => (prev ? { ...prev, imageKey: item.key } : null));
                        setShowIconPicker(false);
                      }}
                    >
                      <View style={styles.iconGridCircle}>
                        <Ionicons
                          name={getRoutineIcon(item.key)}
                          size={22}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={styles.iconGridLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

        </Animated.View>
      </View>
    </Modal>
  );
};

export default TaskModal;

const getStyles = (theme: Theme) => StyleSheet.create({
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
  timeTag: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: theme.fonts.medium, marginBottom: 4 },
  titleWithCheckRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleBox: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.4)', paddingBottom: 6, marginRight: 16 },
  taskTitleInput: { color: '#FFFFFF', fontSize: 26, fontFamily: theme.fonts.bold, padding: 0, margin: 0 },
  bodySection: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  card: { borderRadius: 16, marginBottom: 16, paddingVertical: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  cardRowLeft: { flexDirection: 'row', alignItems: 'center' },
  cardRowRight: { flexDirection: 'row', alignItems: 'center' },
  cardRowTitle: { fontSize: 16, marginLeft: 12, fontFamily: theme.fonts.medium, color: theme.colors.text },
  cardRowValue: { color: theme.colors.textSecondary, fontSize: 16, fontFamily: theme.fonts.regular, marginRight: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: `${theme.colors.textSecondary}20`, marginLeft: 50 },
  proBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.colors.textSecondary}15`, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: `${theme.colors.textSecondary}25` },
  proBadgeText: { color: theme.colors.textSecondary, fontSize: 10, fontFamily: theme.fonts.bold },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${theme.colors.textSecondary}20` },
  dayBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: `${theme.colors.textSecondary}30`, alignItems: 'center', justifyContent: 'center' },
  dayBtnText: { fontSize: 14, fontFamily: theme.fonts.bold },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  subtaskCheck: { marginRight: 10 },
  subtaskInput: { flex: 1, fontSize: 16, fontFamily: theme.fonts.medium },
  subtaskDelete: { padding: 4 },
  subtaskAddBtn: { padding: 2 },
  textAreaContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10 },
  textArea: { fontSize: 15, fontFamily: theme.fonts.regular, minHeight: 80, textAlignVertical: 'top' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  chainPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  chainText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  deletePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 24,
  },
  deleteText: { color: '#FF453A', fontSize: 15, fontFamily: theme.fonts.bold },
  durPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${theme.colors.textSecondary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.textSecondary}25`,
  },
  durPillText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  pickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", alignItems: "center", zIndex: 100 },
  pickerCard: { borderRadius: 28, paddingVertical: 24, paddingHorizontal: 20, width: "90%", maxWidth: 320 },

  /* --- Icon Picker Modal Styles --- */
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
