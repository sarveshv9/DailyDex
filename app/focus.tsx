import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../utils/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BlurView } from 'expo-blur';
import CrossPlatformSegmentedControl from '../components/common/CrossPlatformSegmentedControl';
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
    const { theme, isDarkMode } = useTheme();
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
    const [selectedMode, setSelectedMode] = useState<"Free" | "Pomodoro">("Free");

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

    const displayTime = showDurationPicker 
        ? (selectedMode === "Pomodoro" ? 25 * 60 : selectedDuration) 
        : timer.timeLeft;
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
                {/* Press feedback on close: acknowledges tap on a frequent navigation action */}
                <Pressable
                    onPress={quitTimer}
                    hitSlop={12}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] })}
                >
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
                        <BlurView intensity={100} tint={isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.cardBg }]} />
                        <Text style={styles.timerText}>{formatTime(displayTime)}</Text>
                    </View>
                </View>

                {showDurationPicker ? (
                    <View style={styles.pickerContainer}>
                        {/* Mode Selector */}
                        <View style={styles.nativeSegmentContainer}>
                            <CrossPlatformSegmentedControl
                                values={['Free', 'Pomodoro']}
                                selectedIndex={selectedMode === "Pomodoro" ? 1 : 0}
                                onChange={(event) => {
                                    Haptics.selectionAsync();
                                    setSelectedMode(event.nativeEvent.selectedSegmentIndex === 0 ? "Free" : "Pomodoro");
                                }}
                                tintColor={theme.colors.primary}
                                fontStyle={{ fontFamily: theme.fonts.bold, color: theme.colors.secondary }}
                                activeFontStyle={{ fontFamily: theme.fonts.bold, color: theme.colors.white }}
                            />
                        </View>

                        {selectedMode === "Free" ? (
                            <>
                                <Text style={styles.pickerTitle}>Select Duration</Text>
                                <View style={styles.durationRow}>
                                    {/* Press feedback on chips: confirms selection among options */}
                                    {DURATIONS.map((d) => (
                                        <Pressable
                                            key={d.value}
                                            style={({ pressed }) => [
                                                styles.durationChip,
                                                selectedDuration === d.value && styles.durationChipActive,
                                                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                                            ]}
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
                                {/* Press feedback on primary CTA: confirms the most important action on screen */}
                                <Pressable
                                    style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                                    onPress={startNewTimer}
                                >
                                    <Text style={styles.startButtonText}>Start Focus</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Text style={styles.pickerTitle}>Pomodoro (25/5 Cycle)</Text>
                                <View style={styles.durationRow}>
                                    {DURATIONS.map((d) => {
                                        const isPomoDefault = d.value === 25 * 60;
                                        return (
                                            <View
                                                key={d.value}
                                                style={[
                                                    styles.durationChip,
                                                    isPomoDefault && styles.durationChipActive,
                                                    !isPomoDefault && { opacity: 0.3 }
                                                ]}
                                            >
                                                <Text style={[styles.durationChipText, isPomoDefault && styles.durationChipTextActive]}>
                                                    {d.label}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                <Pressable
                                    style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        timer.startPomodoro(paramTaskId, paramTaskName);
                                    }}
                                >
                                    <Text style={styles.startButtonText}>Begin Pomodoro</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.controlsContainer}>
                        {timer.pomodoroMode && (
                            <View style={styles.phaseContainer}>
                                <Text style={[styles.phaseLabel, { color: theme.colors.primary }]}>
                                    {timer.pomodoroPhase === "work" ? "Work Session" : timer.pomodoroPhase === "shortBreak" ? "Short Break" : "Long Break"}
                                </Text>
                                <View style={styles.sessionDots}>
                                    {[1, 2, 3, 4].map((s) => {
                                        const isCompleted = s < timer.pomodoroSession || (s === timer.pomodoroSession && timer.pomodoroPhase !== "work");
                                        const isActive = s === timer.pomodoroSession && timer.pomodoroPhase === "work";

                                        return (
                                            <View key={s} style={[styles.pokeDot, isActive && styles.pokeDotActive]}>
                                                <View style={[styles.pokeDotTop, { backgroundColor: isCompleted ? theme.colors.primary : `${theme.colors.secondary}40` }]} />
                                                <View style={styles.pokeDotBottom} />
                                                <View style={[styles.pokeDotCenter, isActive && { borderColor: theme.colors.primary, backgroundColor: theme.colors.white }]} />
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {!isCompleted ? (
                            <View style={styles.mainControls}>
                                {/* Press feedback on play/pause: larger scale for larger button */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.playButton,
                                        isActive && styles.pauseButton,
                                        pressed && { transform: [{ scale: 0.9 }] },
                                    ]}
                                    onPress={toggleTimer}
                                >
                                    <Ionicons
                                        name={isActive ? "pause" : "play"}
                                        size={36}
                                        color={theme.colors.white}
                                        style={{ marginLeft: isActive ? 0 : 4 }}
                                    />
                                </Pressable>

                                {timer.pomodoroMode && (
                                    <Pressable
                                        style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            timer.advancePomodoroPhase();
                                        }}
                                    >
                                        <Ionicons name="play-skip-forward" size={24} color={theme.colors.secondary} />
                                        <Text style={styles.skipText}>Next Phase</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            /* Press feedback on completion CTA */
                            <Pressable
                                style={({ pressed }) => [styles.completeButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                                onPress={handleComplete}
                            >
                                <Text style={styles.completeButtonText}>Great Job! Back</Text>
                            </Pressable>
                        )}

                        {!isActive && timer.timeLeft < timer.duration && !isCompleted && !timer.pomodoroMode && (
                            <Pressable
                                style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.6 }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    timer.resetTimer();
                                }}
                            >
                                <Text style={styles.resetButtonText}>Reset Timer</Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.6 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                timer.stopTimer();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>End Session</Text>
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
            borderWidth: 2,
            borderColor: theme.glass.borderColor,
            alignItems: "center",
            justifyContent: "center",
            overflow: 'hidden',
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 4,
        },
        timerCircleActive: {
            borderColor: `${theme.colors.primary}60`,
            shadowOpacity: 0.15,
            elevation: 6,
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
        nativeSegmentContainer: {
            width: "100%",
            marginBottom: 24,
        },
        /* Pomodoro UI */
        phaseContainer: {
            alignItems: "center",
            marginBottom: 30,
        },
        phaseLabel: {
            fontFamily: theme.fonts.bold,
            fontSize: 18,
            marginBottom: 12,
            letterSpacing: 1,
        },
        sessionDots: {
            flexDirection: "row",
            gap: 12,
        },
        pokeDot: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: theme.colors.secondary,
            overflow: "hidden",
            backgroundColor: theme.colors.white,
            opacity: 0.6,
        },
        pokeDotActive: {
            opacity: 1,
            transform: [{ scale: 1.2 }],
            borderColor: theme.colors.primary,
            borderWidth: 2,
        },
        pokeDotTop: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
        },
        pokeDotBottom: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "50%",
            backgroundColor: theme.colors.white,
        },
        pokeDotCenter: {
            position: "absolute",
            top: "35%",
            left: "35%",
            width: "30%",
            height: "30%",
            borderRadius: 5,
            backgroundColor: theme.colors.secondary,
            borderWidth: 1,
            borderColor: "transparent",
            zIndex: 2,
        },
        mainControls: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 40,
            marginBottom: 20,
        },
        skipBtn: {
            alignItems: "center",
            gap: 4,
        },
        skipText: {
            fontFamily: theme.fonts.bold,
            fontSize: 12,
            color: theme.colors.secondary,
            opacity: 0.8,
        },
    });
