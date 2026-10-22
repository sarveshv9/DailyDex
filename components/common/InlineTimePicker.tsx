import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";
import { Theme } from "../../styles/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";

interface InlineTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  showQuickChips?: boolean;
}

export const InlineTimePicker: React.FC<InlineTimePickerProps> = ({
  value,
  onChange,
  showQuickChips = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  if (Platform.OS === "web") {
    const { WebTimePicker } = require("./WebTimePicker");
    return (
      <View style={styles.container}>
        <WebTimePicker value={value || "1:00 AM"} onChange={onChange} />
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

  const currentDate = getDateFromString(value);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      Haptics.selectionAsync();
      let h = selectedDate.getHours();
      const m = selectedDate.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      onChange(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
    }
  };

  const addMinutes = (extraMin: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentDate.getTime() + extraMin * 60 * 1000);
    let h = newDate.getHours();
    const m = newDate.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    onChange(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
  };

  const setNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    let h = now.getHours();
    const m = Math.round(now.getMinutes() / 5) * 5;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    onChange(`${h}:${String(m >= 60 ? 0 : m).padStart(2, "0")} ${ampm}`);
  };

  return (
    <View style={styles.container}>
      {/* Header Pill */}
      <View
        style={[
          styles.previewBadge,
          {
            backgroundColor: `${theme.colors.primary}15`,
            borderColor: `${theme.colors.primary}35`,
          },
        ]}
      >
        <Clock size={14} color={theme.colors.primary} strokeWidth={2} />
        <Text style={[styles.previewText, { color: theme.colors.primary }]}>
          {value || "1:00 AM"}
        </Text>
      </View>

      {/* Native Picker */}
      <View style={styles.pickerWrapper}>
        <DateTimePicker
          value={currentDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          textColor={theme.colors.text}
          style={{
            height: 160,
            alignSelf: "center",
            width: Platform.OS === "ios" ? 320 : "100%",
          }}
          themeVariant={theme.colors.background === "#000000" ? "dark" : "light"}
        />
      </View>

      {/* Quick Adjust Pills for Native */}
      {showQuickChips && (
        <View style={styles.quickRow}>
          <Pressable
            onPress={setNow}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Clock size={12} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.quickChipText}>Now</Text>
          </Pressable>

          <Pressable
            onPress={() => addMinutes(15)}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Text style={styles.quickChipText}>+15m</Text>
          </Pressable>

          <Pressable
            onPress={() => addMinutes(30)}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Text style={styles.quickChipText}>+30m</Text>
          </Pressable>

          <Pressable
            onPress={() => addMinutes(60)}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Text style={styles.quickChipText}>+1h</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      paddingVertical: 4,
    },
    previewBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      marginBottom: 8,
    },
    previewText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.3,
    },
    pickerWrapper: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    quickRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    quickChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.glass.neutralFill,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    quickChipPressed: {
      opacity: 0.6,
      transform: [{ scale: 0.95 }],
    },
    quickChipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
  });

export default InlineTimePicker;
