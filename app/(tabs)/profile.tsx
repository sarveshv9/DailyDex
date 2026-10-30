// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
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
import { Theme } from "../../styles/shared";
import {
  STORAGE_KEYS,
  USER_PROFILE_STORAGE_KEY,
  ROUTINE_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  SETUP_STORAGE_KEY,
  PROFILE_SETUP_STORAGE_KEY,
  STATS_STORAGE_KEY,
  TIMER_STORAGE_KEY,
} from "../../constants/storageKeys";
import * as Haptics from "../../utils/haptics";
import { RoutineItem } from "../../utils/utils";

/**
 * Screen 5: Profile & Settings Tab
 *
 * - Focused strictly on user personalization, cloud sync, and app preferences.
 * - Free of gamification, streaks, and analytical clutter.
 * - Elegant clean flat aesthetics, standardized buttons (56px, borderRadius: 22).
 */

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode } = useTheme();
  const { selectedSong, setSelectedSong } = useAudio();
  const { signOut, updateUser } = useAuth();
  const { settings } = useSettings();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Modal visibility states
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  // Profile setup state
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // User state
  const [user, setUser] = useState({
    name: "",
    avatar: "",
    role: "",
    email: "",
    bio: "",
  });

  const loadProfileData = useCallback(async () => {
    try {
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const localProfile = JSON.parse(storedProfile);
        setUser(localProfile);
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleRefresh = useCallback(async () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    try {
      await loadProfileData();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfileData, settings.hapticsEnabled]);

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
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setUser(parsed);
        await updateUser(parsed);
      }
    } catch (e) {
      console.error("Error refreshing state after restore:", e);
    }
  };

  const handleResetTasks = async () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const performReset = async () => {
      try {
        const data = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
        if (data) {
          const routines: RoutineItem[] = JSON.parse(data);
          const preserved = routines.filter((r) => {
            const taskLo = r.task?.toLowerCase().trim();
            return taskLo === "wake up" || taskLo === "sleep";
          });
          await AsyncStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(preserved));
        }
        await AsyncStorage.multiRemove([TASKS_STORAGE_KEY, STORAGE_KEYS.LEGACY_TASKS]);
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS === "web") {
          window.alert("All tasks and custom routines have been reset except Wake Up and Sleep.");
        } else {
          Alert.alert("Success", "All tasks and custom routines have been reset except Wake Up and Sleep.");
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
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performFullReset = async () => {
      try {
        await AsyncStorage.multiRemove([
          SETUP_STORAGE_KEY,
          PROFILE_SETUP_STORAGE_KEY,
          USER_PROFILE_STORAGE_KEY,
          ROUTINE_STORAGE_KEY,
          TASKS_STORAGE_KEY,
          STORAGE_KEYS.LEGACY_TASKS,
          STATS_STORAGE_KEY,
          TIMER_STORAGE_KEY,
        ]);
        await signOut();
        setUser({ name: "", avatar: "", role: "", email: "", bio: "" });
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/setup");
      } catch (e) {
        console.error("Failed to perform full app reset:", e);
      }
    };

    const performResetProfile = async () => {
      try {
        await AsyncStorage.multiRemove([
          PROFILE_SETUP_STORAGE_KEY,
          USER_PROFILE_STORAGE_KEY,
        ]);
        await signOut();
        setUser({ name: "", avatar: "", role: "", email: "", bio: "" });
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error("Failed to reset profile:", e);
      }
    };

    if (Platform.OS === "web") {
      const isFull = window.confirm(
        "Reset Options:\n\nClick 'OK' for Full App Reset (wipes all tasks, routines, and returns to setup).\nClick 'Cancel' to choose Profile Only or dismiss."
      );
      if (isFull) {
        performFullReset();
      } else {
        if (window.confirm("Do you want to reset Profile Only? (Keeps routines and tasks intact)")) {
          performResetProfile();
        }
      }
    } else {
      Alert.alert(
        "Reset & Log Out",
        "Choose an option to reset your profile or entire application state:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset Profile Only",
            style: "destructive",
            onPress: performResetProfile,
          },
          {
            text: "Full App Reset",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Confirm Full App Reset",
                "This will permanently delete all your routines, tasks, stats, and return you to onboarding setup.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete Everything",
                    style: "destructive",
                    onPress: performFullReset,
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const handleSaveProfile = async () => {
    setIsEditingProfile(false);
    setEditProfileModalOpen(false);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem(PROFILE_SETUP_STORAGE_KEY, "true");
      await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
      await updateUser(user);
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
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ width: 48, height: 48 }} />
      </View>
    );
  }

  /* -------------------- Active Profile Dashboard -------------------- */
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Profile</Text>
            <Text style={styles.screenSubtitle}>Personalization, sync & app preferences</Text>
          </View>
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

        {/* App Configuration & Settings Section */}
        <SettingsSection
          theme={theme}
          onOpenThemeModal={() => setThemeModalOpen(true)}
          onOpenMusicModal={() => setMusicModalOpen(true)}
          handleBackup={handleBackup}
          handleRestore={handleRestore}
          handleResetTasks={handleResetTasks}
        />

        {/* Reset / Log Out */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Reset profile or full app data"
          accessibilityHint="Presents options to reset profile or perform a full app wipe"
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutButtonText}>Log Out & Reset</Text>
        </Pressable>

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
      paddingTop: 16,
      paddingBottom: 110,
      paddingHorizontal: 20,
      gap: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      marginBottom: 0,
    },
    screenTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.6,
      color: theme.colors.text,
    },
    screenSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    syncCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      backgroundColor: theme.colors.surfaceMuted,
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
      backgroundColor: theme.isDarkMode ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)",
      borderWidth: 1,
      borderColor: theme.isDarkMode ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.18)",
    },
    syncConnectedTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: theme.colors.successText,
    },
    syncConnectedSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: theme.colors.successText,
      opacity: 0.85,
      marginTop: 1,
    },
    logoutButton: {
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.dangerSoft,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: theme.colors.danger,
    },

  });
