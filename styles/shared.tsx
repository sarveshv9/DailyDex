// styles/shared.tsx
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Home,
  Moon,
  MoonStar,
  User,
  type LucideIcon,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themeTokens } from "../constants/themeTokens";
import {
  createTheme,
  GeneratedTheme,
  ThemeColors,
  ThemeGlass,
} from "../constants/themeGenerator";
import {
  DEFAULT_THEME_NAME,
  THEME_ACCENTS,
  ThemeName,
  themeNames,
} from "../constants/themeRegistry";

export { themeTokens, createTheme, THEME_ACCENTS, themeNames, DEFAULT_THEME_NAME };
export type { ThemeName };

export type Theme = GeneratedTheme;
export type { ThemeColors, ThemeGlass };

// --- LIGHT & DARK THEME PRESET REGISTRIES (Dynamic from THEME_ACCENTS) ---
export const lightThemes: Record<string, Theme> = Object.fromEntries(
  Object.entries(THEME_ACCENTS).map(([key, config]) => [
    key,
    createTheme(config.accent, "light"),
  ])
);

export const darkThemes: Record<string, Theme> = Object.fromEntries(
  Object.entries(THEME_ACCENTS).map(([key, config]) => [
    key,
    createTheme(config.accent, "dark"),
  ])
);

// Backward-compatibility alias
export const themes: Record<string, Theme> = { ...lightThemes };

export const getSharedStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: { flex: 1, width: "100%", height: "100%", backgroundColor: theme.colors.background },
    safeArea: { flex: 1, width: "100%", height: "100%", backgroundColor: theme.colors.background },
    centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
    heading: { fontSize: 28, fontFamily: theme.fonts.bold, color: theme.colors.text, textAlign: "center" },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: theme.colors.text },
    statsRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    primaryButtonText: { color: theme.colors.onPrimary, fontSize: 16, fontFamily: theme.fonts.bold, textAlign: "center" },
    secondaryButton: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: { color: theme.colors.text, fontSize: 16, fontFamily: theme.fonts.medium, textAlign: "center" },
    ghostButton: { backgroundColor: "transparent", paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, alignItems: "center", justifyContent: "center", minHeight: 44 },
    ghostButtonText: { color: theme.colors.primaryText, fontSize: 14, fontFamily: theme.fonts.medium, textAlign: "center" },
    destructiveButton: {
      backgroundColor: theme.colors.dangerSoft,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    destructiveButtonText: { color: theme.colors.danger, fontSize: 16, fontFamily: theme.fonts.bold, textAlign: "center" },
    glassCard: {
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      borderRadius: theme.borderRadius.lg,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDarkMode ? 0.2 : 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: `0px 2px 8px rgba(0, 0, 0, ${theme.isDarkMode ? 0.2 : 0.06})`,
        },
      }),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.scrim,
    },
    modalContent: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg + 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
        web: {
          boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
        },
      }),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: "center",
      marginBottom: theme.spacing.sm,
    },
    inputContainer: {
      marginBottom: theme.spacing.md,
      width: "100%",
    },
    inputLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
    },
    textInput: {
      flex: 1,
      height: 48,
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipTextActive: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fonts.bold,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.primarySoft,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primaryText,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.divider,
      width: "100%",
    },
    bodyText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    subtext: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    settingItemText: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    settingItemSubtext: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
    },
  });
};

/* ------------------------------------------------------------------ */
/*  ICON SYSTEM + HOME SCREEN COMPONENTS                               */
/* ------------------------------------------------------------------ */

type ThemeProps = { theme: Theme };

/** Opaque soft primary color for icon tiles and pills */
const tint = (theme: Theme) => theme.colors.primarySoft;

/** The container used for icons: rounded square, tinted primary soft fill. */
export function IconTile({
  theme,
  icon: Icon,
  size = 40,
  active = true,
}: ThemeProps & { icon: LucideIcon; size?: number; active?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? tint(theme) : theme.colors.surfaceMuted,
      }}
    >
      <Icon
        size={theme.icons.lg}
        strokeWidth={theme.icons.stroke}
        color={active ? theme.colors.primaryText : theme.colors.textSecondary}
      />
    </View>
  );
}

export function Chip({ theme, label, withClock }: ThemeProps & { label: string; withClock?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      {withClock && (
        <Clock size={13} strokeWidth={theme.icons.stroke} color={theme.colors.textSecondary} />
      )}
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

export function FocusCard({
  theme,
  icon: Icon = Moon,
  title,
  startsAt,
  duration,
  progress,
  buttonText = "Start my day",
  onStart,
  onTimeline,
}: ThemeProps & {
  icon?: LucideIcon;
  title: string;
  startsAt: string;
  duration: string;
  progress: number; // 0..1
  buttonText?: string;
  onStart: () => void;
  onTimeline: () => void;
}) {
  const shared = useMemo(() => getSharedStyles(theme), [theme]);
  const { colors, fonts, spacing } = theme;

  return (
    <View style={[shared.glassCard, { padding: spacing.lg }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <IconTile theme={theme} icon={Icon} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: colors.text }}>{title}</Text>
          <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary }}>
            Starts at {startsAt}
          </Text>
        </View>
        <Chip theme={theme} label={duration} withClock />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: 6 }}>
        <Text style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.medium, color: colors.textSecondary }}>
          Progress
        </Text>
        <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.primaryText }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: colors.surfaceMuted }}>
        <View style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 3, backgroundColor: colors.primary }} />
      </View>

      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        style={[shared.primaryButton, { marginTop: spacing.lg, borderRadius: 999, flexDirection: "row", gap: spacing.sm }]}
      >
        <Text style={shared.primaryButtonText}>{buttonText}</Text>
        <ArrowRight size={theme.icons.md} strokeWidth={theme.icons.stroke} color={colors.onPrimary} />
      </Pressable>

      <Pressable onPress={onTimeline} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.primaryText }}>
          View full day timeline
        </Text>
      </Pressable>
    </View>
  );
}

export function UpNextRow({
  theme,
  icon: Icon = Moon,
  title,
  time,
  duration,
  onPress,
  onPlay,
}: ThemeProps & {
  icon?: LucideIcon;
  title: string;
  time: string;
  duration: string;
  onPress?: () => void;
  onPlay?: () => void;
}) {
  const shared = useMemo(() => getSharedStyles(theme), [theme]);
  const { colors, fonts, spacing } = theme;

  return (
    <Pressable
      onPress={onPress || onPlay}
      style={({ pressed }) => [
        shared.glassCard,
        {
          padding: spacing.md + 2,
          paddingHorizontal: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <IconTile theme={theme} icon={Icon} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Chip theme={theme} label={duration} withClock />
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Clock size={12} strokeWidth={theme.icons.stroke} color={colors.primaryText} />
        <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.primaryText }}>
          {time}
        </Text>
      </View>
    </Pressable>
  );
}

const TABS: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "tasks", icon: ClipboardList, label: "Tasks" },
  { key: "home", icon: Home, label: "Home" },
  { key: "profile", icon: User, label: "Profile" },
];

export function BottomNav({
  theme,
  active,
  onChange,
}: ThemeProps & { active: string; onChange: (key: string) => void }) {
  const shared = useMemo(() => getSharedStyles(theme), [theme]);

  return (
    <View
      style={[
        shared.glassCard,
        { flexDirection: "row", justifyContent: "space-around", alignItems: "center", padding: 6, borderRadius: 999 },
      ]}
    >
      {TABS.map(({ key, icon: Icon, label }) => {
        const on = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            style={{
              width: 64,
              height: 44,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? tint(theme) : "transparent",
            }}
          >
            <Icon
              size={theme.icons.lg}
              strokeWidth={theme.icons.stroke}
              color={on ? theme.colors.primaryText : theme.colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Drop-in home screen. Pass the active theme and whether it's dark (for the status bar). */
export function HomeScreen({ theme, isDark }: ThemeProps & { isDark: boolean }) {
  const [tab, setTab] = React.useState("home");
  const { colors, fonts, spacing } = theme;
  const label = {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: 10,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingBottom: spacing.md }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing.md }}>
        <View>
          <Text style={{ fontSize: 28, fontFamily: fonts.bold, color: colors.text }}>Good evening</Text>
          <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary }}>
            Tuesday, October 20 · 6:57 PM
          </Text>
        </View>
        <MoonStar size={theme.icons.md} strokeWidth={theme.icons.stroke} color={colors.textSecondary} />
      </View>

      <Text style={label}>Current focus</Text>
      <FocusCard
        theme={theme}
        title="Next: Sleep"
        startsAt="10:30 PM"
        duration="30m"
        progress={0}
        onStart={() => { }}
        onTimeline={() => { }}
      />

      <Text style={label}>Up next</Text>
      <UpNextRow theme={theme} title="Sleep" time="10:30 PM" duration="30m" onPlay={() => { }} />

      <View style={{ flex: 1 }} />
      <BottomNav theme={theme} active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}
