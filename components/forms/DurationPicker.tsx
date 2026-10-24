import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { formatDuration } from "../../utils/timeMath";

export const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120] as const;

export interface DurationPickerProps {
  selectedDuration: number;
  onChange: (minutes: number) => void;
  activeColor?: string;
  presets?: readonly number[];
}

export const DurationPicker: React.FC<DurationPickerProps> = ({
  selectedDuration,
  onChange,
  activeColor,
  presets = DURATION_PRESETS,
}) => {
  const { theme } = useTheme();
  const { selection } = useAppHaptics();
  const highlightColor = activeColor || theme.colors.primary;

  return (
    <View style={styles.container}>
      {presets.map((dur) => {
        const isActive = selectedDuration === dur;
        return (
          <TouchableOpacity
            key={dur}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? highlightColor : theme.glass.neutralFill,
                borderColor: isActive ? highlightColor : theme.glass.borderColor,
              },
            ]}
            onPress={() => {
              selection();
              onChange(dur);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  fontFamily: isActive ? theme.fonts.bold : theme.fonts.medium,
                  color: isActive ? "#FFFFFF" : theme.colors.text,
                },
              ]}
            >
              {formatDuration(dur)}
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
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
  },
  chipText: {
    fontSize: 13,
  },
});
