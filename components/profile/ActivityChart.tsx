import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import { Theme } from "../../constants/shared";

type ActivityData = {
    dateStr: string;
    dayOfWeek: string;
    tasks: number;
    focusMinutes: number;
};

type Props = {
    data: ActivityData[];
    theme: Theme;
    metric: "tasks" | "focusMinutes";
    onToggleMetric: () => void;
};

export function ActivityChart({ data, theme, metric, onToggleMetric }: Props) {
    const isTasks = metric === "tasks";

    const maxValue = Math.max(
        ...data.map((d) => (isTasks ? d.tasks : d.focusMinutes)),
        1 // Prevent div by 0
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.primary }]}>
                    Weekly Activity
                </Text>

                <Pressable
                    style={[
                        styles.toggleBtn,
                        {
                            backgroundColor: `${theme.colors.primary}15`,
                            borderColor: `${theme.colors.primary}30`,
                        },
                    ]}
                    onPress={onToggleMetric}
                >
                    <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
                        {isTasks ? "Tasks" : "Focus Time"}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.chartArea}>
                {data.map((day, idx) => {
                    const value = isTasks ? day.tasks : day.focusMinutes;
                    const heightPercent = (value / maxValue) * 100;

                    return (
                        <View key={day.dateStr} style={styles.barColumn}>
                            {/* Value label */}
                            <Text style={styles.valueLabel}>
                                {value > 0 ? value : ""}
                            </Text>

                            <View style={[styles.barTrack, { backgroundColor: `${theme.colors.secondary}15` }]}>
                                {/* Animated Bar */}
                                <AnimatedBar
                                    heightPercent={heightPercent}
                                    color={theme.colors.primary}
                                    delay={idx * 50}
                                />
                            </View>

                            <Text style={[styles.dayLabel, { color: theme.colors.secondary }]}>
                                {day.dayOfWeek}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const AnimatedBar = ({ heightPercent, color, delay }: { heightPercent: number; color: string; delay: number }) => {
    const animatedHeight = useSharedValue(0);

    useEffect(() => {
        // Slide up animation using spring on mount/change
        animatedHeight.value = 0;
        const timeout = setTimeout(() => {
            animatedHeight.value = withSpring(heightPercent, {
                damping: 14,
                stiffness: 90,
            });
        }, delay);
        return () => clearTimeout(timeout);
    }, [heightPercent, delay]);

    const rStyle = useAnimatedStyle(() => {
        return {
            height: `${animatedHeight.value}%`,
            minHeight: animatedHeight.value > 0 ? 4 : 0, // tiny sliver if > 0
        };
    });

    return (
        <Animated.View
            style={[
                styles.barFill,
                { backgroundColor: color },
                rStyle,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: "600",
    },
    chartArea: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 160,
    },
    barColumn: {
        alignItems: "center",
        flex: 1,
    },
    barTrack: {
        width: 14,
        height: 110,
        borderRadius: 7,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    barFill: {
        width: "100%",
        borderRadius: 7,
    },
    valueLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "#9CA3AF",
        marginBottom: 6,
        height: 14, // reserve space so bars align perfectly at bottom
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 8,
    },
});
