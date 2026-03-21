import React, { useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

interface InlineTimePickerProps {
    value: string;
    onChange: (time: string) => void;
}

export const InlineTimePicker: React.FC<InlineTimePickerProps> = ({ value, onChange }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

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
            let h = selectedDate.getHours();
            const m = selectedDate.getMinutes();
            const ampm = h >= 12 ? "PM" : "AM";
            h = h % 12 || 12;
            onChange(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
        }
    };

    return (
        <View style={styles.container}>
            <DateTimePicker
                value={currentDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleChange}
                textColor={theme.colors.text}
                style={{ height: 160, width: "100%" }}
            />
        </View>
    );
};

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: "center",
            justifyContent: "center",
        },
    });
