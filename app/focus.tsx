import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAudio } from "../context/AudioContext";
import { useTheme } from "../context/ThemeContext";
import { useMusicPreference } from "../stores/settingsStore";
import { useTimerStore } from "../stores/timerStore";
import { CircularTimerDial } from "../components/focus/CircularTimerDial";
import { FocusActiveControls } from "../components/focus/FocusActiveControls";
import { FocusCompletionCard } from "../components/focus/FocusCompletionCard";
import { FocusConfirmModal } from "../components/focus/FocusConfirmModal";
import { FocusHeader } from "../components/focus/FocusHeader";
import { FocusSetupControls } from "../components/focus/FocusSetupControls";
import { PomodoroCycleCard } from "../components/focus/PomodoroCycleCard";
import { MusicSelectionModal } from "../components/profile/MusicSelectionModal";
import { themeTokens } from "../constants/themeTokens";
import { Theme } from "../styles/shared";
import * as Haptics from "../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FocusScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const paramTaskId = (params.taskId as string) || "zen-focus";
  const paramTaskName = (params.taskName as string) || "Deep Focus";
  const paramDuration = params.duration
    ? parseInt(params.duration as string, 10)
    : null;

  // Granular timer store subscriptions
  const storeTaskId = useTimerStore((s) => s.taskId);
  const storeTaskName = useTimerStore((s) => s.taskName);
  const isActive = useTimerStore((s) => s.isActive);
  const isCompleted = useTimerStore((s) => s.isCompleted);
  const targetEndTime = useTimerStore((s) => s.targetEndTime);
  const pausedTimeRemaining = useTimerStore((s) => s.pausedTimeRemaining);
  const duration = useTimerStore((s) => s.duration);
  const pomodoroMode = useTimerStore((s) => s.pomodoroMode);
  const pomodoroPhase = useTimerStore((s) => s.pomodoroPhase);
  const pomodoroSession = useTimerStore((s) => s.pomodoroSession);

  const startTimer = useTimerStore((s) => s.startTimer);
  const startPomodoro = useTimerStore((s) => s.startPomodoro);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const stopTimer = useTimerStore((s) => s.stopTimer);
  const resetTimer = useTimerStore((s) => s.resetTimer);
  const advancePomodoroPhase = useTimerStore((s) => s.advancePomodoroPhase);

  // Audio / Sound lifecycle
  const { selectedSong, setSelectedSong, isPlaying } = useAudio();
  const musicPreference = useMusicPreference();
  const [audioModalVisible, setAudioModalVisible] = useState(false);

  // Context timer match - seamlessly tracks active session
  const isCurrentTimer = storeTaskId
    ? (!params.taskId || storeTaskId === paramTaskId)
    : true;
  const isPaused =
    !isActive &&
    !isCompleted &&
    pausedTimeRemaining !== null &&
    pausedTimeRemaining > 0;
  const isSessionInProgress =
    !isCompleted && (isActive || targetEndTime !== null || isPaused);

  // Available duration options
  const durationOptions = useMemo(() => {
    const base = [
      { label: "15m", value: 15 * 60, title: "15 min" },
      { label: "25m", value: 25 * 60, title: "25 min" },
      { label: "45m", value: 45 * 60, title: "45 min" },
      { label: "60m", value: 60 * 60, title: "60 min" },
    ];
    if (
      paramDuration &&
      paramDuration > 0 &&
      ![15, 25, 45, 60].includes(paramDuration)
    ) {
      const customItem = {
        label: `${paramDuration}m`,
        value: paramDuration * 60,
        title: `${paramDuration} min`,
      };
      return [...base, customItem].sort((a, b) => a.value - b.value);
    }
    return base;
  }, [paramDuration]);

  // Local configuration state before starting
  const initialDuration =
    paramDuration && paramDuration > 0 ? paramDuration * 60 : 25 * 60;
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const [selectedMode, setSelectedMode] = useState<"Free" | "Pomodoro">("Free");

  // Custom Flat Confirmation Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<"end" | "minimize">(
    "end"
  );

  // Handle ambient audio start upon timer activation
  const handleStartAudio = useCallback(() => {
    try {
      if (musicPreference > 0 && selectedSong === 0) {
        setSelectedSong(musicPreference);
      }
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, [musicPreference, selectedSong, setSelectedSong]);

  const startNewTimer = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleStartAudio();
    startTimer(paramTaskId, paramTaskName, selectedDuration);
  }, [handleStartAudio, startTimer, paramTaskId, paramTaskName, selectedDuration]);

  const startNewPomodoro = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleStartAudio();
    startPomodoro(paramTaskId, paramTaskName);
  }, [handleStartAudio, startPomodoro, paramTaskId, paramTaskName]);

  const toggleTimer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [isActive, pauseTimer, resumeTimer]);

  /**
   * Top navigation back/close action - protects both running and paused in-progress sessions
   */
  const requestQuit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSessionInProgress) {
      router.back();
      return;
    }
    setConfirmModalType("minimize");
    setConfirmModalVisible(true);
  }, [isSessionInProgress, router]);

  /**
   * Dedicated End Session action that opens custom flat modal
   */
  const handleEndSessionPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmModalType("end");
    setConfirmModalVisible(true);
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (isSessionInProgress) {
        requestQuit();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [isSessionInProgress, requestQuit]);

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopTimer();
    router.back();
  }, [stopTimer, router]);

  const handleRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopTimer();
  }, [stopTimer]);

  const handleConfirmEndModal = useCallback(() => {
    stopTimer();
    router.back();
  }, [stopTimer, router]);

  const handleMinimizeModal = useCallback(() => {
    router.back();
  }, [router]);

  // Determine state
  const showDurationPicker = !isSessionInProgress && !isCompleted;
  const isResetEnabled = isPaused;
  const isLastPomoPhase =
    Boolean(pomodoroMode && pomodoroSession >= 4 && pomodoroPhase !== "work");

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient Background Aura */}
      <View style={styles.ambientAura} pointerEvents="none" />

      {/* Header */}
      <FocusHeader
        onBack={requestQuit}
        onOpenAudioModal={() => setAudioModalVisible(true)}
        isPlayingAudio={isPlaying}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Currently Focusing Task Card */}
        <View style={styles.taskCard}>
          <View style={styles.taskBadge}>
            <Ionicons
              name="disc-outline"
              size={12}
              color={theme.colors.primary}
            />
            <Text style={styles.taskLabel}>CURRENTLY FOCUSING ON</Text>
          </View>
          <Text style={styles.taskName} numberOfLines={2}>
            {isCurrentTimer && storeTaskName ? storeTaskName : paramTaskName}
          </Text>
        </View>

        {/* Luminous Circular Timer Dial (Leaf component - ticks at 1Hz without re-rendering FocusScreen) */}
        <CircularTimerDial
          isCurrentTimer={isCurrentTimer}
          selectedDuration={selectedDuration}
          selectedMode={selectedMode}
        />

        {/* Pomodoro Zen Cycle Indicator */}
        {pomodoroMode && !showDurationPicker && (
          <PomodoroCycleCard
            pomodoroSession={pomodoroSession}
            pomodoroPhase={pomodoroPhase}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Controls Area */}
        {showDurationPicker ? (
          <FocusSetupControls
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            selectedDuration={selectedDuration}
            onSelectDuration={setSelectedDuration}
            durationOptions={durationOptions}
            onStartFreeTimer={startNewTimer}
            onStartPomodoro={startNewPomodoro}
            onStartDebugTimer={() => startTimer(paramTaskId, paramTaskName, 20)}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        ) : isCompleted ? (
          <FocusCompletionCard
            durationMinutes={Math.round(
              (duration || selectedDuration) / 60
            )}
            onComplete={handleComplete}
            onRestart={handleRestart}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        ) : (
          <FocusActiveControls
            isActive={isActive}
            isResetEnabled={isResetEnabled}
            pomodoroMode={pomodoroMode}
            isLastPomoPhase={isLastPomoPhase}
            onToggleTimer={toggleTimer}
            onResetTimer={resetTimer}
            onAdvancePomodoroPhase={advancePomodoroPhase}
            onEndSessionEarly={handleEndSessionPress}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <FocusConfirmModal
        visible={confirmModalVisible}
        type={confirmModalType}
        onClose={() => setConfirmModalVisible(false)}
        onConfirmEnd={handleConfirmEndModal}
        onMinimize={handleMinimizeModal}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      {/* Ambient Music Selection Sheet */}
      <MusicSelectionModal
        visible={audioModalVisible}
        onClose={() => setAudioModalVisible(false)}
        currentTheme={theme}
        activeSongId={selectedSong}
        onSelectSong={setSelectedSong}
      />
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
      backgroundColor: theme.colors.primarySoft,
    },
    scrollContent: {
      paddingHorizontal: themeTokens.spacing.lg,
      paddingBottom: themeTokens.spacing.xl,
      alignItems: "center",
    },
    taskCard: {
      width: "100%",
      borderRadius: themeTokens.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
      paddingHorizontal: themeTokens.spacing.lg,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: themeTokens.spacing.lg,
      elevation: 0,
    },
    taskBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 4,
    },
    taskLabel: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xs,
      color: theme.colors.textSecondary,
      letterSpacing: 1.2,
    },
    taskName: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.xl,
      color: theme.colors.primary,
      textAlign: "center",
    },
  });
