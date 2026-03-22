import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
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
    timeframe: "week" | "month" | "year";
    metric: "tasks" | "focusMinutes";
    onToggleMetric: () => void;
};

export function ActivityChart({ data, theme, timeframe, metric, onToggleMetric }: Props) {
    const isTasks = metric === "tasks";
    const scrollViewRef = useRef<ScrollView>(null);

    // Scroll to the end (right) when data changes, so we always see the most recent
    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [data, timeframe]);

    const maxValue = Math.max(
        ...data.map((d) => (isTasks ? d.tasks : d.focusMinutes)),
        1 // Prevent div by 0
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.primary }]}>
                    Activity Summary
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

            <ScrollView 
                ref={scrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.scrollContainer}
                contentContainerStyle={[styles.chartArea, timeframe === 'week' && { flex: 1, justifyContent: "space-between" }]}
            >
                {data.map((day, idx) => {
                    const value = isTasks ? day.tasks : day.focusMinutes;
                    const heightPercent = (value / maxValue) * 100;
                    
                    // Compact columns for month to fit nicely
                    const columnStyle = timeframe === 'month' ? styles.barColumnCompact : styles.barColumn;
                    const trackStyle = timeframe === 'month' ? styles.barTrackCompact : styles.barTrack;

                    return (
                        <View key={`${day.dateStr}-${idx}`} style={columnStyle}>
                            {/* Value label */}
                            <Text style={styles.valueLabel}>
                                {value > 0 ? value : ""}
                            </Text>

                            <View style={[trackStyle, { backgroundColor: `${theme.colors.secondary}15` }]}>
                                {/* Animated Bar */}
                                <AnimatedBar
                                    heightPercent={heightPercent}
                                    color={theme.colors.primary}
                                    delay={Math.min(idx * 20, 500)} // cap delay so month view doesn't take 2s
                                />
                            </View>

                            <Text style={[styles.dayLabel, { color: theme.colors.secondary }]} numberOfLines={1}>
                                {day.dayOfWeek}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
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
    scrollContainer: {
        width: "100%",
    },
    chartArea: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 160,
        gap: 8, 
        paddingRight: 8,
    },
    barColumn: {
        alignItems: "center",
        flex: 1,
        minWidth: 35,
    },
    barColumnCompact: {
        alignItems: "center",
        width: 25,
    },
    barTrack: {
        width: 14,
        height: 110,
        borderRadius: 7,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    barTrackCompact: {
        width: 10,
        height: 110,
        borderRadius: 5,
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
