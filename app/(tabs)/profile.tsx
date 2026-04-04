// app/(tabs)/profile.tsx
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "../../utils/haptics";
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
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileCard } from "../../components/profile/ProfileCard";
import { SettingModal } from "../../components/profile/SettingModal";
import { SettingsSection } from "../../components/profile/SettingsSection";
import { StatCard } from "../../components/profile/StatCard";
import { StatsModal } from "../../components/profile/StatsModal";
import { ThemeSelectionModal } from "../../components/profile/ThemeSelectionModal";
import { BottomSheet } from "../../components/profile/BottomSheet";
import { useAudio } from "../../context/AudioContext";
import { useSettings } from "../../context/SettingsContext";
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
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    screenTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 28,
      letterSpacing: -0.5,
      color: theme.colors.text,
    },

    /* Profile Card wrapper */
    profileCardWrapper: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 4,
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
      backgroundColor: theme.colors.card,
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
  const { session, signOut } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
        },
      });
      if (error) {
        console.error('Google sign in error', error.message);
        Alert.alert('Sign In Error', error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);

  // Modal visibility
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
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

          let localProfile = null;
          const storedProfile = await AsyncStorage.getItem("@zen_user_profile");
          if (storedProfile) {
            localProfile = JSON.parse(storedProfile);
            setUser(localProfile);
          }

          // Fetch from Supabase
          if (session?.user) {
              const { data: remoteProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
              if (remoteProfile) {
                  const updatedProfile = {
                      ...localProfile, // keep defaults like mock stats
                      name: remoteProfile.full_name || localProfile?.name || 'User',
                      avatar: remoteProfile.avatar_url || localProfile?.avatar || 'U',
                      role: remoteProfile.role || localProfile?.role || 'Zen Practitioner',
                      bio: remoteProfile.bio || localProfile?.bio || '',
                      email: session.user.email || localProfile?.email || '',
                      stats: localProfile?.stats || { followers: 0, following: 0, projects: 0 }
                  };
                  setUser(updatedProfile);
                  await AsyncStorage.setItem("@zen_user_profile", JSON.stringify(updatedProfile));
              }
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

  // Auto-create profile when user signs in with Google
  React.useEffect(() => {
    if (!session || profileCreated || isLoading) return;

    const autoCreateProfile = async () => {
      const meta = session.user?.user_metadata;
      const fullName = meta?.full_name || meta?.name || session.user?.email?.split('@')[0] || 'User';
      const email = session.user?.email || '';
      const avatarInitial = fullName.charAt(0).toUpperCase();

      const newProfile = {
        name: fullName,
        avatar: avatarInitial,
        role: "Zen Practitioner",
        stats: { followers: 0, following: 0, projects: 0 },
        email: email,
        bio: "",
      };

      try {
        await AsyncStorage.setItem("@zen_profile_setup_complete", "true");
        await AsyncStorage.setItem("@zen_user_profile", JSON.stringify(newProfile));
        setUser(newProfile);
        setProfileCreated(true);
      } catch (e) {
        console.error("Failed to auto-create profile:", e);
      }
    };

    autoCreateProfile();
  }, [session, profileCreated, isLoading]);

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
  const { settings, toggleNotification } = useSettings();

  /* -------------------- Handlers -------------------- */
  const selectThemeMode = (isDark: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDarkMode(isDark);
  };

  const handleBackup = async () => {
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const backupData = Object.fromEntries(items);
      const dataString = JSON.stringify(backupData, null, 2);

      if (Platform.OS === 'web') {
        // Web: trigger a file download
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zen-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: dataString,
          title: 'Zen App Backup'
        });
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert("Failed to create backup.");
      } else {
        Alert.alert("Error", "Failed to create backup.");
      }
      console.error(e);
    }
  };

  const handleResetTasks = async () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const performReset = async () => {
      try {
        const data = await AsyncStorage.getItem("@zen_routine");
        if (data) {
          const routines: RoutineItem[] = JSON.parse(data);
          const preserved = routines.filter(r => {
            const taskLo = r.task?.toLowerCase().trim();
            return taskLo === "wake up" || taskLo === "sleep";
          });
          await AsyncStorage.setItem("@zen_routine", JSON.stringify(preserved));
          if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (Platform.OS === 'web') {
            window.alert("All tasks have been reset except Wake Up and Sleep.");
          } else {
            Alert.alert("Success", "All tasks have been reset except Wake Up and Sleep.");
          }
        }
      } catch (e) {
        console.error("Failed to reset tasks", e);
        if (Platform.OS === 'web') {
          window.alert("Could not reset tasks.");
        } else {
          Alert.alert("Error", "Could not reset tasks.");
        }
      }
    };

    if (Platform.OS === 'web') {
      // Web: use window.confirm for dialogs
      const firstConfirm = window.confirm("Reset All Tasks\n\nAre you sure you want to reset all tasks? This action cannot be undone.");
      if (firstConfirm) {
        const secondConfirm = window.confirm("Final Confirmation\n\nThis is your last chance. Do you really want to permanently delete all your tasks?");
        if (secondConfirm) {
          await performReset();
        }
      }
    } else {
      // Native: use Alert.alert with nested callbacks
      Alert.alert("Reset All Tasks", "Are you sure you want to reset all tasks? This action cannot be undone.", [
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
                    onPress: performReset
                  }
                ]
              );
            }, 500);
          } 
        },
      ]);
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performLogout = async () => {
      // Sign out from Supabase (don't let failure block local cleanup)
      try {
        await signOut();
      } catch (e) {
        console.error("Supabase sign out error (continuing with local cleanup):", e);
      }

      // Always clear local state
      try {
        await AsyncStorage.removeItem("@zen_profile_setup_complete");
        await AsyncStorage.removeItem("@zen_user_profile");
        await AsyncStorage.removeItem("@zen_routine");
      } catch (e) {
        console.error("Failed to clear AsyncStorage:", e);
      }

      setProfileCreated(false);

      // On web, force a clean page reload to reset all state
      if (Platform.OS === 'web') {
        window.location.href = window.location.origin;
      }
    };

    if (Platform.OS === 'web') {
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
      
      // Sync to cloud
      if (session?.user) {
        await supabase.from('profiles').upsert({
           id: session.user.id,
           full_name: user.name,
           avatar_url: user.avatar,
           role: user.role,
           bio: user.bio,
           updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Failed to save profile flag", e);
    }
    console.log("Profile Saved:", user);
  };

  /* -------------------- Render -------------------- */
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], width: "100%" }
              ]}
              onPress={() => setEditProfileModalOpen(true)}
            >
              <Text style={sharedStyles.primaryButtonText}>Create Profile</Text>
            </Pressable>

            {/* Google Sign-In for syncing */}
            {!session && (
              <View style={{ marginTop: 24, width: "100%", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 }}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.secondary + "40" }} />
                  <Text style={{ fontFamily: theme.fonts.regular, fontSize: 13, color: theme.colors.secondary }}>or</Text>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.secondary + "40" }} />
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    paddingVertical: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.secondary + "30",
                    backgroundColor: theme.colors.background,
                    gap: 10,
                  }}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color={theme.colors.text} />
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 16, color: theme.colors.text }}>
                    Sign in with Google to sync
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {session && (
              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 14, color: "#34C759" }}>
                  Signed in as {session.user?.email}
                </Text>
              </View>
            )}
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
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Profile</Text>
        </View>

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
          <StatCard label="Focus (h)" value={Math.floor((userStats?.totalFocusMinutes || 0) / 60)} theme={theme} />
          <StatCard label="Tasks Done" value={userStats?.tasksCompleted || 0} theme={theme} />
          <StatCard label="Best Streak" value={userStats?.bestStreak || 0} theme={theme} />
        </View>

        <Pressable
          style={({ pressed }) => ({
            backgroundColor: `${theme.colors.primary}15`,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginTop: theme.spacing.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}30`,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
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

        {/* Google Sign In Card (when not signed in) */}
        {!session && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.secondary + "20",
              gap: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color={theme.colors.text} />
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 16, color: theme.colors.text }}>
              Sign in with Google to sync
            </Text>
          </TouchableOpacity>
        )}
        {session && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: "#34C75915",
          }}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 14, color: "#34C759", flex: 1 }}>
              Syncing as {session.user?.email}
            </Text>
          </View>
        )}

        {/* Settings */}
        <View style={styles.sectionsContainer}>
          <SettingsSection
            theme={theme}
            handleBackup={handleBackup}
            handleResetTasks={handleResetTasks}
          />
        </View>

        {/* Logout — only show when signed in */}
        {session && (
          <Pressable
            style={({ pressed }) => [
              sharedStyles.destructiveButton,
              styles.logoutButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            hitSlop={8}
          >
            <Text style={sharedStyles.destructiveButtonText}>Logout</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* -------------------- Stats Modal -------------------- */}
      <StatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        theme={theme}
        stats={userStats}
      />

      {/* -------------------- Edit Profile Modal -------------------- */}
      <SettingModal
        visible={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        theme={theme}
        user={user}
        setUser={setUser}
      />

    </SafeAreaView>
  );
}
