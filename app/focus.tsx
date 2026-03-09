import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { useTimer } from "../context/TimerContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DURATIONS = [
    { label: "15 min", value: 15 * 60 },
    { label: "25 min", value: 25 * 60 },
    { label: "45 min", value: 45 * 60 },
    { label: "60 min", value: 60 * 60 },
];

export default function FocusScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const router = useRouter();
    const params = useLocalSearchParams();

    const paramTaskId = params.taskId as string;
    const paramTaskName = (params.taskName as string) || "Focus Session";

    const timer = useTimer();

    // If the timer in context perfectly matches the one we are looking at:
    const isCurrentTimer = timer.taskId === paramTaskId;

    // Local state for picking duration before starting
    const [selectedDuration, setSelectedDuration] = useState(25 * 60);

    const startNewTimer = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.startTimer(paramTaskId, paramTaskName, selectedDuration);
    };

    const toggleTimer = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (timer.isActive) {
            timer.pauseTimer();
        } else {
            timer.resumeTimer();
        }
    };

    const quitTimer = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleComplete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.stopTimer();
        router.back();
    };

    // Determine what to show
    const showDurationPicker = !isCurrentTimer || (timer.timeLeft === 0 && !timer.isCompleted);

    const displayTime = showDurationPicker ? selectedDuration : timer.timeLeft;
    const isActive = isCurrentTimer && timer.isActive;
    const isCompleted = isCurrentTimer && timer.isCompleted;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={quitTimer} hitSlop={12}>
                    <Ionicons name="close" size={28} color={theme.colors.primary} />
                </Pressable>
            </View>

            <View style={styles.content}>
                <View style={styles.taskContainer}>
                    <Text style={styles.taskLabel}>CURRENTLY FOCUSING ON</Text>
                    <Text style={styles.taskName} numberOfLines={2} adjustsFontSizeToFit>
                        {isCurrentTimer && timer.taskName ? timer.taskName : paramTaskName}
                    </Text>
                </View>

                <View style={styles.timerContainer}>
                    <View style={[styles.timerCircle, isActive && styles.timerCircleActive]}>
                        <Text style={styles.timerText}>{formatTime(displayTime)}</Text>
                    </View>
                </View>

                {showDurationPicker ? (
                    <View style={styles.pickerContainer}>
                        <Text style={styles.pickerTitle}>Select Duration</Text>
                        <View style={styles.durationRow}>
                            {DURATIONS.map((d) => (
                                <Pressable
                                    key={d.value}
                                    style={[styles.durationChip, selectedDuration === d.value && styles.durationChipActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedDuration(d.value);
                                    }}
                                >
                                    <Text style={[styles.durationChipText, selectedDuration === d.value && styles.durationChipTextActive]}>
                                        {d.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Pressable style={styles.startButton} onPress={startNewTimer}>
                            <Text style={styles.startButtonText}>Start Focus</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.controlsContainer}>
                        {!isCompleted ? (
                            <Pressable
                                style={[styles.playButton, isActive && styles.pauseButton]}
                                onPress={toggleTimer}
                            >
                                <Ionicons
                                    name={isActive ? "pause" : "play"}
                                    size={36}
                                    color={theme.colors.white}
                                    style={{ marginLeft: isActive ? 0 : 4 }}
                                />
                            </Pressable>
                        ) : (
                            <Pressable style={styles.completeButton} onPress={handleComplete}>
                                <Text style={styles.completeButtonText}>Great Job! Back</Text>
                            </Pressable>
                        )}

                        {!isActive && timer.timeLeft < timer.duration && !isCompleted && (
                            <Pressable style={styles.resetButton} onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                timer.resetTimer();
                            }}>
                                <Text style={styles.resetButtonText}>Reset Timer</Text>
                            </Pressable>
                        )}

                        <Pressable style={styles.cancelButton} onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            timer.stopTimer();
                        }}>
                            <Text style={styles.cancelButtonText}>Cancel Focus</Text>
                        </Pressable>

                    </View>
                )}

            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            alignItems: "flex-end",
        },
        content: {
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 20,
            paddingHorizontal: theme.spacing.xl,
        },
        taskContainer: {
            alignItems: "center",
            marginTop: 10,
        },
        taskLabel: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.secondary,
            letterSpacing: 1.5,
            marginBottom: 8,
        },
        taskName: {
            fontFamily: theme.fonts.bold,
            fontSize: 24,
            color: theme.colors.primary,
            textAlign: "center",
            minHeight: 60,
        },
        timerContainer: {
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            maxHeight: SCREEN_WIDTH * 0.9,
        },
        timerCircle: {
            width: SCREEN_WIDTH * 0.75,
            height: SCREEN_WIDTH * 0.75,
            borderRadius: (SCREEN_WIDTH * 0.75) / 2,
            borderWidth: 8,
            borderColor: `${theme.colors.primary}20`,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.white,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
            elevation: 5,
        },
        timerCircleActive: {
            borderColor: theme.colors.primary,
            shadowOpacity: 0.2,
            elevation: 10,
        },
        timerText: {
            fontFamily: theme.fonts.bold,
            fontSize: 64,
            color: theme.colors.primary,
            fontVariant: ["tabular-nums"],
        },
        pickerContainer: {
            width: "100%",
            alignItems: "center",
            paddingBottom: 40,
        },
        pickerTitle: {
            fontFamily: theme.fonts.medium,
            fontSize: 16,
            color: theme.colors.secondary,
            marginBottom: 16,
        },
        durationRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            marginBottom: 30,
        },
        durationChip: {
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 20,
            backgroundColor: `${theme.colors.secondary}15`,
        },
        durationChipActive: {
            backgroundColor: theme.colors.primary,
        },
        durationChipText: {
            fontFamily: theme.fonts.bold,
            fontSize: 16,
            color: theme.colors.secondary,
        },
        durationChipTextActive: {
            color: theme.colors.white,
        },
        startButton: {
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 40,
            paddingVertical: 18,
            borderRadius: 30,
            width: "100%",
            alignItems: "center",
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
        },
        startButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 18,
            color: theme.colors.white,
        },
        controlsContainer: {
            alignItems: "center",
            width: "100%",
            paddingBottom: 20,
        },
        playButton: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
            marginBottom: 30,
        },
        pauseButton: {
            backgroundColor: theme.colors.secondary,
            shadowColor: theme.colors.secondary,
        },
        resetButton: {
            position: "absolute",
            right: 20,
            top: 20,
            padding: 10,
        },
        resetButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.secondary,
        },
        cancelButton: {
            marginTop: 10,
            padding: 10,
        },
        cancelButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.secondary,
            opacity: 0.6,
        },
        completeButton: {
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 40,
            paddingVertical: 18,
            borderRadius: 30,
            width: "100%",
            alignItems: "center",
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
            marginBottom: 30,
        },
        completeButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 18,
            color: theme.colors.white,
        },
    });
