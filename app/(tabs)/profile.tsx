// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileCard } from "../../components/profile/ProfileCard";
import { SettingModal } from "../../components/profile/SettingModal";
import { SettingsSection } from "../../components/profile/SettingsSection";
import { StatCard } from "../../components/profile/StatCard";
import { StatsModal } from "../../components/profile/StatsModal";
import { ThemeSelectionModal } from "../../components/profile/ThemeSelectionModal";
import { useAudio } from "../../context/AudioContext";
import { useTheme } from "../../context/ThemeContext";
import { cancelAllRoutineNotifications, scheduleRoutineNotifications } from "../../utils/notifications";
import { loadStats, UserStats } from "../../utils/stats";
import { RoutineItem } from "../../utils/utils";

import {
  getSharedStyles,
  Theme
} from "../../constants/shared";

/**
 * Modernized Profile Screen
 *
 * - Preserves original behaviors (editing, modals, toggles, theme switching, audio selection).
 * - Replaces inline / inconsistent styles with a coherent theme-driven stylesheet.
 * - Improves touch feedback, spacing, accessibility, and visual hierarchy.
 */

/* -------------------- Styles generator -------------------- */
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    scrollContent: {
      paddingTop: theme.spacing.lg,
      paddingBottom: 96,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.lg,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    screenTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: theme.colors.primary,
    },

    /* Profile Card wrapper */
    profileCardWrapper: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 6,
    },
    profileActionsRow: {
      position: "absolute",
      top: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },

    /* Stats */
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },

    /* Section area */
    sectionsContainer: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.lg,
    },

    /* Floating button / minor actions */
    smallButton: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.secondary,
    },

    /* Modal common styles */
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    modalCard: {
      width: "100%",
      maxWidth: 640,
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      maxHeight: "85%",
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    modalTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: theme.colors.primary,
    },

    /* Modal body rows */
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.secondary}20`,
    },
    rowLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 16,
      color: theme.colors.primary,
      flex: 1,
    },
    rowValue: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: theme.colors.secondary,
      marginLeft: theme.spacing.md,
    },

    /* Utilities */
    sectionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },

    // Logout button spacing
    logoutButton: {
      marginTop: theme.spacing.lg,
      alignSelf: "stretch",
    },
  });

/* -------------------- Component -------------------- */
export default function ProfileScreen() {
  const { theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode } = useTheme();
  const { selectedSong, setSelectedSong } = useAudio();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  // Modal visibility
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Profile setup state
  const [profileCreated, setProfileCreated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real user stats from utils/stats
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        try {
          const profileSetup = await AsyncStorage.getItem("@zen_profile_setup_complete");
          setProfileCreated(!!profileSetup);

          const storedProfile = await AsyncStorage.getItem("@zen_user_profile");
          if (storedProfile) {
            setUser(JSON.parse(storedProfile));
          }

          const storedSettings = await AsyncStorage.getItem("@zen_user_settings");
          if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
          }

          const statsData = await loadStats();
          setUserStats(statsData);
        } catch (e) {
          setProfileCreated(false);
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialData();
    }, [])
  );

  // Profile state (keeps your existing defaults)
  const [user, setUser] = useState({
    name: "Ash Ketchum",
    avatar: "A",
    role: "Pokémon Trainer",
    stats: {
      followers: 25,
      following: 3,
      projects: 12,
    },
    email: "ash@palette.town",
    bio: "Pokémon Trainer from Palette Town.",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // App-level settings state
  const [isAppearanceExpanded, setIsAppearanceExpanded] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      taskReminders: true,
      dailySummary: true,
      achievements: false,
      news: false,
    }
  });

  const [isMusicExpanded, setIsMusicExpanded] = useState(false);

  /* -------------------- Handlers -------------------- */
  const selectThemeMode = (isDark: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDarkMode(isDark);
  };

  const handleBackup = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const backupData = Object.fromEntries(items);
      const dataString = JSON.stringify(backupData, null, 2);

      await Share.share({
        message: dataString,
        title: 'Zen App Backup'
      });
    } catch (e) {
      Alert.alert("Error", "Failed to create backup.");
      console.error(e);
    }
  };

  const handleSelectSong = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSong(index);
    console.log("Selected Song:", index);
  };

  const toggleNotification = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => {
      const newValue = !((prev.notifications as any)[key]);
      const newSettings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: newValue,
        },
      };

      // Save to async storage
      AsyncStorage.setItem("@zen_user_settings", JSON.stringify(newSettings))
        .catch(e => console.error("Failed to save settings", e));

      // If toggling taskReminders, schedule or cancel routine notifications
      if (key === "taskReminders") {
        if (newValue) {
          AsyncStorage.getItem("@zen_routine").then((data) => {
            if (data) {
              const routines: RoutineItem[] = JSON.parse(data);
              scheduleRoutineNotifications(routines);
            }
          }).catch(e => console.error("Failed to load routine for notifications", e));
        } else {
          cancelAllRoutineNotifications();
        }
      }

      return newSettings;
    });
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performLogout = async () => {
      try {
        await AsyncStorage.removeItem("@zen_profile_setup_complete");
        // Also clear profile so it resets to defaults
        await AsyncStorage.removeItem("@zen_user_profile");
        setProfileCreated(false);
      } catch (e) {
        console.error("Failed to logout", e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out? This will reset your profile setup state.")) {
        performLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out? This will reset your profile setup state.", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout },
      ]);
    }
  };

  const handleSaveProfile = async () => {
    setIsEditingProfile(false);
    setEditProfileModalOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem("@zen_profile_setup_complete", "true");
      await AsyncStorage.setItem("@zen_user_profile", JSON.stringify(user));
      setProfileCreated(true);
    } catch (e) {
      console.error("Failed to save profile flag", e);
    }
    console.log("Profile Saved:", user);
  };

  /* -------------------- Render -------------------- */
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (!profileCreated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={[styles.profileCardWrapper, { alignItems: "center", paddingVertical: 40, width: "100%", maxWidth: 400 }]}>
            <Text style={[styles.screenTitle, { marginBottom: 16 }]}>Welcome to Zen</Text>
            <Text style={{ fontFamily: theme.fonts.medium, color: theme.colors.secondary, textAlign: "center", marginBottom: 32 }}>
              Create your profile to personalize your experience and track your progress.
            </Text>

            <Pressable
              style={({ pressed }) => [
                sharedStyles.primaryButton,
                { opacity: pressed ? 0.9 : 1, width: "100%" }
              ]}
              onPress={() => setEditProfileModalOpen(true)}
            >
              <Text style={sharedStyles.primaryButtonText}>Create Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* -------------------- Edit Profile Modal -------------------- */}
        <SettingModal
          visible={editProfileModalOpen}
          onClose={() => setEditProfileModalOpen(false)}
          theme={theme}
          user={user}
          setUser={setUser}
          handleSaveProfile={handleSaveProfile}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile Card */}
        <View style={styles.profileCardWrapper}>
          <ProfileCard
            userProfile={user}
            isEditingProfile={isEditingProfile}
            setUserProfile={setUser}
            setIsEditingProfile={setIsEditingProfile}
            handleSaveProfile={handleSaveProfile}
          />
        </View>

        {/* Real Stats */}
        <View style={styles.statsRow}>
          <StatCard label="XP" value={userStats?.xp || 0} theme={theme} />
          <StatCard label="Tasks Done" value={userStats?.tasksCompleted || 0} theme={theme} />
          <StatCard label="Best Streak" value={userStats?.bestStreak || 0} theme={theme} />
        </View>

        <Pressable
          style={{
            backgroundColor: `${theme.colors.primary}15`,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginTop: theme.spacing.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}30`
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowStatsModal(true);
          }}
        >
          <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
          <Text style={{ fontFamily: theme.fonts.bold, color: theme.colors.primary, fontSize: 16 }}>
            View Detailed Stats
          </Text>
        </Pressable>

        {/* Settings */}
        <View style={styles.sectionsContainer}>
          <SettingsSection
            theme={theme}
            isDarkMode={isDarkMode}
            isAppearanceExpanded={isAppearanceExpanded}
            setIsAppearanceExpanded={setIsAppearanceExpanded}
            selectThemeMode={selectThemeMode}
            settings={settings}
            setShowNotificationSettings={setShowNotificationSettings}
            handleBackup={handleBackup}
            selectedSong={selectedSong}
            setSelectedSong={handleSelectSong}
            isMusicExpanded={isMusicExpanded}
            setIsMusicExpanded={setIsMusicExpanded}
            userXp={userStats?.xp || 0}
          />
        </View>

        {/* Logout */}
        <Pressable
          style={[sharedStyles.primaryButton, styles.logoutButton]}
          onPress={handleLogout}
          accessibilityRole="button"
          android_ripple={{ color: "rgba(0,0,0,0.06)" }}
          hitSlop={8}
        >
          <Text style={sharedStyles.primaryButtonText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* -------------------- Stats Modal -------------------- */}
      <StatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        theme={theme}
        stats={userStats}
      />

      {/* -------------------- Theme Selection Modal -------------------- */}
      <ThemeSelectionModal
        visible={isAppearanceExpanded}
        onClose={() => setIsAppearanceExpanded(false)}
        currentTheme={theme}
        activeThemeName={themeName}
        isDarkMode={isDarkMode}
        onToggleDarkMode={selectThemeMode}
        isAutoTheme={isAutoTheme}
        onToggleAutoTheme={setIsAutoTheme}
        onSelectTheme={(tName) => {
          setThemeName(tName);
        }}
      />

      {/* -------------------- Edit Profile Modal -------------------- */}
      <SettingModal
        visible={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        theme={theme}
        user={user}
        setUser={setUser}
      />

      {/* -------------------- Notification Modal -------------------- */}
      <Modal
        visible={showNotificationSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowNotificationSettings(false)}>
          <Pressable
            onPress={() => { }}
            style={styles.modalCard}
            android_ripple={{ color: "rgba(0,0,0,0.02)" }}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Pressable onPress={() => setShowNotificationSettings(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: "taskReminders", label: "Task Reminders" },
                { key: "dailySummary", label: "Daily Summary" },
                { key: "achievements", label: "Achievements" },
                { key: "news", label: "News & Updates" },
              ].map((opt, idx, arr) => (
                <View
                  key={opt.key}
                  style={[
                    styles.row,
                    idx === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                  ]}
                >
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  <Switch
                    value={(settings.notifications as any)[opt.key]}
                    onValueChange={() => toggleNotification(opt.key)}
                    trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                    accessibilityLabel={`Toggle ${opt.label}`}
                  />
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}