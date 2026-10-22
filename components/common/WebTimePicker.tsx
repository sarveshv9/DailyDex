import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown, ChevronUp, Clock, Plus, Minus } from "lucide-react-native";
import { Theme } from "../../styles/shared";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";

interface WebTimePickerProps {
  value: string; // "1:00 AM" format
  onChange: (time: string) => void;
  textColor?: string;
}

const parseTimeString = (timeStr: string): { hours: number; minutes: number; ampm: "AM" | "PM" } => {
  if (!timeStr) return { hours: 12, minutes: 0, ampm: "PM" };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 12, minutes: 0, ampm: "PM" };
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase() === "AM" ? "AM" : "PM";
  return { hours, minutes, ampm };
};

const formatTime = (hours: number, minutes: number, ampm: "AM" | "PM"): string => {
  const h = hours === 0 ? 12 : hours;
  const m = String(minutes).padStart(2, "0");
  return `${h}:${m} ${ampm}`;
};

export const WebTimePicker: React.FC<WebTimePickerProps> = ({
  value,
  onChange,
  textColor,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { hours, minutes, ampm } = useMemo(() => parseTimeString(value), [value]);

  const updateHours = (delta: number) => {
    Haptics.selectionAsync();
    let newH = hours + delta;
    if (newH > 12) newH = 1;
    if (newH < 1) newH = 12;
    onChange(formatTime(newH, minutes, ampm));
  };

  const updateMinutes = (delta: number) => {
    Haptics.selectionAsync();
    let newM = minutes + delta;
    if (newM >= 60) newM = 0;
    if (newM < 0) newM = 55;
    onChange(formatTime(hours, newM, ampm));
  };

  const toggleAmPm = (target: "AM" | "PM") => {
    if (ampm === target) return;
    Haptics.selectionAsync();
    onChange(formatTime(hours, minutes, target));
  };

  const setNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    let h = now.getHours();
    const m = Math.round(now.getMinutes() / 5) * 5;
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    onChange(formatTime(h, m >= 60 ? 0 : m, period));
  };

  const addMinutes = (extraMin: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let totalMinutes = (hours % 12) * 60 + minutes + (ampm === "PM" ? 12 * 60 : 0) + extraMin;
    totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);

    let newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    const newAmPm = newH >= 12 ? "PM" : "AM";
    newH = newH % 12 || 12;

    onChange(formatTime(newH, newM, newAmPm));
  };

  return (
    <View style={styles.container}>
      {/* Visual Clock Display Card */}
      <View style={styles.clockCard}>
        {/* Hours Stepper */}
        <View style={styles.digitGroup}>
          <Pressable
            onPress={() => updateHours(1)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
            accessibilityRole="button"
            accessibilityLabel="Increment Hour"
          >
            <ChevronUp size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.digitTile}>
            <Text style={[styles.digitText, textColor ? { color: textColor } : undefined]}>
              {String(hours).padStart(2, "0")}
            </Text>
          </View>
          <Pressable
            onPress={() => updateHours(-1)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
            accessibilityRole="button"
            accessibilityLabel="Decrement Hour"
          >
            <ChevronDown size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Colon Divider */}
        <View style={styles.colonContainer}>
          <Text style={[styles.colonText, { color: theme.colors.primary }]}>:</Text>
        </View>

        {/* Minutes Stepper */}
        <View style={styles.digitGroup}>
          <Pressable
            onPress={() => updateMinutes(5)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
            accessibilityRole="button"
            accessibilityLabel="Increment Minute"
          >
            <ChevronUp size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.digitTile}>
            <Text style={[styles.digitText, textColor ? { color: textColor } : undefined]}>
              {String(minutes).padStart(2, "0")}
            </Text>
          </View>
          <Pressable
            onPress={() => updateMinutes(-5)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
            accessibilityRole="button"
            accessibilityLabel="Decrement Minute"
          >
            <ChevronDown size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* AM / PM Selector */}
        <View style={styles.ampmColumn}>
          <Pressable
            onPress={() => toggleAmPm("AM")}
            style={[
              styles.ampmBtn,
              ampm === "AM" && [
                styles.ampmBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
          >
            <Text
              style={[
                styles.ampmText,
                ampm === "AM" && styles.ampmTextActive,
              ]}
            >
              AM
            </Text>
          </Pressable>

          <Pressable
            onPress={() => toggleAmPm("PM")}
            style={[
              styles.ampmBtn,
              ampm === "PM" && [
                styles.ampmBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
          >
            <Text
              style={[
                styles.ampmText,
                ampm === "PM" && styles.ampmTextActive,
              ]}
            >
              PM
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Adjust Pills */}
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
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  WEB DURATION PICKER                                               */
/* ------------------------------------------------------------------ */

interface WebDurationPickerProps {
  value: number; // minutes
  onChange: (minutes: number) => void;
}

const DURATION_PRESETS = [
  { label: "15m", value: 15 },
  { label: "25m", value: 25 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
];

export const WebDurationPicker: React.FC<WebDurationPickerProps> = ({
  value,
  onChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const hours = Math.floor(Math.max(0, value) / 60);
  const mins = Math.max(0, value) % 60;

  const updateHours = (delta: number) => {
    Haptics.selectionAsync();
    const newH = Math.max(0, Math.min(23, hours + delta));
    onChange(newH * 60 + mins);
  };

  const updateMinutes = (delta: number) => {
    Haptics.selectionAsync();
    let newM = mins + delta;
    let newH = hours;
    if (newM >= 60) {
      newM = 0;
      newH = Math.min(23, newH + 1);
    } else if (newM < 0) {
      if (newH > 0) {
        newM = 55;
        newH = newH - 1;
      } else {
        newM = 0;
      }
    }
    onChange(newH * 60 + newM);
  };

  const formattedSummary = useMemo(() => {
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${mins} min${mins !== 1 ? "s" : ""}`;
  }, [hours, mins]);

  return (
    <View style={styles.container}>
      {/* Duration Stepper Card */}
      <View style={styles.clockCard}>
        {/* Hours Control */}
        <View style={styles.digitGroup}>
          <Pressable
            onPress={() => updateHours(1)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
          >
            <Plus size={16} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.digitTile}>
            <Text style={styles.digitText}>{hours}</Text>
            <Text style={styles.subUnit}>HR</Text>
          </View>
          <Pressable
            onPress={() => updateHours(-1)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
          >
            <Minus size={16} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.colonContainer}>
          <Text style={[styles.colonText, { color: theme.colors.primary }]}>:</Text>
        </View>

        {/* Minutes Control */}
        <View style={styles.digitGroup}>
          <Pressable
            onPress={() => updateMinutes(5)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
          >
            <Plus size={16} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.digitTile}>
            <Text style={styles.digitText}>{String(mins).padStart(2, "0")}</Text>
            <Text style={styles.subUnit}>MIN</Text>
          </View>
          <Pressable
            onPress={() => updateMinutes(-5)}
            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
          >
            <Minus size={16} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* Summary Badge */}
      <View style={[styles.summaryBadge, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}35` }]}>
        <Clock size={12} color={theme.colors.primary} strokeWidth={2} />
        <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
          Total: {formattedSummary}
        </Text>
      </View>

      {/* Quick Presets */}
      <View style={styles.presetWrap}>
        {DURATION_PRESETS.map((p) => {
          const isSelected = value === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(p.value);
              }}
              style={[
                styles.presetChip,
                isSelected && [
                  styles.presetChipActive,
                  { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ],
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  isSelected && styles.presetChipTextActive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
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
      paddingVertical: 4,
    },
    clockCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      borderRadius: theme.borderRadius.lg,
      padding: 12,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
        web: {
          boxShadow: `0 4px 16px rgba(0,0,0,${theme.glass.shadowOpacity})`,
          backdropFilter: "blur(12px)",
        },
      }),
    },
    digitGroup: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    stepperBtn: {
      width: 38,
      height: 30,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.glass.neutralFill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    stepperPressed: {
      opacity: 0.6,
      transform: [{ scale: 0.95 }],
    },
    digitTile: {
      minWidth: 58,
      height: 52,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      paddingHorizontal: 6,
    },
    digitText: {
      fontSize: 28,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: 1,
      textAlign: "center",
    },
    subUnit: {
      fontSize: 9,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      marginTop: -2,
    },
    colonContainer: {
      paddingBottom: 2,
    },
    colonText: {
      fontSize: 26,
      fontFamily: theme.fonts.bold,
    },
    ampmColumn: {
      flexDirection: "column",
      gap: 6,
      marginLeft: 4,
    },
    ampmBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.glass.neutralFill,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      alignItems: "center",
      justifyContent: "center",
    },
    ampmBtnActive: {
      borderWidth: 0,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
        },
        web: {
          boxShadow: `0 2px 8px ${theme.colors.primary}50`,
        },
      }),
    },
    ampmText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
    },
    ampmTextActive: {
      color: theme.colors.white,
    },
    quickRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
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
    summaryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      marginTop: 10,
    },
    summaryText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
    },
    presetWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 6,
      marginTop: 10,
    },
    presetChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.glass.neutralFill,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
    },
    presetChipActive: {
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
        },
        web: {
          boxShadow: `0 2px 8px ${theme.colors.primary}45`,
        },
      }),
    },
    presetChipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
    },
    presetChipTextActive: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
  });

export default WebTimePicker;
