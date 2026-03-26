import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

interface WebTimePickerProps {
  value: string; // "1:00 AM" format
  onChange: (time: string) => void;
  textColor?: string;
}

/**
 * Convert 12-hour string "1:00 AM" → "01:00" (24h for <input type="time">)
 */
const to24h = (timeStr: string): string => {
  if (!timeStr) return "00:00";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "00:00";
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Convert 24h "13:00" → "1:00 PM"
 */
const to12h = (value24: string): string => {
  const [hStr, mStr] = value24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const WebTimePicker: React.FC<WebTimePickerProps> = ({
  value,
  onChange,
  textColor,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const value24 = to24h(value);

  const handleChange = (e: any) => {
    const newVal = e.target.value; // "HH:MM" format
    if (newVal) {
      onChange(to12h(newVal));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Time</Text>
      <input
        type="time"
        value={value24}
        onChange={handleChange}
        style={{
          fontSize: 32,
          fontFamily: theme.fonts.bold,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.glass.borderColor,
          backgroundColor: theme.glass.cardBg,
          color: textColor || theme.colors.text,
          outline: "none",
          width: "100%",
          textAlign: "center" as const,
          WebkitAppearance: "none" as any,
          MozAppearance: "none" as any,
          colorScheme: "dark",
          boxShadow: `0 4px 12px rgba(0,0,0,${theme.glass.shadowOpacity})`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />
    </View>
  );
};

interface WebDurationPickerProps {
  value: number; // minutes
  onChange: (minutes: number) => void;
}

export const WebDurationPicker: React.FC<WebDurationPickerProps> = ({
  value,
  onChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return (
    <View style={styles.durationContainer}>
      <Text style={styles.label}>Custom Duration</Text>
      <View style={styles.durationRow}>
        <View style={styles.durationInputGroup}>
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => {
              const h = Math.max(
                0,
                Math.min(23, parseInt(e.target.value) || 0),
              );
              onChange(h * 60 + mins);
            }}
            style={{
              fontSize: 28,
              fontFamily: theme.fonts.bold,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.glass.borderColor,
              backgroundColor: theme.glass.cardBg,
              color: theme.colors.text,
              outline: "none",
              width: 70,
              textAlign: "center" as const,
              boxShadow: `0 4px 12px rgba(0,0,0,${theme.glass.shadowOpacity})`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          />
          <Text style={styles.unitLabel}>hr</Text>
        </View>

        <Text style={[styles.label, { fontSize: 28 }]}>:</Text>

        <View style={styles.durationInputGroup}>
          <input
            type="number"
            min="0"
            max="59"
            value={mins}
            onChange={(e) => {
              const m = Math.max(
                0,
                Math.min(59, parseInt(e.target.value) || 0),
              );
              onChange(hours * 60 + m);
            }}
            style={{
              fontSize: 28,
              fontFamily: theme.fonts.bold,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.glass.borderColor,
              backgroundColor: theme.glass.cardBg,
              color: theme.colors.text,
              outline: "none",
              width: 70,
              textAlign: "center" as const,
              boxShadow: `0 4px 12px rgba(0,0,0,${theme.glass.shadowOpacity})`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          />
          <Text style={styles.unitLabel}>min</Text>
        </View>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      padding: 8,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      marginBottom: 12,
      textAlign: "center",
    },
    durationContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      padding: 8,
    },
    durationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    durationInputGroup: {
      alignItems: "center",
      gap: 4,
    },
    unitLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
  });
