import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity
} from "react-native";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { FormData, getRoutineImage } from "../utils/utils";
import { SimpleTimePicker } from "./SimpleTimePicker";

interface TaskFormProps {
  visible: boolean;
  isEditing: boolean;
  formData: FormData;
  onUpdateField: (field: keyof FormData, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const DAYS_OF_WEEK = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

const TEMPLATES = [
  { task: "Hydrate", description: "It's super effective! Drink water.", imageKey: "water" },
  { task: "Stretch", description: "Limber up to increase evasion.", imageKey: "yoga" },
  { task: "Tea Time", description: "Restore PP and focus your mind.", imageKey: "tea_journal" },
  { task: "Breakfast", description: "Boost Attack stat with nutrition.", imageKey: "breakfast" },
  { task: "Study", description: "Gain XP in a new skill.", imageKey: "study" },
  { task: "Lunch", description: "Refuel HP for the afternoon.", imageKey: "lunch" },
  { task: "Walk", description: "Encounter nature in the tall grass.", imageKey: "walk" },
  { task: "Reflect", description: "Check your progress badge.", imageKey: "reflect" },
  { task: "Dinner", description: "Share a meal with your party.", imageKey: "dinner" },
  { task: "Wind Down", description: "Lower defense, prepare to rest.", imageKey: "prepare_sleep" },
];

const TaskForm: React.FC<TaskFormProps> = ({
  visible,
  isEditing,
  formData,
  onUpdateField,
  onSave,
  onClose,
}) => {
  // Use the theme hook to get the current theme
  const { theme } = useTheme();
  // Create dynamic styles that will update when the theme changes
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const handleConfirmTime = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const toggleDay = useCallback((dayValue: number) => {
    const currentDays = formData.daysOfWeek || [];
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue].sort();
    
    // Require at least one day to be selected initially to avoid empty states, 
    // unless the user really insists (optional logic, but typically good UX).
    onUpdateField("daysOfWeek", newDays as any);
  }, [formData.daysOfWeek, onUpdateField]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.formModalOverlay}>
        <Animated.View
          style={[styles.enhancedFormContent, { transform: [{ translateY: slideAnim }] }]}
          testID="task-form-content"
        >
          <View style={styles.formHandle} />
          <View style={styles.formHeader}>
            <Pressable onPress={onClose} style={styles.formCancelButton}>
              <Text style={styles.formCancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.enhancedFormTitle}>
              {isEditing ? "Edit Task" : "New Task"}
            </Text>
            <Pressable onPress={onSave} style={styles.formSaveButton} testID="task-form-save-btn">
              <Text style={styles.formSaveText}>Save</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            {!isEditing && (
              <View style={styles.templatesSection}>
                <Text style={styles.inputLabel}>Quick Templates</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesList}>
                  {TEMPLATES.map((tmpl, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.templateChip}
                      onPress={() => {
                        onUpdateField("task", tmpl.task);
                        onUpdateField("description", tmpl.description);
                        onUpdateField("imageKey", tmpl.imageKey);
                      }}
                    >
                      <Image source={getRoutineImage(tmpl.imageKey)} style={styles.templateIcon} resizeMode="contain" />
                      <Text style={styles.templateText}>{tmpl.task}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Time</Text>
              <Pressable
                style={styles.timeInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text
                  style={[
                    styles.timeInputText,
                    !formData.time && styles.placeholderText,
                  ]}
                >
                  {formData.time || "Select time"}
                </Text>
                <Text style={styles.timeInputIcon}>🕐</Text>
              </Pressable>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Task Name</Text>
              <TextInput
                style={styles.enhancedInput}
                value={formData.task}
                onChangeText={(text) => onUpdateField("task", text)}
                placeholder="Add emoji + task name"
                placeholderTextColor="rgba(60, 60, 67, 0.3)"
                multiline
              />
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Repeat On</Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = (formData.daysOfWeek || []).includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayChip,
                        isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && { color: theme.colors.white }
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.quickSelectContainer}>
                <TouchableOpacity 
                  style={styles.quickSelectChip}
                  onPress={() => onUpdateField("daysOfWeek", [0, 1, 2, 3, 4, 5, 6] as any)}
                >
                  <Text style={styles.quickSelectText}>Everyday</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickSelectChip}
                  onPress={() => onUpdateField("daysOfWeek", [1, 2, 3, 4, 5] as any)}
                >
                  <Text style={styles.quickSelectText}>Weekdays</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickSelectChip}
                  onPress={() => onUpdateField("daysOfWeek", [0, 6] as any)}
                >
                  <Text style={styles.quickSelectText}>Weekends</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.enhancedInput, styles.descriptionInput]}
                value={formData.description}
                onChangeText={(text) => onUpdateField("description", text)}
                placeholder="Describe this activity..."
                placeholderTextColor="rgba(60, 60, 67, 0.3)"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </Animated.View>

        {showTimePicker && (
          <Pressable
            style={styles.timePickerOverlay}
            onPress={handleConfirmTime}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={styles.timePickerModalContainer}
            >
              <SimpleTimePicker
                selectedTime={formData.time}
                onTimeChange={(time: string) => onUpdateField("time", time)}
                onConfirm={handleConfirmTime}
              />
            </Pressable>
          </Pressable>
        )}
      </View>
    </Modal>
  );
};

// Converted the static StyleSheet into a function that accepts a theme
const getStyles = (theme: Theme) => StyleSheet.create({
  timePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModalContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 28,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    width: '90%',
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
      },
      android: {
        elevation: 25,
      },
      web: {
        boxShadow: '0px 20px 25px rgba(0,0,0,0.25)',
      } as any,
    }),
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  enhancedFormContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: theme.spacing.sm,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  formHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
    marginBottom: theme.spacing.lg,
  },
  formCancelButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  formCancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  enhancedFormTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  formSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  formSaveText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: "700",
  },
  formScrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  inputSection: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  enhancedInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    minHeight: 50,
  },
  templatesSection: {
    marginBottom: theme.spacing.xl,
  },
  templatesList: {
    paddingVertical: 5,
    gap: 12,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.colors.primary}08`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}15`,
    marginRight: 8,
  },
  templateIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  templateText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "600",
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: theme.spacing.md,
  },
  timeInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
  },
  timeInputText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  timeInputIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  quickSelectChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});

export default TaskForm;