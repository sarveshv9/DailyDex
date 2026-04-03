import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  useColorScheme,
  View
} from "react-native";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";
import { FormData, getRoutineIcon } from "../../utils/utils";
import { InlineTimePicker } from "../common/InlineTimePicker";

/* ─────────────────────────────── Types ──────────────────────────────── */

interface TaskFormProps {
  visible: boolean;
  isEditing: boolean;
  formData: FormData;
  onUpdateField: (field: keyof FormData, value: any) => void;
  onSave: () => void;
  onSaveInstance?: () => void;
  onClose: () => void;
}

/* ─────────────────────────────── Constants ──────────────────────────── */

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

/** Duration presets in minutes */
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const TEMPLATES = [
  { task: "Hydrate", description: "Drink a full glass of water.", imageKey: "water" },
  { task: "Stretch", description: "Loosen up and improve flexibility.", imageKey: "yoga" },
  { task: "Tea Time", description: "Slow down and restore focus.", imageKey: "tea_journal" },
  { task: "Breakfast", description: "Fuel up for the morning ahead.", imageKey: "breakfast" },
  { task: "Study", description: "Deep work on a skill or subject.", imageKey: "study" },
  { task: "Lunch", description: "Refuel and take a proper break.", imageKey: "lunch" },
  { task: "Walk", description: "Clear your head outdoors.", imageKey: "walk" },
  { task: "Reflect", description: "Review the day and set intentions.", imageKey: "reflect" },
  { task: "Dinner", description: "Share a mindful evening meal.", imageKey: "dinner" },
  { task: "Wind Down", description: "Transition your body toward rest.", imageKey: "prepare_sleep" },
];

/** Format minutes → human-readable string (e.g. "1 hr 30 min") */
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};

/* ─────────────────────────────── Component ──────────────────────────── */

const TaskForm: React.FC<TaskFormProps> = ({
  visible,
  isEditing,
  formData,
  onUpdateField,
  onSave,
  onSaveInstance,
  onClose,
}) => {
  const { theme, isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  /* ── Sheet open/close animation ── */
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
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  /* ── Time picker ── */
  const handleConfirmTime = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  /* ── Day toggle ── */
  const toggleDay = useCallback(
    (dayValue: number) => {
      Haptics.selectionAsync();
      const current = formData.daysOfWeek ?? [];
      const next = current.includes(dayValue)
        ? current.filter((d) => d !== dayValue)
        : [...current, dayValue].sort();
      onUpdateField("daysOfWeek", next as any);
    },
    [formData.daysOfWeek, onUpdateField]
  );

  /* ── Duration helpers ── */
  const currentDuration: number = formData.duration ?? 30;

  const setDuration = useCallback(
    (mins: number) => {
      Haptics.selectionAsync();
      onUpdateField("duration", mins);
    },
    [onUpdateField]
  );

  const adjustDuration = useCallback(
    (delta: number) => {
      const next = Math.max(5, Math.min(240, currentDuration + delta));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdateField("duration", next);
    },
    [currentDuration, onUpdateField]
  );

  /* ── Template fill ── */
  const applyTemplate = useCallback(
    (tmpl: typeof TEMPLATES[number]) => {
      Haptics.selectionAsync();
      onUpdateField("task", tmpl.task);
      onUpdateField("description", tmpl.description);
      onUpdateField("imageKey", tmpl.imageKey);
    },
    [onUpdateField]
  );

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
              extrapolate: 'clamp'
            })
          }
        ]}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={Platform.OS === 'ios' ? 20 : 40}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod="dimezisBlurView"
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          testID="task-form-content"
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={Platform.OS === 'ios' ? 60 : 100}
            tint={isDark ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
          />
          {/* ── Handle ── */}
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={10}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              {isEditing ? "Edit Task" : "New Task"}
            </Text>

            <Pressable
              onPress={onSave}
              style={styles.saveBtn}
              testID="task-form-save-btn"
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          {/* ── Scrollable body ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Quick templates (new task only) ── */}
            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Quick Start</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateRow}
                >
                  {TEMPLATES.map((tmpl, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.templateChip,
                        pressed && styles.templateChipPressed,
                      ]}
                      onPress={() => applyTemplate(tmpl)}
                    >
                      <Ionicons
                        name={getRoutineIcon(tmpl.imageKey)}
                        size={20}
                        color={theme.colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.templateLabel}>{tmpl.task}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Time ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Start Time</Text>
              <Pressable
                style={styles.fieldCard}
                onPress={() => setShowTimePicker(!showTimePicker)}
              >
                <View style={styles.fieldIconWrap}>
                  <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    styles.fieldValue,
                    !formData.time && styles.fieldPlaceholder,
                  ]}
                >
                  {formData.time || "Set time"}
                </Text>
                <Ionicons
                  name={showTimePicker ? "chevron-up" : "chevron-forward"}
                  size={16}
                  color={`${theme.colors.textSecondary}60`}
                />
              </Pressable>

              {showTimePicker && (
                <View style={[styles.fieldCard, { marginTop: 8, paddingVertical: 10 }]}>
                  <InlineTimePicker
                    value={formData.time || "1:00 AM"}
                    onChange={(time) => onUpdateField("time", time)}
                  />
                </View>
              )}
            </View>

            {/* ── Task name ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Task Name</Text>
              <View style={styles.fieldCard}>
                <View style={styles.fieldIconWrap}>
                  <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={formData.task}
                  onChangeText={(t) => onUpdateField("task", t)}
                  placeholder="e.g. ☕ Morning coffee"
                  placeholderTextColor={`${theme.colors.textSecondary}50`}
                  multiline={false}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* ── Duration ── */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Duration</Text>
                <View style={styles.durationBadge}>
                  <Text style={[styles.durationBadgeText, { color: theme.colors.primary }]}>
                    {formatDuration(currentDuration)}
                  </Text>
                </View>
              </View>

              {/* Stepper */}
              <View style={styles.fieldCard}>
                <View style={styles.fieldIconWrap}>
                  <Ionicons name="hourglass-outline" size={18} color={theme.colors.primary} />
                </View>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustDuration(-5)}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
                </Pressable>
                <View style={styles.stepperTrack}>
                  {/* Visual fill bar */}
                  <View
                    style={[
                      styles.stepperFill,
                      {
                        width: `${Math.min(100, (currentDuration / 120) * 100)}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                  <Text style={styles.stepperValue}>{currentDuration} min</Text>
                </View>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustDuration(5)}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </Pressable>
              </View>

              {/* Preset chips */}
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((mins) => (
                  <Pressable
                    key={mins}
                    style={[
                      styles.presetChip,
                      currentDuration === mins && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setDuration(mins)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        currentDuration === mins && { color: theme.colors.white },
                      ]}
                    >
                      {formatDuration(mins)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Repeat days ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Repeat On</Text>

              <View style={[styles.fieldCard, styles.fieldCardPadded]}>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => {
                    const active = (formData.daysOfWeek ?? []).includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayBtn,
                          active && {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                        onPress={() => toggleDay(day.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayBtnText,
                            active && { color: theme.colors.white },
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Quick-select row */}
                <View style={styles.quickRow}>
                  {[
                    { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
                    { label: "Weekdays", days: [1, 2, 3, 4, 5] },
                    { label: "Weekends", days: [0, 6] },
                  ].map(({ label, days }) => {
                    const active =
                      days.length === (formData.daysOfWeek ?? []).length &&
                      days.every((d) => (formData.daysOfWeek ?? []).includes(d));
                    return (
                      <Pressable
                        key={label}
                        style={[
                          styles.quickChip,
                          active && {
                            backgroundColor: `${theme.colors.primary}18`,
                            borderColor: `${theme.colors.primary}60`,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          onUpdateField("daysOfWeek", days as any);
                        }}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            active && { color: theme.colors.primary, fontWeight: "700" },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Description ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <View style={[styles.fieldCard, styles.fieldCardPadded, styles.descCard]}>
                <TextInput
                  style={styles.descInput}
                  value={formData.description}
                  onChangeText={(t) => onUpdateField("description", t)}
                  placeholder="Add a note or intention for this task…"
                  placeholderTextColor={`${theme.colors.textSecondary}50`}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* ── Single Instance Exception Button ── */}
            {isEditing && (formData.daysOfWeek?.length ?? 0) > 0 && onSaveInstance && (
              <View style={{ marginBottom: 24 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: theme.colors.textSecondary },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={onSaveInstance}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.white} />
                  <Text style={styles.primaryButtonText}>Save for this date only</Text>
                </Pressable>
                <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: theme.colors.textSecondary }}>
                  Creates a one-time override without changing other days.
                </Text>
              </View>
            )}

            {/* Bottom safe-area breathing room */}
            <View style={{ height: 16 }} />
          </ScrollView>
        </Animated.View>

      </View>
    </Modal>
  );
};

/* ─────────────────────────────── Styles ─────────────────────────────── */

const getStyles = (theme: Theme) =>
  StyleSheet.create({

    /* ── Modal shell ── */
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.glass.cardBg,
      borderTopLeftRadius: 36,
      borderTopRightRadius: 36,
      paddingTop: 10,
      paddingBottom: 40,
      height: SCREEN_HEIGHT * 0.85,
      maxHeight: SCREEN_HEIGHT * 0.92,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
        },
        android: { elevation: 20 },
      }),
    },

    /* ── Handle ── */
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.colors.text}20`,
      alignSelf: "center",
      marginBottom: 16,
    },

    /* ── Header ── */
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.text}10`,
      marginBottom: 8,
    },
    headerBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
      minWidth: 60,
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
      paddingVertical: 9,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 22,
      minWidth: 60,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        android: { elevation: 5 },
      }),
    },
    saveText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },

    /* ── Scroll ── */
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },

    /* ── Section ── */
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.9,
      marginBottom: 10,
      marginLeft: 2,
      opacity: 0.75,
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    /* ── Field card (grouped input background) ── */
    fieldCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.text}0A`,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: `${theme.colors.text}0F`,
      minHeight: 56,
    },
    fieldCardPadded: {
      flexDirection: "column",
      alignItems: "stretch",
      paddingVertical: 16,
    },
    fieldIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${theme.colors.primary}14`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      flexShrink: 0,
    },
    fieldValue: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    fieldPlaceholder: {
      color: theme.colors.textSecondary,
      opacity: 0.6,
    },

    /* ── Text input inside card ── */
    textInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
      padding: 0,
      margin: 0,
    },

    /* ── Duration stepper ── */
    durationBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: `${theme.colors.primary}14`,
    },
    durationBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.1,
    },
    stepperBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.text}0D`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    stepperTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: `${theme.colors.text}0E`,
      marginHorizontal: 12,
      overflow: "hidden",
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    stepperFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 4,
    },
    stepperValue: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      zIndex: 1,
      letterSpacing: 0.1,
    },

    /* Duration presets */
    presetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    presetChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${theme.colors.text}1A`,
      backgroundColor: `${theme.colors.text}08`,
    },
    presetChipText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── Days of week ── */
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dayBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${theme.colors.text}1A`,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.text}0A`,
    },
    dayBtnText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
    },
    quickRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    quickChip: {
      paddingVertical: 6,
      paddingHorizontal: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.colors.text}10`,
      backgroundColor: `${theme.colors.text}06`,
    },
    quickChipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },

    /* ── Description ── */
    descCard: {
      minHeight: 110,
    },
    descInput: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
      lineHeight: 22,
      padding: 0,
      minHeight: 80,
    },

    /* ── Templates ── */
    templateRow: {
      paddingVertical: 2,
      gap: 10,
    },
    templateChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}10`,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}1A`,
    },
    templateChipPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    templateImg: {
      width: 22,
      height: 22,
      marginRight: 7,
    },
    templateLabel: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    /* ── Single Instance Button ── */
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 18,
      marginHorizontal: 10,
    },
    primaryButtonText: {
      marginLeft: 8,
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },

    /* ── Time picker ── */
    pickerOverlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: theme.colors.background,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    pickerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 28,
      paddingVertical: 24,
      paddingHorizontal: 20,
      width: "90%",
      maxWidth: 320,
      borderWidth: 1,
      borderColor: `${theme.colors.text}26`,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.22,
          shadowRadius: 28,
        },
        android: { elevation: 24 },
      }),
    },
  });

export default TaskForm;