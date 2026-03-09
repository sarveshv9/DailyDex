// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import { loadStats, UserStats } from "../../utils/stats";

import {
  getSharedStyles,
  lightThemes,
  Theme,
  ThemeName,
  themes,
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
  const { themeName, setThemeName, isAutoTheme, setIsAutoTheme } = useTheme();
  const { selectedSong, setSelectedSong } = useAudio();

  // Resolve the base theme and theme object (keeps existing behavior)
  const isLightMode = useMemo(
    () => typeof themeName === "string" && themeName.startsWith("light-"),
    [themeName]
  );

  const baseThemeName = useMemo(() => {
    if (isLightMode) return themeName.substring(6);
    return themeName;
  }, [isLightMode, themeName]);

  const theme: Theme = useMemo(() => {
    if (isLightMode) {
      const lt = lightThemes[themeName as ThemeName];
      if (lt) return lt;
      return themes[baseThemeName as keyof typeof themes] || themes.default;
    }
    return themes[themeName as keyof typeof themes] || themes.default;
  }, [themeName, isLightMode, baseThemeName]);

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  // Modal visibility
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
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
    },
    privacy: {
      profileVisibility: "public",
      showEmail: false,
      allowMessages: true,
    },
    preferences: {
      language: "English",
      timezone: "UTC-5",
      autoSave: true,
    },
  });

  const [isMusicExpanded, setIsMusicExpanded] = useState(false);

  /* -------------------- Handlers -------------------- */
  const selectThemeMode = (mode: "light" | "heavy") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (mode === "light") {
      setThemeName(`light-${baseThemeName}` as ThemeName);
    } else {
      setThemeName(baseThemeName as ThemeName);
    }
  };

  const handleBackup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Backup", "Your data is being backed up.", [
      {
        text: "OK",
        onPress: () => console.log("Backup started"),
      },
    ]);
  };

  const handleSelectSong = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSong(index);
    console.log("Selected Song:", index);
  };

  const toggleNotification = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        // TypeScript index access preserved at runtime
        [key]: !((prev.notifications as any)[key]),
      },
    }));
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => console.log("User logged out") },
    ]);
  };

  const togglePrivacyOption = (key: keyof typeof settings.privacy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key],
      },
    }));
  };

  const togglePreference = (key: keyof typeof settings.preferences) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !((prev.preferences as any)[key]),
      },
    }));
  };

  const handleSaveProfile = async () => {
    setIsEditingProfile(false);
    setEditProfileModalOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem("@zen_profile_setup_complete", "true");
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
            isLightMode={isLightMode}
            isAppearanceExpanded={isAppearanceExpanded}
            setIsAppearanceExpanded={setIsAppearanceExpanded}
            selectThemeMode={selectThemeMode}
            settings={settings}
            setShowNotificationSettings={setShowNotificationSettings}
            setShowPrivacySettings={setShowPrivacySettings}
            setShowPreferencesModal={setShowPreferencesModal}
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
        isLightMode={isLightMode}
        onToggleLightMode={(val) => selectThemeMode(val ? "light" : "heavy")}
        isAutoTheme={isAutoTheme}
        onToggleAutoTheme={setIsAutoTheme}
        onSelectTheme={(tName) => {
          setThemeName((isLightMode ? `light-${tName}` : tName) as ThemeName);
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

      {/* -------------------- Privacy Modal -------------------- */}
      <Modal
        visible={showPrivacySettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacySettings(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPrivacySettings(false)}>
          <Pressable onPress={() => { }} style={styles.modalCard} android_ripple={{ color: "rgba(0,0,0,0.02)" }}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Privacy & Security</Text>
              <Pressable onPress={() => setShowPrivacySettings(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text style={styles.sectionTitle}>Account Privacy</Text>

                <Pressable
                  onPress={() =>
                    Alert.alert("Privacy", "Profile visibility settings (stub).")
                  }
                  style={{ paddingVertical: theme.spacing.sm }}
                >
                  <Text style={styles.rowLabel}>
                    Profile Visibility: {settings.privacy.profileVisibility}
                  </Text>
                </Pressable>

                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={styles.rowLabel}>Show Email</Text>
                  <Switch
                    value={settings.privacy.showEmail}
                    onValueChange={() => togglePrivacyOption("showEmail")}
                    trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>

                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={styles.rowLabel}>Allow Messages</Text>
                  <Switch
                    value={settings.privacy.allowMessages}
                    onValueChange={() => togglePrivacyOption("allowMessages")}
                    trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>Security</Text>

                <Pressable
                  onPress={() => Alert.alert("Security", "Change password (stub).")}
                  style={[styles.row, { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.rowLabel}>Change Password</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    Alert.alert("Security", "Two-factor authentication settings (stub).")
                  }
                  style={[styles.row, { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.rowLabel}>Two-Factor Authentication</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* -------------------- Preferences Modal -------------------- */}
      <Modal
        visible={showPreferencesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreferencesModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPreferencesModal(false)}>
          <Pressable onPress={() => { }} style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Preferences</Text>
              <Pressable onPress={() => setShowPreferencesModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                style={[styles.row, { borderBottomWidth: 0 }]}
                onPress={() => Alert.alert("Language", "Language selection (stub)")}
              >
                <Text style={styles.rowLabel}>Language</Text>
                <Text style={styles.rowValue}>{settings.preferences.language}</Text>
              </Pressable>

              <Pressable
                style={[styles.row, { borderBottomWidth: 0 }]}
                onPress={() => Alert.alert("Timezone", "Timezone selection (stub)")}
              >
                <Text style={styles.rowLabel}>Timezone</Text>
                <Text style={styles.rowValue}>{settings.preferences.timezone}</Text>
              </Pressable>

              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>Auto-Save</Text>
                <Switch
                  value={settings.preferences.autoSave}
                  onValueChange={() => togglePreference("autoSave")}
                  trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}