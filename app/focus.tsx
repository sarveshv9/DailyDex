import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    BackHandler,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import CrossPlatformSegmentedControl from "../components/common/CrossPlatformSegmentedControl";
import { useTheme } from "../context/ThemeContext";
import { useTimer } from "../context/TimerContext";
import { Theme } from "../styles/shared";
import * as Haptics from "../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.76, 290);
const STROKE_WIDTH = 10;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DURATIONS = [
    { label: "15m", value: 15 * 60, title: "15 min" },
    { label: "25m", value: 25 * 60, title: "25 min" },
    { label: "45m", value: 45 * 60, title: "45 min" },
    { label: "60m", value: 60 * 60, title: "60 min" },
];

export default function FocusScreen() {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const router = useRouter();
    const params = useLocalSearchParams();

    const paramTaskId = (params.taskId as string) || "zen-focus";
    const paramTaskName = (params.taskName as string) || "Deep Focus";

    const timer = useTimer();

    // Context timer match
    const isCurrentTimer = timer.taskId === paramTaskId;
    const isActive = isCurrentTimer && timer.isActive;
    const isCompleted = isCurrentTimer && timer.isCompleted;

    // Local configuration state before starting
    const [selectedDuration, setSelectedDuration] = useState(25 * 60);
    const [selectedMode, setSelectedMode] = useState<"Free" | "Pomodoro">("Free");

    const startNewTimer = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.startTimer(paramTaskId, paramTaskName, selectedDuration);
    };

    const startNewPomodoro = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.startPomodoro(paramTaskId, paramTaskName);
    };

    const toggleTimer = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (timer.isActive) {
            timer.pauseTimer();
        } else {
            timer.resumeTimer();
        }
    };

    /**
     * Single top navigation back/close action
     */
    const requestQuit = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!isActive) {
            router.back();
            return;
        }

        if (Platform.OS === "web") {
            const leave = window.confirm(
                "Your timer is active. Click OK to minimize and keep it running in the background, or Cancel to stay on this screen."
            );
            if (leave) {
                router.back();
            }
        } else {
            Alert.alert(
                "Active Focus Session",
                "Your timer is currently running in the background. What would you like to do?",
                [
                    { text: "Stay on Screen", style: "cancel" },
                    {
                        text: "Minimize (Keep Running)",
                        onPress: () => router.back(),
                    },
                    {
                        text: "End Session & Leave",
                        style: "destructive",
                        onPress: () => {
                            timer.stopTimer();
                            router.back();
                        },
                    },
                ]
            );
        }
    }, [isActive, timer, router]);

    /**
     * Dedicated End Session action that halts timer and navigates back
     */
    const handleEndSession = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const confirmEnd = () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            timer.stopTimer();
            router.back();
        };

        if (Platform.OS === "web") {
            if (window.confirm("Are you sure you want to end this focus session early?")) {
                confirmEnd();
            }
        } else {
            Alert.alert(
                "End Focus Session",
                "Are you sure you want to end this focus session early?",
                [
                    { text: "Keep Focusing", style: "cancel" },
                    {
                        text: "End Session",
                        style: "destructive",
                        onPress: confirmEnd,
                    },
                ]
            );
        }
    }, [timer, router]);

    useEffect(() => {
        const onBackPress = () => {
            if (isActive) {
                requestQuit();
                return true;
            }
            return false;
        };

        const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => sub.remove();
    }, [isActive, requestQuit]);

    const handleComplete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.stopTimer();
        router.back();
    };

    // Determine state
    const showDurationPicker = !isCurrentTimer || (timer.timeLeft === 0 && !timer.isCompleted);

    const displayTime = showDurationPicker
        ? selectedMode === "Pomodoro"
            ? 25 * 60
            : selectedDuration
        : timer.timeLeft;

    const totalDuration = showDurationPicker
        ? selectedMode === "Pomodoro"
            ? 25 * 60
            : selectedDuration
        : timer.duration || displayTime || 1;

    // Progress computation: drains from 1.0 down to 0 as time elapses
    const progress = isCompleted
        ? 0
        : showDurationPicker
        ? 1
        : Math.max(0, Math.min(1, displayTime / totalDuration));

    const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Dynamic session status
    const getStatusInfo = () => {
        if (isCompleted) {
            return {
                label: "COMPLETED",
                icon: "checkmark-circle" as const,
                color: theme.colors.primary,
            };
        }
        if (timer.pomodoroMode && !showDurationPicker) {
            if (timer.pomodoroPhase === "work") {
                return {
                    label: "WORK SESSION",
                    icon: "flame" as const,
                    color: theme.colors.primary,
                };
            }
            if (timer.pomodoroPhase === "shortBreak") {
                return {
                    label: "SHORT REST",
                    icon: "cafe-outline" as const,
                    color: theme.colors.secondary,
                };
            }
            return {
                label: "LONG REST",
                icon: "bed-outline" as const,
                color: theme.colors.secondary,
            };
        }
        if (isActive) {
            return {
                label: "FOCUSING",
                icon: "radio-button-on" as const,
                color: theme.colors.primary,
            };
        }
        if (timer.timeLeft < timer.duration && timer.timeLeft > 0 && !showDurationPicker) {
            return {
                label: "PAUSED",
                icon: "pause-circle-outline" as const,
                color: theme.colors.secondary,
            };
        }
        return {
            label: "READY",
            icon: "hourglass-outline" as const,
            color: theme.colors.secondary,
        };
    };

    const statusInfo = getStatusInfo();

    return (
        <SafeAreaView style={styles.container}>
            {/* Ambient Background Aura */}
            <View style={styles.ambientAura} pointerEvents="none" />

            {/* Clean Single-Action Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={requestQuit}
                    hitSlop={12}
                    accessibilityLabel="Close focus session"
                    style={({ pressed }) => [
                        styles.headerIconButton,
                        pressed && styles.pressedScale,
                    ]}
                >
                    <Ionicons name="chevron-down" size={24} color={theme.colors.primary} />
                </Pressable>

                <View style={styles.headerTitleContainer}>
                    <Ionicons name="leaf-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.headerTitle}>Focus Sanctuary</Text>
                </View>

                {/* Symmetrical spacer maintaining centered alignment */}
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
            >
                {/* Currently Focusing Task Card */}
                <View style={styles.taskCard}>
                    <BlurView
                        intensity={isDarkMode ? 25 : 45}
                        tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                    <View style={styles.taskBadge}>
                        <Ionicons name="disc-outline" size={12} color={theme.colors.primary} />
                        <Text style={styles.taskLabel}>CURRENTLY FOCUSING ON</Text>
                    </View>
                    <Text style={styles.taskName} numberOfLines={2}>
                        {isCurrentTimer && timer.taskName ? timer.taskName : paramTaskName}
                    </Text>
                </View>

                {/* Luminous Circular Timer Dial */}
                <View style={styles.timerDialSection}>
                    <View style={[styles.dialGlowRing, isActive && styles.dialGlowRingActive]}>
                        <View style={styles.dialInnerContainer}>
                            <BlurView
                                intensity={isDarkMode ? 40 : 60}
                                tint={
                                    isDarkMode
                                        ? "systemThickMaterialDark"
                                        : "systemThickMaterialLight"
                                }
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: theme.glass.cardBg },
                                ]}
                            />

                            {/* SVG Progress Circle */}
                            <Svg
                                width={DIAL_SIZE}
                                height={DIAL_SIZE}
                                style={StyleSheet.absoluteFill}
                            >
                                {/* Track Ring */}
                                <Circle
                                    cx={DIAL_SIZE / 2}
                                    cy={DIAL_SIZE / 2}
                                    r={RADIUS}
                                    stroke={
                                        isDarkMode
                                            ? "rgba(255, 255, 255, 0.08)"
                                            : "rgba(0, 0, 0, 0.06)"
                                    }
                                    strokeWidth={STROKE_WIDTH}
                                    fill="none"
                                />
                                {/* Active Radiant Progress Stroke */}
                                <Circle
                                    cx={DIAL_SIZE / 2}
                                    cy={DIAL_SIZE / 2}
                                    r={RADIUS}
                                    stroke={theme.colors.primary}
                                    strokeWidth={STROKE_WIDTH}
                                    fill="none"
                                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    rotation="-90"
                                    origin={`${DIAL_SIZE / 2}, ${DIAL_SIZE / 2}`}
                                />
                            </Svg>

                            {/* Center Dial Content */}
                            <View style={styles.dialContent}>
                                {/* Session Status Tag */}
                                <View
                                    style={[
                                        styles.statusTag,
                                        {
                                            backgroundColor: isDarkMode
                                                ? "rgba(255,255,255,0.08)"
                                                : "rgba(0,0,0,0.05)",
                                            borderColor: `${statusInfo.color}35`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={statusInfo.icon}
                                        size={12}
                                        color={statusInfo.color}
                                    />
                                    <Text
                                        style={[
                                            styles.statusTagText,
                                            { color: statusInfo.color },
                                        ]}
                                    >
                                        {statusInfo.label}
                                    </Text>
                                </View>

                                {/* Tabular Timer Text */}
                                <Text style={styles.timerDigits}>
                                    {formatTime(displayTime)}
                                </Text>

                                {/* Micro Subtitle / Remaining Indicator */}
                                <Text style={styles.timerSubtext}>
                                    {isCompleted
                                        ? "Mindful Session Complete"
                                        : showDurationPicker
                                        ? `Ready • ${Math.round(displayTime / 60)} minutes`
                                        : `${Math.round(progress * 100)}% remaining`}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Pomodoro Zen Cycle Indicator */}
                {timer.pomodoroMode && !showDurationPicker && (
                    <View style={styles.pomoCycleCard}>
                        <BlurView
                            intensity={isDarkMode ? 20 : 40}
                            tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                        <View style={styles.pomoCycleHeader}>
                            <View style={styles.pomoCycleTitleRow}>
                                <Ionicons
                                    name={
                                        timer.pomodoroPhase === "work"
                                            ? "flame"
                                            : "cafe-outline"
                                    }
                                    size={16}
                                    color={theme.colors.primary}
                                />
                                <Text style={styles.pomoCycleTitle}>
                                    Cycle {timer.pomodoroSession} of 4 •{" "}
                                    {timer.pomodoroPhase === "work"
                                        ? "Deep Focus"
                                        : timer.pomodoroPhase === "shortBreak"
                                        ? "Short Rest"
                                        : "Long Rest"}
                                </Text>
                            </View>
                            <Text style={styles.pomoCyclePhaseTag}>
                                {timer.pomodoroPhase === "work" ? "25m" : timer.pomodoroPhase === "shortBreak" ? "5m" : "15m"}
                            </Text>
                        </View>

                        <View style={styles.pomoDotsRow}>
                            {[1, 2, 3, 4].map((s) => {
                                const isSessionDone =
                                    s < timer.pomodoroSession ||
                                    (s === timer.pomodoroSession && timer.pomodoroPhase !== "work");
                                const isSessionActive =
                                    s === timer.pomodoroSession && timer.pomodoroPhase === "work";

                                return (
                                    <View
                                        key={s}
                                        style={[
                                            styles.pomoDotPill,
                                            isSessionDone && styles.pomoDotPillDone,
                                            isSessionActive && styles.pomoDotPillActive,
                                        ]}
                                    >
                                        {isSessionDone ? (
                                            <Ionicons
                                                name="checkmark"
                                                size={14}
                                                color={theme.colors.white}
                                            />
                                        ) : isSessionActive ? (
                                            <Ionicons
                                                name="flame"
                                                size={13}
                                                color={theme.colors.white}
                                            />
                                        ) : (
                                            <Text style={styles.pomoDotText}>{s}</Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Controls Area */}
                {showDurationPicker ? (
                    <View style={styles.setupSection}>
                        {/* Segmented Mode Selector */}
                        <View style={styles.segmentWrapper}>
                            <CrossPlatformSegmentedControl
                                values={["Free Timer", "Pomodoro"]}
                                selectedIndex={selectedMode === "Pomodoro" ? 1 : 0}
                                onChange={(event) => {
                                    Haptics.selectionAsync();
                                    setSelectedMode(
                                        event.nativeEvent.selectedSegmentIndex === 0
                                            ? "Free"
                                            : "Pomodoro"
                                    );
                                }}
                                tintColor={theme.colors.primary}
                                fontStyle={{
                                    fontFamily: theme.fonts.medium,
                                    color: theme.colors.textSecondary,
                                }}
                                activeFontStyle={{
                                    fontFamily: theme.fonts.bold,
                                    color: theme.colors.white,
                                }}
                            />
                        </View>

                        {selectedMode === "Free" ? (
                            <>
                                <View style={styles.sectionHeaderRow}>
                                    <Ionicons
                                        name="time-outline"
                                        size={16}
                                        color={theme.colors.secondary}
                                    />
                                    <Text style={styles.sectionLabel}>SELECT SESSION LENGTH</Text>
                                </View>

                                {/* Quick Duration Pills */}
                                <View style={styles.durationPillsRow}>
                                    {DURATIONS.map((d) => {
                                        const isSelected = selectedDuration === d.value;
                                        return (
                                            <Pressable
                                                key={d.value}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedDuration(d.value);
                                                }}
                                                style={({ pressed }) => [
                                                    styles.durationPill,
                                                    isSelected && styles.durationPillActive,
                                                    pressed && styles.pressedScale,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.durationPillText,
                                                        isSelected && styles.durationPillTextActive,
                                                    ]}
                                                >
                                                    {d.title}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Standardized 56px Primary Action Button */}
                                <Pressable
                                    onPress={startNewTimer}
                                    style={({ pressed }) => [
                                        styles.primaryActionButton,
                                        pressed && styles.pressedScale,
                                    ]}
                                >
                                    <Ionicons
                                        name="play"
                                        size={20}
                                        color={theme.colors.white}
                                    />
                                    <Text style={styles.primaryActionButtonText}>
                                        Begin Focus Session ({Math.round(selectedDuration / 60)}m)
                                    </Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <View style={styles.pomodoroExplainerCard}>
                                    <BlurView
                                        intensity={isDarkMode ? 20 : 40}
                                        tint={
                                            isDarkMode
                                                ? "systemThickMaterialDark"
                                                : "systemThickMaterialLight"
                                        }
                                        style={StyleSheet.absoluteFill}
                                        pointerEvents="none"
                                    />
                                    <View style={styles.pomodoroExplainerTitleRow}>
                                        <Ionicons
                                            name="sparkles-outline"
                                            size={17}
                                            color={theme.colors.primary}
                                        />
                                        <Text style={styles.pomodoroExplainerTitle}>
                                            Tranquil Pomodoro Cycle
                                        </Text>
                                    </View>
                                    <Text style={styles.pomodoroExplainerDesc}>
                                        4 rounds of 25 min deep mindful focus, separated by 5 min
                                        restorative pauses, completing with an extended 15 min rest.
                                    </Text>
                                </View>

                                {/* Standardized 56px Primary Action Button */}
                                <Pressable
                                    onPress={startNewPomodoro}
                                    style={({ pressed }) => [
                                        styles.primaryActionButton,
                                        pressed && styles.pressedScale,
                                    ]}
                                >
                                    <Ionicons
                                        name="flame"
                                        size={20}
                                        color={theme.colors.white}
                                    />
                                    <Text style={styles.primaryActionButtonText}>
                                        Begin Pomodoro Cycle
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                ) : isCompleted ? (
                    /* Mindful Session Completion Card */
                    <View style={styles.completionSection}>
                        <View style={styles.completionCard}>
                            <BlurView
                                intensity={isDarkMode ? 30 : 50}
                                tint={
                                    isDarkMode
                                        ? "systemThickMaterialDark"
                                        : "systemThickMaterialLight"
                                }
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            <View style={styles.completionIconCircle}>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={36}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <Text style={styles.completionTitle}>Session Accomplished</Text>
                            <Text style={styles.completionMessage}>
                                Take a calming breath. Your mindful presence and dedicated focus have
                                nurtured clarity.
                            </Text>

                            <View style={styles.completionPill}>
                                <Ionicons
                                    name="time-outline"
                                    size={15}
                                    color={theme.colors.primary}
                                />
                                <Text style={styles.completionPillText}>
                                    {Math.round(totalDuration / 60)} minutes logged to your journey
                                </Text>
                            </View>
                        </View>

                        {/* Standardized 56px Primary Action Button */}
                        <Pressable
                            onPress={handleComplete}
                            style={({ pressed }) => [
                                styles.primaryActionButton,
                                pressed && styles.pressedScale,
                            ]}
                        >
                            <Ionicons
                                name="checkmark-done-circle-outline"
                                size={22}
                                color={theme.colors.white}
                            />
                            <Text style={styles.primaryActionButtonText}>
                                Complete & Return to Tasks
                            </Text>
                        </Pressable>

                        {/* Secondary Button to Start Another Session */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                timer.stopTimer();
                            }}
                            style={({ pressed }) => [
                                styles.secondaryActionButton,
                                pressed && styles.pressedScale,
                            ]}
                        >
                            <Ionicons
                                name="refresh-outline"
                                size={18}
                                color={theme.colors.primary}
                            />
                            <Text style={styles.secondaryActionButtonText}>
                                Start Another Session
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    /* Active Session Controls (Standardized 56px Tactile Action Pills) */
                    <View style={styles.activeControlsSection}>
                        <View style={styles.controlsRow}>
                            {/* Primary Play / Pause Pill */}
                            <Pressable
                                onPress={toggleTimer}
                                style={({ pressed }) => [
                                    styles.actionPillPrimary,
                                    !isActive && styles.actionPillResume,
                                    pressed && styles.pressedScale,
                                ]}
                            >
                                <Ionicons
                                    name={isActive ? "pause" : "play"}
                                    size={22}
                                    color={theme.colors.white}
                                />
                                <Text style={styles.actionPillPrimaryText}>
                                    {isActive ? "Pause Session" : "Resume Focus"}
                                </Text>
                            </Pressable>

                            {/* Reset Pill (when paused or during session) */}
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    timer.resetTimer();
                                }}
                                style={({ pressed }) => [
                                    styles.actionPillSecondary,
                                    pressed && styles.pressedScale,
                                ]}
                            >
                                <Ionicons
                                    name="refresh-outline"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                                <Text style={styles.actionPillSecondaryText}>Reset</Text>
                            </Pressable>

                            {/* Pomodoro Advance Phase Pill */}
                            {timer.pomodoroMode && (
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        timer.advancePomodoroPhase();
                                    }}
                                    style={({ pressed }) => [
                                        styles.actionPillSecondary,
                                        pressed && styles.pressedScale,
                                    ]}
                                >
                                    <Ionicons
                                        name="play-skip-forward-outline"
                                        size={20}
                                        color={theme.colors.secondary}
                                    />
                                    <Text style={styles.actionPillSecondaryText}>Next</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* End Session Button: Halts timer and navigates back with confirmation */}
                        <Pressable
                            onPress={handleEndSession}
                            style={({ pressed }) => [
                                styles.endSessionButton,
                                pressed && styles.pressedScale,
                            ]}
                        >
                            <Ionicons
                                name="stop-circle-outline"
                                size={18}
                                color={theme.colors.secondary}
                            />
                            <Text style={styles.endSessionText}>End Session Early</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: Theme, isDarkMode: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        ambientAura: {
            position: "absolute",
            top: 40,
            left: SCREEN_WIDTH / 2 - 160,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: isDarkMode ? `${theme.colors.primary}12` : `${theme.colors.primary}08`,
            filter: "blur(60px)",
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
        },
        headerIconButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            alignItems: "center",
            justifyContent: "center",
        },
        headerSpacer: {
            width: 44,
            height: 44,
        },
        headerTitleContainer: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 18,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
        },
        headerTitle: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.primary,
            letterSpacing: 0.5,
        },
        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            alignItems: "center",
        },

        /* Task Card */
        taskCard: {
            width: "100%",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: theme.glass.cardBg,
            overflow: "hidden",
            paddingHorizontal: 18,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 18,
            ...Platform.select({
                ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.05,
                    shadowRadius: 10,
                },
                android: { elevation: 2 },
            }),
        },
        taskBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginBottom: 4,
        },
        taskLabel: {
            fontFamily: theme.fonts.bold,
            fontSize: 11,
            color: theme.colors.secondary,
            letterSpacing: 1.2,
        },
        taskName: {
            fontFamily: theme.fonts.bold,
            fontSize: 20,
            color: theme.colors.primary,
            textAlign: "center",
        },

        /* Luminous Circular Timer Dial */
        timerDialSection: {
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 14,
        },
        dialGlowRing: {
            width: DIAL_SIZE + 16,
            height: DIAL_SIZE + 16,
            borderRadius: (DIAL_SIZE + 16) / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDarkMode ? 0.2 : 0.08,
                    shadowRadius: 18,
                },
                android: { elevation: 3 },
            }),
        },
        dialGlowRingActive: {
            ...Platform.select({
                ios: {
                    shadowOpacity: isDarkMode ? 0.35 : 0.16,
                    shadowRadius: 24,
                },
                android: { elevation: 6 },
            }),
        },
        dialInnerContainer: {
            width: DIAL_SIZE,
            height: DIAL_SIZE,
            borderRadius: DIAL_SIZE / 2,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
        },
        dialContent: {
            alignItems: "center",
            justifyContent: "center",
        },
        statusTag: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 14,
            borderWidth: 1,
            marginBottom: 8,
        },
        statusTagText: {
            fontFamily: theme.fonts.bold,
            fontSize: 11,
            letterSpacing: 0.8,
        },
        timerDigits: {
            fontFamily: theme.fonts.bold,
            fontSize: 54,
            color: theme.colors.primary,
            fontVariant: ["tabular-nums"],
            letterSpacing: -1,
        },
        timerSubtext: {
            fontFamily: theme.fonts.medium,
            fontSize: 12,
            color: theme.colors.secondary,
            marginTop: 4,
        },

        /* Pomodoro Zen Cycle Card */
        pomoCycleCard: {
            width: "100%",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: theme.glass.cardBg,
            overflow: "hidden",
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 16,
        },
        pomoCycleHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
        },
        pomoCycleTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        pomoCycleTitle: {
            fontFamily: theme.fonts.bold,
            fontSize: 13,
            color: theme.colors.primary,
        },
        pomoCyclePhaseTag: {
            fontFamily: theme.fonts.bold,
            fontSize: 12,
            color: theme.colors.secondary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        },
        pomoDotsRow: {
            flexDirection: "row",
            gap: 8,
            justifyContent: "space-between",
        },
        pomoDotPill: {
            flex: 1,
            height: 32,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            alignItems: "center",
            justifyContent: "center",
        },
        pomoDotPillDone: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        pomoDotPillActive: {
            backgroundColor: theme.colors.secondary,
            borderColor: theme.colors.primary,
            borderWidth: 1.5,
        },
        pomoDotText: {
            fontFamily: theme.fonts.bold,
            fontSize: 12,
            color: theme.colors.secondary,
        },

        /* Setup / Configuration Section */
        setupSection: {
            width: "100%",
            alignItems: "center",
            marginTop: 4,
        },
        segmentWrapper: {
            width: "100%",
            marginBottom: 16,
        },
        sectionHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            marginBottom: 10,
        },
        sectionLabel: {
            fontFamily: theme.fonts.bold,
            fontSize: 11,
            color: theme.colors.secondary,
            letterSpacing: 1.2,
        },
        durationPillsRow: {
            flexDirection: "row",
            gap: 8,
            width: "100%",
            marginBottom: 20,
        },
        durationPill: {
            flex: 1,
            height: 48,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            alignItems: "center",
            justifyContent: "center",
        },
        durationPillActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDarkMode ? 0.35 : 0.2,
                    shadowRadius: 8,
                },
                android: { elevation: 3 },
            }),
        },
        durationPillText: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.secondary,
        },
        durationPillTextActive: {
            color: theme.colors.white,
        },

        pomodoroExplainerCard: {
            width: "100%",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: theme.glass.cardBg,
            overflow: "hidden",
            padding: 16,
            marginBottom: 20,
        },
        pomodoroExplainerTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
        },
        pomodoroExplainerTitle: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.primary,
        },
        pomodoroExplainerDesc: {
            fontFamily: theme.fonts.regular,
            fontSize: 13,
            color: theme.colors.textSecondary,
            lineHeight: 18,
        },

        /* Standardized 56px Primary Action Button */
        primaryActionButton: {
            width: "100%",
            height: 56,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDarkMode ? 0.45 : 0.3,
                    shadowRadius: 14,
                },
                android: { elevation: 6 },
            }),
        },
        primaryActionButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 16,
            color: theme.colors.white,
        },

        /* Secondary Standardized 56px Action Button */
        secondaryActionButton: {
            width: "100%",
            height: 56,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 12,
        },
        secondaryActionButtonText: {
            fontFamily: theme.fonts.bold,
            fontSize: 15,
            color: theme.colors.primary,
        },

        /* Active Session Controls */
        activeControlsSection: {
            width: "100%",
            alignItems: "center",
            marginTop: 4,
        },
        controlsRow: {
            flexDirection: "row",
            width: "100%",
            gap: 10,
            marginBottom: 16,
        },
        actionPillPrimary: {
            flex: 1.4,
            height: 56,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDarkMode ? 0.45 : 0.3,
                    shadowRadius: 14,
                },
                android: { elevation: 6 },
            }),
        },
        actionPillResume: {
            backgroundColor: theme.colors.primary,
        },
        actionPillPrimaryText: {
            fontFamily: theme.fonts.bold,
            fontSize: 16,
            color: theme.colors.white,
        },
        actionPillSecondary: {
            flex: 1,
            height: 56,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: theme.glass.cardBg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            ...Platform.select({
                ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDarkMode ? 0.2 : 0.04,
                    shadowRadius: 8,
                },
                android: { elevation: 2 },
            }),
        },
        actionPillSecondaryText: {
            fontFamily: theme.fonts.bold,
            fontSize: 14,
            color: theme.colors.primary,
        },
        endSessionButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        endSessionText: {
            fontFamily: theme.fonts.bold,
            fontSize: 13,
            color: theme.colors.secondary,
            opacity: 0.75,
        },

        /* Mindful Session Completion Card */
        completionSection: {
            width: "100%",
            alignItems: "center",
            marginTop: 4,
        },
        completionCard: {
            width: "100%",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.glass.borderColor,
            backgroundColor: theme.glass.cardBg,
            overflow: "hidden",
            padding: 20,
            alignItems: "center",
            marginBottom: 20,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDarkMode ? 0.25 : 0.08,
                    shadowRadius: 16,
                },
                android: { elevation: 4 },
            }),
        },
        completionIconCircle: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: `${theme.colors.primary}18`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
        },
        completionTitle: {
            fontFamily: theme.fonts.bold,
            fontSize: 18,
            color: theme.colors.primary,
            marginBottom: 8,
            textAlign: "center",
        },
        completionMessage: {
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 14,
        },
        completionPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: `${theme.colors.primary}15`,
        },
        completionPillText: {
            fontFamily: theme.fonts.bold,
            fontSize: 12,
            color: theme.colors.primary,
        },

        /* Tactile Press Feedback */
        pressedScale: {
            opacity: 0.85,
            transform: [{ scale: 0.97 }],
        },
    });
