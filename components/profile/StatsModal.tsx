import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme } from "../../constants/shared";
import { getTodayString, getWeeklyData, UserStats } from "../../utils/stats";
import { ActivityChart } from "./ActivityChart";

type StatsModalProps = {
    visible: boolean;
    onClose: () => void;
    theme: Theme;
    stats: UserStats | null;
};

export function StatsModal({ visible, onClose, theme, stats }: StatsModalProps) {
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [chartMetric, setChartMetric] = useState<"tasks" | "focusMinutes">("tasks");

    if (!stats) return null;

    const todayString = getTodayString();
    const todayStats = stats.history[todayString] || { tasks: 0, focusMinutes: 0 };

    // Calculate Level based on XP (e.g., 500 XP per level)
    const XP_PER_LEVEL = 500;
    const currentLevel = Math.floor(stats.xp / XP_PER_LEVEL) + 1;
    const xpForNextLevel = currentLevel * XP_PER_LEVEL;
    const progressPercent = (stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL;

    // Encouraging messages
    let encouragingMessage = "Every step counts. Keep going!";
    if (stats.currentStreak >= 7) {
        encouragingMessage = "You're on a magnificent streak!🔥";
    } else if (todayStats.tasks > 5) {
        encouragingMessage = "Incredible productivity today! 🚀";
    } else if (stats.xp > 0) {
        encouragingMessage = "Great job building momentum! 🌟";
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.modalContent} onPress={() => { }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Your Zen Journey</Text>
                        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.primary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                        {/* Encouraging Banner */}
                        <View style={styles.banner}>
                            <Text style={styles.bannerText}>{encouragingMessage}</Text>
                        </View>

                        {/* Level / Progress Card */}
                        <View style={styles.levelCard}>
                            <View style={styles.levelHeader}>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>Lv. {currentLevel}</Text>
                                </View>
                                <View style={styles.xpTextContainer}>
                                    <Text style={styles.currentXpText}>{stats.xp.toLocaleString()} XP</Text>
                                    <Text style={styles.targetXpText}>/ {xpForNextLevel.toLocaleString()} XP</Text>
                                </View>
                            </View>

                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
                            </View>
                            <Text style={styles.progressHint}>
                                {xpForNextLevel - stats.xp} XP to next level
                            </Text>
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

                        {/* Weekly Activity Chart */}
                        <ActivityChart
                            data={getWeeklyData(stats)}
                            theme={theme}
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
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end", // Slide up from bottom
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        maxHeight: "90%", // Allow it to be tall, but not cover the whole screen
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
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
        color: theme.colors.primary,
    },
    closeButton: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.xs,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}20`,
    },
    scrollContent: {
        paddingBottom: 40,
        gap: theme.spacing.md,
    },
    banner: {
        backgroundColor: `${theme.colors.primary}10`,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    bannerText: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        fontSize: 16,
    },
    levelCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0, // Neobrutalism flat shadow
    },
    levelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.md,
    },
    levelBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: 9999,
    },
    levelBadgeText: {
        color: theme.colors.white,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    xpTextContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 4,
    },
    currentXpText: {
        fontFamily: theme.fonts.bold,
        fontSize: 24,
        color: theme.colors.primary,
    },
    targetXpText: {
        fontFamily: theme.fonts.medium,
        fontSize: 14,
        color: theme.colors.secondary,
    },
    progressBarBackground: {
        height: 12,
        backgroundColor: `${theme.colors.secondary}20`,
        borderRadius: 9999,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: theme.colors.primary,
        borderRadius: 9999,
    },
    progressHint: {
        marginTop: theme.spacing.sm,
        fontFamily: theme.fonts.medium,
        fontSize: 12,
        color: theme.colors.secondary,
        textAlign: "right",
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginTop: theme.spacing.md,
        marginBottom: -4,
    },
    statsRow: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: "center",
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}20`,
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
        color: theme.colors.primary,
        marginTop: theme.spacing.xs, // Adjusted since icons now handle margins differently
    },
    statLabel: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.secondary,
        marginTop: 2,
    },
    milestoneBox: {
        flex: 1,
        backgroundColor: `${theme.colors.primary}08`, // Very light primary
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: "center",
    },
    milestoneValue: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    }
});
