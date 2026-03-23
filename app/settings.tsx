// app/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useAudio } from "../context/AudioContext";
import { ThemeSelectionModal } from "../components/profile/ThemeSelectionModal";
import { MusicSelectionModal } from "../components/profile/MusicSelectionModal";
import { SONG_LIST } from "../constants/songs";
import { Theme } from "../constants/shared";

export default function SettingsScreen() {
  const { theme, themeName, setThemeName, isAutoTheme, setIsAutoTheme, isDarkMode, setIsDarkMode } = useTheme();
  const { settings, toggleNotification, setHapticsEnabled, setMusicPreference } = useSettings();
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [showMusicModal, setShowMusicModal] = React.useState(false);
  const { setSelectedSong } = useAudio();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleToggleHaptics = (value: boolean) => {
    if (value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHapticsEnabled(value);
  };

  const handleSongSelect = (id: number) => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    setMusicPreference(id);
    setSelectedSong(id);
  };

  const renderSwitchRow = (
    icon: string,
    label: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
    isLast = false
  ) => (
    <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(v);
        }}
        trackColor={{ false: theme.colors.secondary + "40", true: theme.colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  const renderPressableRow = (
    icon: string,
    label: string,
    onPress: () => void,
    isLast = false
  ) => (
    <Pressable 
      style={({ pressed }) => [
        styles.row, 
        isLast && { borderBottomWidth: 0 },
        pressed && { backgroundColor: theme.colors.secondary + "10" }
      ]} 
      onPress={() => {
        if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.secondary + "40"} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header with Close button */}
        <View style={styles.headerInfo}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Customize Your Experience</Text>
            <Pressable 
              onPress={() => {
                if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] }
              ]}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <Text style={styles.headerSubtitle}>Personalize notifications, appearance, and audio for your daily routine.</Text>
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.group}>
          {renderSwitchRow("notifications-outline", "Task Reminders", settings.notifications.taskReminders, () => toggleNotification("taskReminders"))}
          {renderSwitchRow("calendar-outline", "Daily Summary", settings.notifications.dailySummary, () => toggleNotification("dailySummary"))}
          {renderSwitchRow("trophy-outline", "Achievements", settings.notifications.achievements, () => toggleNotification("achievements"))}
          {renderSwitchRow("newspaper-outline", "News & Updates", settings.notifications.news, () => toggleNotification("news"), true)}
        </View>

        {/* Sound & Haptics Section */}
        <Text style={styles.sectionTitle}>Interaction</Text>
        <View style={styles.group}>
          {renderPressableRow("color-palette-outline", "Appearance & Themes", () => setShowThemeModal(true))}
          {renderSwitchRow("finger-print-outline", "Haptic Feedback", settings.hapticsEnabled, handleToggleHaptics, true)}
        </View>

        {/* Music Section */}
        <Text style={styles.sectionTitle}>Focus Music</Text>
        <View style={styles.group}>
          {renderPressableRow(
            settings.musicPreference === 0 ? "volume-mute-outline" : "musical-notes-outline", 
            settings.musicPreference === 0 ? "None" : (SONG_LIST.find(s => s.id === settings.musicPreference)?.title || "Select Music"), 
            () => setShowMusicModal(true),
            true
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <ThemeSelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentTheme={theme}
        activeThemeName={themeName}
        isDarkMode={isDarkMode}
        onToggleDarkMode={setIsDarkMode}
        isAutoTheme={isAutoTheme}
        onToggleAutoTheme={setIsAutoTheme}
        onSelectTheme={setThemeName}
      />
      <MusicSelectionModal
        visible={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        currentTheme={theme}
        activeSongId={settings.musicPreference}
        onSelectSong={handleSongSelect}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerInfo: {
    marginBottom: 32,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.secondary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
    opacity: 0.6,
  },
  group: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: theme.colors.secondary + "15",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.secondary + "20",
  },
  activeRow: {
    backgroundColor: theme.colors.primary + "05",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
