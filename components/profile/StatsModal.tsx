import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme } from "../../constants/shared";
import { getTodayString, getWeeklyData, getMonthlyData, getYearlyData, UserStats } from "../../utils/stats";
import { ActivityChart } from "./ActivityChart";
import { BottomSheet } from "./BottomSheet";

type StatsModalProps = {
    visible: boolean;
    onClose: () => void;
    theme: Theme;
    stats: UserStats | null;
};

export function StatsModal({ visible, onClose, theme, stats }: StatsModalProps) {
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [chartMetric, setChartMetric] = useState<"tasks" | "focusMinutes">("tasks");
    const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

    const chartData = useMemo(() => {
        if (!stats) return [];
        switch (timeframe) {
            case "month": return getMonthlyData(stats);
            case "year": return getYearlyData(stats);
            case "week":
            default: return getWeeklyData(stats);
        }
    }, [stats, timeframe]);

    if (!stats) return null;

    const todayString = getTodayString();
    const todayStats = stats.history[todayString] || { tasks: 0, focusMinutes: 0 };

    // Encouraging messages
    let encouragingMessage = "Every step counts. Keep going!";
    if (stats.currentStreak >= 7) {
        encouragingMessage = "You're on a magnificent streak!🔥";
    } else if (todayStats.tasks > 5) {
        encouragingMessage = "Incredible productivity today! 🚀";
    } else if (stats.tasksCompleted > 0) {
        encouragingMessage = "Great job building momentum! 🌟";
    }

    return (
        <BottomSheet visible={visible} onClose={onClose} theme={theme} title="Your Zen Journey">
            {/* Previously a custom slide-up modal; replaced with shared BottomSheet for UI consistency */}
            <ScrollView style={{ flexShrink: 1, width: "100%" }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                        {/* Encouraging Banner */}
                        <View style={styles.banner}>
                            <Text style={styles.bannerText}>{encouragingMessage}</Text>
                        </View>



                        {/* Streaks */}
                        <Text style={styles.sectionTitle}>Momentum</Text>
                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { borderColor: '#FF6B6B' }]}>
                                <Ionicons name="flame" size={28} color="#FF6B6B" />
                                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                                <Text style={styles.statLabel}>Days Active</Text>
                            </View>
                            <View style={[styles.statBox, { borderColor: '#F4A261' }]}>
                                <Ionicons name="trophy" size={28} color="#F4A261" />
                                <Text style={styles.statValue}>{stats.bestStreak}</Text>
                                <Text style={styles.statLabel}>Best Streak</Text>
                            </View>
                        </View>

                        {/* Timeframe Toggles */}
                        <View style={styles.timeframeContainer}>
                            {(["week", "month", "year"] as const).map((tf) => (
                                <Pressable
                                    key={tf}
                                    style={[
                                        styles.timeframeBtn,
                                        timeframe === tf && { backgroundColor: theme.colors.primary },
                                    ]}
                                    onPress={() => setTimeframe(tf)}
                                >
                                    <Text
                                        style={[
                                            styles.timeframeText,
                                            { color: timeframe === tf ? "white" : theme.colors.textSecondary },
                                        ]}
                                    >
                                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Activity Chart */}
                        <ActivityChart
                            data={chartData}
                            theme={theme}
                            timeframe={timeframe}
                            metric={chartMetric}
                            onToggleMetric={() =>
                                setChartMetric((m) =>
                                    m === "tasks" ? "focusMinutes" : "tasks"
                                )
                            }
                        />

                        {/* Today's Focus */}
                        <Text style={styles.sectionTitle}>Today&apos;s Focus</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                                    <Ionicons name="checkmark-done" size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.statValue}>{todayStats.tasks}</Text>
                                <Text style={styles.statLabel}>Tasks Done</Text>
                            </View>
                            <View style={styles.statBox}>
                                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.secondary}15` }]}>
                                    <Ionicons name="time" size={20} color={theme.colors.secondary} />
                                </View>
                                <Text style={styles.statValue}>{todayStats.focusMinutes}m</Text>
                                <Text style={styles.statLabel}>Time Focused</Text>
                            </View>
                        </View>

                        {/* All Time Achievements */}
                        <Text style={styles.sectionTitle}>Lifetime Milestones</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.milestoneBox}>
                                <Ionicons name="layers" size={24} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                                <Text style={styles.milestoneValue}>{stats.tasksCompleted}</Text>
                                <Text style={styles.statLabel}>Total Tasks</Text>
                            </View>
                            <View style={styles.milestoneBox}>
                                <Ionicons name="hourglass" size={24} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                                <Text style={styles.milestoneValue}>
                                    {Math.floor(stats.totalFocusMinutes / 60)}h {stats.totalFocusMinutes % 60}m
                                </Text>
                                <Text style={styles.statLabel}>Total Focus</Text>
                            </View>
                            <View style={styles.milestoneBox}>
                                <Ionicons name="headset" size={24} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                                <Text style={styles.milestoneValue}>{stats.sessionsCompleted}</Text>
                                <Text style={styles.statLabel}>Sessions</Text>
                            </View>
                        </View>

                    </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        justifyContent: "flex-end", // Slide up from bottom
    },
    backdropPressable: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        maxHeight: "90%", // Allow it to be tall, but not cover the whole screen
        width: "100%",
        flexShrink: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    timeframeContainer: {
        flexDirection: "row",
        backgroundColor: `${theme.colors.textSecondary}15`,
        borderRadius: 12,
        padding: 4,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    timeframeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 8,
    },
    timeframeText: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    closeButton: {
        backgroundColor: theme.colors.card,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: `${theme.colors.textSecondary}20`,
    },
    scrollContent: {
        paddingBottom: 40,
        gap: theme.spacing.md,
    },
    banner: {
        backgroundColor: `${theme.colors.primary}10`,
        padding: theme.spacing.md,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    bannerText: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        fontSize: 16,
    },

    sectionTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginTop: theme.spacing.md,
        marginBottom: -4,
    },
    statsRow: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: `${theme.colors.secondary}0A`,
        borderRadius: 24,
        padding: theme.spacing.md,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 0,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.sm,
    },
    statValue: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginTop: theme.spacing.xs, // Adjusted since icons now handle margins differently
    },
    statLabel: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    milestoneBox: {
        flex: 1,
        backgroundColor: `${theme.colors.primary}0A`, 
        borderRadius: 20,
        padding: theme.spacing.md,
        alignItems: "center",
    },
    milestoneValue: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    }
});
