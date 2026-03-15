import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

interface SimpleTimePickerProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  onConfirm: () => void;
}

// A component that can be tapped to edit a number.
const EditableNumber: React.FC<{
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  pad: boolean;
  styles: any;
}> = ({ value, onChange, min, max, pad, styles }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(pad ? String(value).padStart(2, "0") : String(value));
  }, [value, pad]);

  const handleBlur = () => {
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) {
      num = value;
    } else if (num > max) {
      num = max;
    } else if (num < min) {
      num = min;
    }
    onChange(num);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TextInput
        style={[styles.selectedPickerText, styles.borderedNumberInput]}
        value={inputValue}
        onChangeText={setInputValue}
        onBlur={handleBlur}
        keyboardType="numeric"
        maxLength={2}
      />
    );
  }

  return (
    <Pressable
      onPress={() => setIsEditing(true)}
      style={styles.borderedNumber}
    >
      <Text style={styles.selectedPickerText}>
        {pad ? String(value).padStart(2, "0") : value}
      </Text>
    </Pressable>
  );
};

export const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({
  selectedTime,
  onTimeChange,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // **[THE FIX] The `parseInitialTime` function is now complete.**
  const parseInitialTime = (): { hour: number; minute: number; period: "AM" | "PM" } => {
    if (selectedTime) {
      const match = selectedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        const period = match[3].toUpperCase();
        if (period === 'AM' || period === 'PM') {
          return {
            hour: parseInt(match[1], 10),
            minute: parseInt(match[2], 10),
            period: period,
          };
        }
      }
    }
    // This fallback logic was missing, causing the error.
    // It returns the current time if `selectedTime` is invalid.
    const now = new Date();
    let hour = now.getHours();
    const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12; // Converts 0h to 12h
    return { hour, minute: now.getMinutes(), period };
  };

  const [hour, setHour] = useState(parseInitialTime().hour);
  const [minute, setMinute] = useState(parseInitialTime().minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parseInitialTime().period);

  useEffect(() => {
    const timeStr = `${hour}:${String(minute).padStart(2, "0")} ${period}`;
    onTimeChange(timeStr);
  }, [hour, minute, period, onTimeChange]);

  const handleHourChange = (amount: 1 | -1) => {
    let newHour = Number(hour) + amount;
    if (newHour > 12) newHour = 1;
    if (newHour < 1) newHour = 12;
    setHour(newHour);
  };

  const handleMinuteChange = (amount: 1 | -1) => {
    let newMinute = Number(minute) + amount;
    if (newMinute > 59) newMinute = 0;
    if (newMinute < 0) newMinute = 59;
    setMinute(newMinute);
  };

  const togglePeriod = () => {
    setPeriod(period === "AM" ? "PM" : "AM");
  };

  return (
    <View>
      <Text style={styles.timePickerLabel}>Select Time</Text>
      <View style={styles.pickerWrapper}>
        <View style={styles.pickerColumn}>
          <Pressable onPress={() => handleHourChange(1)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▲</Text>
          </Pressable>
          <EditableNumber value={hour} onChange={setHour} min={1} max={12} pad={false} styles={styles} />
          <Pressable onPress={() => handleHourChange(-1)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▼</Text>
          </Pressable>
        </View>

        <Text style={styles.pickerSeparator}>:</Text>

        <View style={styles.pickerColumn}>
          <Pressable onPress={() => handleMinuteChange(1)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▲</Text>
          </Pressable>
          <EditableNumber value={minute} onChange={setMinute} min={0} max={59} pad={true} styles={styles} />
          <Pressable onPress={() => handleMinuteChange(-1)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.pickerColumn}>
          <Pressable onPress={togglePeriod} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▲</Text>
          </Pressable>
          <Pressable onPress={togglePeriod}>
            <Text style={styles.selectedPickerText}>{period}</Text>
          </Pressable>
          <Pressable onPress={togglePeriod} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▼</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.timeConfirmButton} onPress={onConfirm}>
        <Text style={styles.timeConfirmText}>Done</Text>
      </Pressable>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  borderedNumber: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    minWidth: 60,
  },
  borderedNumberInput: {
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    width: 60,
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    textAlign: 'center',
  },
  timePickerLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    marginBottom: theme.spacing.lg,
  },
  pickerColumn: {
    height: 160,
    justifyContent: "space-between",
    alignItems: 'center',
    width: 90,
  },
  selectedPickerText: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  pickerSeparator: {
    fontSize: 28,
    fontWeight: "600",
    color: theme.colors.text,
    marginHorizontal: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
    alignSelf: 'center',
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  timeConfirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    minWidth: 120,
    alignItems: "center",
    alignSelf: "center",
  },
  timeConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    fontFamily: theme.fonts.bold,
  },
});