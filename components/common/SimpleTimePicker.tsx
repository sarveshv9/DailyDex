import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

interface SimpleTimePickerProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  onConfirm: () => void;
}

export const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({
  selectedTime,
  onTimeChange,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (Platform.OS === 'web') {
    const { WebTimePicker } = require('./WebTimePicker');
    return (
      <View style={styles.container}>
        <WebTimePicker value={selectedTime || "1:00 AM"} onChange={onTimeChange} />
        <Pressable style={styles.timeConfirmButton} onPress={onConfirm}>
          <Text style={styles.timeConfirmText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const DateTimePicker = require("@react-native-community/datetimepicker").default;

  const getDateFromString = (timeStr: string) => {
    const now = new Date();
    if (!timeStr) return now;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      now.setHours(h, m, 0, 0);
    }
    return now;
  };

  const currentDate = getDateFromString(selectedTime);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      if (Platform.OS === 'android') {
        onConfirm();
      }
      return;
    }

    if (selectedDate) {
      let h = selectedDate.getHours();
      const m = selectedDate.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      onTimeChange(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
    }

    if (Platform.OS === 'android') {
      onConfirm();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timePickerLabel}>Select Time</Text>
      <View style={styles.pickerWrapper}>
        <DateTimePicker
          value={currentDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          textColor={theme.colors.text}
          style={styles.picker}
        />
      </View>
      <Pressable style={styles.timeConfirmButton} onPress={onConfirm}>
        <Text style={styles.timeConfirmText}>Done</Text>
      </Pressable>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  pickerWrapper: {
    height: 180,
    width: '100%',
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  picker: {
    flex: 1,
    width: '100%',
  },
  timeConfirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    minWidth: 120,
    alignItems: "center",
  },
  timeConfirmText: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
});