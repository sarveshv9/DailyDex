import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";

export const DAYS_OF_WEEK = [
  { label: "S", full: "Sun", value: 0 },
  { label: "M", full: "Mon", value: 1 },
  { label: "T", full: "Tue", value: 2 },
  { label: "W", full: "Wed", value: 3 },
  { label: "T", full: "Thu", value: 4 },
  { label: "F", full: "Fri", value: 5 },
  { label: "S", full: "Sat", value: 6 },
] as const;

export interface DaysOfWeekPickerProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  activeColor?: string;
}

export const DaysOfWeekPicker: React.FC<DaysOfWeekPickerProps> = ({
  selectedDays,
  onChange,
  activeColor,
}) => {
  const { theme } = useTheme();
  const { selection } = useAppHaptics();
  const highlightColor = activeColor || theme.colors.primary;

  const toggleDay = (dayValue: number) => {
    selection();
    const current = selectedDays || [];
    if (current.includes(dayValue)) {
      onChange(current.filter((d) => d !== dayValue));
    } else {
      onChange([...current, dayValue].sort());
    }
  };

  return (
    <View style={styles.container}>
      {DAYS_OF_WEEK.map((day) => {
        const isActive = (selectedDays || []).includes(day.value);
        return (
          <TouchableOpacity
            key={day.value}
            style={[
              styles.dayBtn,
              { borderColor: theme.glass.borderColor },
              isActive && {
                backgroundColor: highlightColor,
                borderColor: highlightColor,
              },
            ]}
            onPress={() => toggleDay(day.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayBtnText,
                {
                  fontFamily: isActive ? theme.fonts.bold : theme.fonts.medium,
                  color: isActive ? theme.colors.white : theme.colors.textSecondary,
                },
              ]}
            >
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dayBtnText: {
    fontSize: 13,
  },
});
