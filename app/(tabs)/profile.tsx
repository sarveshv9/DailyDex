// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MusicSelectionModal } from "../../components/profile/MusicSelectionModal";
import { ProfileCard } from "../../components/profile/ProfileCard";
import { RestoreModal } from "../../components/profile/RestoreModal";
import { SettingModal } from "../../components/profile/SettingModal";
import { SettingsSection } from "../../components/profile/SettingsSection";
import { ThemeSelectionModal } from "../../components/profile/ThemeSelectionModal";
import { useAudio } from "../../context/AudioContext";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { getSharedStyles, Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { RoutineItem } from "../../utils/utils";

/**
 * Screen 5: Profile & Settings Tab
 *
 * - Focused strictly on user personalization, cloud sync, and app preferences.
 * - Free of gamification, streaks, and analytical clutter.
 * - Elegant glassmorphic aesthetics, standardized buttons (56px, borderRadius: 22).
 */

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode } = useTheme();
  const { selectedSong, setSelectedSong } = useAudio();
  const { session, signOut } = useAuth();
  const { settings } = useSettings();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  // Modal visibility states
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  // Profile setup state
  const [profileCreated, setProfileCreated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // User state
  const [user, setUser] = useState({
    name: "",
    avatar: "",
    role: "",
    email: "",
    bio: "",
  });

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        try {
          const profileSetup = await AsyncStorage.getItem("@zen_profile_setup_complete");
          setProfileCreated(!!profileSetup);

          let localProfile = null;
          const storedProfile = await AsyncStorage.getItem("@zen_user_profile");
          if (storedProfile) {
            localProfile = JSON.parse(storedProfile);
            setUser(localProfile);
          }


        } catch (e) {
          setProfileCreated(false);
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialData();
    }, [session?.user])
  );



  const handleBackup = async () => {
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const backupData = Object.fromEntries(items);
      const dataString = JSON.stringify(backupData, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([dataString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zen-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: dataString,
          title: "Zen App Backup",
        });
      }
    } catch (e) {
      if (Platform.OS === "web") {
        window.alert("Failed to create backup.");
      } else {
        Alert.alert("Error", "Failed to create backup.");
      }
      console.error(e);
    }
  };

  const handleRestore = () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoreModalOpen(true);
  };

  const handleRestoreSuccess = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem("@zen_user_profile");
      if (storedProfile) {
        setUser(JSON.parse(storedProfile));
        setProfileCreated(true);
      }
    } catch (e) {
      console.error("Error refreshing state after restore:", e);
    }
  };

  const handleResetTasks = async () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const performReset = async () => {
      try {
        const data = await AsyncStorage.getItem("@zen_routine");
        if (data) {
          const routines: RoutineItem[] = JSON.parse(data);
          const preserved = routines.filter((r) => {
            const taskLo = r.task?.toLowerCase().trim();
            return taskLo === "wake up" || taskLo === "sleep";
          });
          await AsyncStorage.setItem("@zen_routine", JSON.stringify(preserved));
          if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (Platform.OS === "web") {
            window.alert("All tasks have been reset except Wake Up and Sleep.");
          } else {
            Alert.alert("Success", "All tasks have been reset except Wake Up and Sleep.");
          }
        }
      } catch (e) {
        console.error("Failed to reset tasks", e);
        if (Platform.OS === "web") {
          window.alert("Could not reset tasks.");
        } else {
          Alert.alert("Error", "Could not reset tasks.");
        }
      }
    };

    if (Platform.OS === "web") {
      const firstConfirm = window.confirm(
        "Reset All Tasks\n\nAre you sure you want to reset all tasks? This action cannot be undone."
      );
      if (firstConfirm) {
        const secondConfirm = window.confirm(
          "Final Confirmation\n\nThis is your last chance. Do you really want to permanently delete all your tasks?"
        );
        if (secondConfirm) {
          await performReset();
        }
      }
    } else {
      Alert.alert(
        "Reset All Tasks",
        "Are you sure you want to reset all tasks? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Reset",
            style: "destructive",
            onPress: () => {
              setTimeout(() => {
                Alert.alert(
                  "Final Confirmation",
                  "This is your last chance. Do you really want to permanently delete all your tasks?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset Everything",
                      style: "destructive",
                      onPress: performReset,
                    },
                  ]
                );
              }, 400);
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performLogout = async () => {
      try {
        await signOut();
      } catch (e) {
        console.error("Supabase sign out error (continuing with local cleanup):", e);
      }

      try {
        await AsyncStorage.removeItem("@zen_profile_setup_complete");
        await AsyncStorage.removeItem("@zen_user_profile");
        await AsyncStorage.removeItem("@zen_routine");
      } catch (e) {
        console.error("Failed to clear AsyncStorage:", e);
      }

      setProfileCreated(false);

      if (Platform.OS === "web") {
        window.location.href = window.location.origin;
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        performLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
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
  };

  /* -------------------- Loading State -------------------- */
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  /* -------------------- First Install / Unset Profile State -------------------- */
  if (!profileCreated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.welcomeCard}>
            {/* Luminous Logo Squircle */}
            <View style={styles.welcomeLogoCircle}>
              <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
            </View>

            <Text style={styles.welcomeTitle}>Welcome to Zen</Text>
            <Text style={styles.welcomeSubtitle}>
              Create your profile to personalize your experience and sync your preferences.
            </Text>

            {/* Standard Primary CTA Button (height: 56, borderRadius: 22, glowing drop shadow) */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryCtaButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => setEditProfileModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Create Profile"
            >
              <Ionicons name="person-add-outline" size={20} color={theme.colors.white} />
              <Text style={styles.primaryCtaText}>Create Profile</Text>
            </Pressable>


          </View>
        </View>

        {/* Edit Profile Modal */}
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

  /* -------------------- Active Profile Dashboard -------------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Profile</Text>
            <Text style={styles.screenSubtitle}>Personalization, sync & app preferences</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
            ]}
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* Profile Hero Card */}
        <ProfileCard
          userProfile={user}
          isEditingProfile={isEditingProfile}
          setUserProfile={setUser}
          setIsEditingProfile={setIsEditingProfile}
          handleSaveProfile={handleSaveProfile}
          onOpenEditModal={() => setEditProfileModalOpen(true)}
        />

        {/* Offline Privacy & Local Storage Badge */}
        <View style={[styles.syncConnectedCard, { borderColor: theme.glass.borderColor }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#34C759" />
          <View style={{ flex: 1 }}>
            <Text style={styles.syncConnectedTitle}>Offline & Private</Text>
            <Text style={styles.syncConnectedSubtitle} numberOfLines={1}>
              All your habits, routines, and focus data stay on this device
            </Text>
          </View>
        </View>

        {/* App Configuration & Settings Section */}
        <SettingsSection
          theme={theme}
          onOpenThemeModal={() => setThemeModalOpen(true)}
          onOpenMusicModal={() => setMusicModalOpen(true)}
          handleBackup={handleBackup}
          handleRestore={handleRestore}
          handleResetTasks={handleResetTasks}
        />

        {/* Logout (when signed in) */}
        {session && (
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={20} color="#FF453A" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* -------------------- Modals & Sheets -------------------- */}
      <SettingModal
        visible={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        theme={theme}
        user={user}
        setUser={setUser}
        handleSaveProfile={handleSaveProfile}
      />

      <RestoreModal
        visible={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        theme={theme}
        onRestoreSuccess={handleRestoreSuccess}
      />

      <ThemeSelectionModal
        visible={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentTheme={theme}
        activeThemeName={themeName}
        isDarkMode={isDarkMode}
        onToggleDarkMode={setIsDarkMode}
        isAutoTheme={isAutoTheme}
        onToggleAutoTheme={setIsAutoTheme}
        onSelectTheme={setThemeName}
      />

      <MusicSelectionModal
        visible={musicModalOpen}
        onClose={() => setMusicModalOpen(false)}
        currentTheme={theme}
        activeSongId={selectedSong}
        onSelectSong={(id) => setSelectedSong(id)}
      />
    </SafeAreaView>
  );
}

/* -------------------- Styles Generator -------------------- */
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingTop: theme.spacing.md,
      paddingBottom: 96,
      paddingHorizontal: 20,
      gap: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      marginBottom: 4,
    },
    screenTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 28,
      letterSpacing: -0.6,
      color: theme.colors.text,
    },
    screenSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.secondary}12`,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}15`,
    },
    syncCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    syncCardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    googleIconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${theme.colors.secondary}12`,
      alignItems: "center",
      justifyContent: "center",
    },
    syncCardTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
    },
    syncCardSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      marginTop: 2,
      opacity: 0.8,
    },
    syncConnectedCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: "#34C75914",
      borderWidth: 1,
      borderColor: "#34C75930",
    },
    syncConnectedTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: "#34C759",
    },
    syncConnectedSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "#34C759",
      opacity: 0.85,
      marginTop: 1,
    },
    logoutButton: {
      height: 56,
      borderRadius: 22,
      backgroundColor: "#FF453A12",
      borderWidth: 1,
      borderColor: "#FF453A35",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: "#FF453A",
    },

    /* Unset Profile State */
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    welcomeCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 24,
      width: "100%",
      maxWidth: 420,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    },
    welcomeLogoCircle: {
      width: 72,
      height: 72,
      borderRadius: 28,
      backgroundColor: `${theme.colors.primary}16`,
      borderWidth: 2,
      borderColor: `${theme.colors.primary}40`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      ...theme.glows.primary,
    },
    welcomeTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 26,
      letterSpacing: -0.5,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    welcomeSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
      paddingHorizontal: 12,
    },
    primaryCtaButton: {
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...theme.glows.primary,
    },
    primaryCtaText: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
      fontSize: 16,
    },
    orDividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 12,
      width: "100%",
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${theme.colors.secondary}25`,
    },
    orDividerText: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    googleSyncButton: {
      height: 56,
      borderRadius: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}25`,
      backgroundColor: `${theme.colors.secondary}06`,
      gap: 10,
    },
    googleSyncText: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
    },
    signedInBadge: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: "#34C75915",
    },
    signedInText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: "#34C759",
    },
  });
