import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";

interface InlineTimePickerProps {
    value: string;
    onChange: (time: string) => void;
}

export const InlineTimePicker: React.FC<InlineTimePickerProps> = ({ value, onChange }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [hour, setHour] = useState("12");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState<"AM" | "PM">("PM");

    useEffect(() => {
        if (value) {
            const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (match) {
                setHour(match[1].padStart(2, "0"));
                setMinute(match[2]);
                setPeriod(match[3].toUpperCase() as "AM" | "PM");
            }
        }
    }, [value]);

    const updateTime = (h: string, m: string, p: "AM" | "PM") => {
        onChange(`${h}:${m} ${p}`);
    };

    const handleHourClick = () => {
        let newH = parseInt(hour, 10) + 1;
        if (newH > 12) newH = 1;
        const newHStr = newH.toString().padStart(2, "0");
        setHour(newHStr);
        updateTime(newHStr, minute, period);
    };

    const handleMinuteClick = () => {
        let newM = parseInt(minute, 10) + 15;
        if (newM >= 60) newM = 0;
        const newMStr = newM.toString().padStart(2, "0");
        setMinute(newMStr);
        updateTime(hour, newMStr, period);
    };

    const handlePeriodClick = () => {
        const newP = period === "AM" ? "PM" : "AM";
        setPeriod(newP);
        updateTime(hour, minute, newP);
    };

    return (
        <View style={styles.container}>
            <Pressable onPress={handleHourClick} style={styles.timeBlock}>
                <Text style={styles.timeText}>{hour}</Text>
            </Pressable>
            <Text style={styles.colon}>:</Text>
            <Pressable onPress={handleMinuteClick} style={styles.timeBlock}>
                <Text style={styles.timeText}>{minute}</Text>
            </Pressable>
            <View style={{ width: 8 }} />
            <Pressable onPress={handlePeriodClick} style={styles.periodBlock}>
                <Text style={styles.periodText}>{period}</Text>
            </Pressable>
        </View>
    );
};

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
        },
        timeBlock: {
            backgroundColor: theme.colors.white,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        timeText: {
            fontSize: 18,
            fontWeight: "700",
            color: theme.colors.primary,
            fontVariant: ["tabular-nums"],
        },
        colon: {
            fontSize: 18,
            fontWeight: "700",
            color: theme.colors.primary,
            marginHorizontal: 4,
        },
        periodBlock: {
            backgroundColor: `${theme.colors.primary}15`,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        periodText: {
            fontSize: 14,
            fontWeight: "700",
            color: theme.colors.primary,
        },
    });
