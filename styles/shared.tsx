// styles/shared.tsx
import React, { useMemo } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

import { themeTokens } from "../constants/themeTokens";

export { themeTokens };

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;          // Cards and modal backgrounds
    text: string;          // Main text (formerly used primary/secondary interchangeably)
    textSecondary: string; // Subtext
    white: string;         // Pure white for absolute contrast (e.g. primary buttons)
  };
  glows: {
    primary: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  glass: {
    cardBg: string;        // Semi-transparent card background
    borderColor: string;   // Subtle glass border
    shadowOpacity: number; // Soft shadow for floaty feel
    iconTintAlpha: string; // Hex alpha appended to primary for icon tiles / active tab (e.g. "1C")
    neutralFill: string;   // Quiet fill for chips and inactive icon tiles
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  icons: {
    stroke: number; // one stroke weight for every icon in the app
    sm: number;
    md: number;
    lg: number;
  };
}

const baseTheme = {
  fonts: {
    regular: themeTokens.fonts.family.regular,
    medium: themeTokens.fonts.family.medium,
    bold: themeTokens.fonts.family.bold,
  },
  spacing: {
    xs: themeTokens.spacing.xs,
    sm: themeTokens.spacing.sm,
    md: themeTokens.spacing.md,
    lg: themeTokens.spacing.lg,
    xl: themeTokens.spacing.xl,
  },
  borderRadius: {
    sm: themeTokens.borderRadius.sm,
    md: themeTokens.borderRadius.md,
    lg: themeTokens.borderRadius.lg,
  },
  icons: {
    stroke: themeTokens.icons.stroke,
    sm: themeTokens.icons.sm,
    md: themeTokens.icons.md,
    lg: themeTokens.icons.lg,
  },
};

const lightGlass = {
  cardBg: themeTokens.glass.light.cardBg,
  borderColor: themeTokens.glass.light.borderColor,
  shadowOpacity: themeTokens.glass.light.shadowOpacity,
  iconTintAlpha: themeTokens.glass.light.iconTintAlpha,
  neutralFill: themeTokens.glass.light.neutralFill,
};

const darkGlass = {
  cardBg: themeTokens.glass.dark.cardBg,
  borderColor: themeTokens.glass.dark.borderColor,
  shadowOpacity: themeTokens.glass.dark.shadowOpacity,
  iconTintAlpha: themeTokens.glass.dark.iconTintAlpha,
  neutralFill: themeTokens.glass.dark.neutralFill,
};

// --- GLOW UTILS ---
const createGlows = (primaryColor: string, isDark: boolean) => ({
  primary: {
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: isDark ? 4 : 4 },
    shadowOpacity: isDark ? 0.6 : 0.4,
    shadowRadius: isDark ? 16 : 8,
    elevation: isDark ? 16 : 8,
  },
  card: {
    shadowColor: isDark ? primaryColor : "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.15 : 0.08,
    shadowRadius: isDark ? 12 : 12,
    elevation: isDark ? 4 : 4,
  }
});

// --- LIGHT VARIATIONS ---
// Light versions use pure white backgrounds, subtle tinted cards, and strict Pokemon brand accent colors.
export const lightThemes: Record<string, Theme> = {
  pokeball: { ...baseTheme, glass: lightGlass, glows: createGlows("#FF3333", false), colors: { primary: "#FF3333", secondary: "#1A1A1A", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  pikachu: { ...baseTheme, glass: lightGlass, glows: createGlows("#EAB308", false), colors: { primary: "#EAB308", secondary: "#A16207", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  squirtle: { ...baseTheme, glass: lightGlass, glows: createGlows("#0EA5E9", false), colors: { primary: "#0EA5E9", secondary: "#0369A1", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  bulbasaur: { ...baseTheme, glass: lightGlass, glows: createGlows("#10B981", false), colors: { primary: "#10B981", secondary: "#047857", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  gengar: { ...baseTheme, glass: lightGlass, glows: createGlows("#A855F7", false), colors: { primary: "#A855F7", secondary: "#7E22CE", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  charizard: { ...baseTheme, glass: lightGlass, glows: createGlows("#F97316", false), colors: { primary: "#F97316", secondary: "#C2410C", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
};

// --- DARK VARIATIONS ---
// Dark versions use deep black backgrounds, subtle dark card overlays, bright popped primary accents,
// and off-white text.
export const darkThemes: Record<string, Theme> = {
  pokeball: { ...baseTheme, glass: darkGlass, glows: createGlows("#FF3333", true), colors: { primary: "#FF3333", secondary: "#F2F2F2", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#FFFFFF" } },
  pikachu: { ...baseTheme, glass: darkGlass, glows: createGlows("#FDE047", true), colors: { primary: "#FDE047", secondary: "#F59E0B", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#000000" } },
  squirtle: { ...baseTheme, glass: darkGlass, glows: createGlows("#7DD3FC", true), colors: { primary: "#7DD3FC", secondary: "#0EA5E9", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#FFFFFF" } },
  bulbasaur: { ...baseTheme, glass: darkGlass, glows: createGlows("#6EE7B7", true), colors: { primary: "#6EE7B7", secondary: "#10B981", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#064E3B" } },
  gengar: { ...baseTheme, glass: darkGlass, glows: createGlows("#D8B4FE", true), colors: { primary: "#D8B4FE", secondary: "#A855F7", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#FFFFFF" } },
  charizard: { ...baseTheme, glass: darkGlass, glows: createGlows("#FDBA74", true), colors: { primary: "#FDBA74", secondary: "#F97316", background: "#000000", card: "#121212", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#FFFFFF" } },
};

// Aliasing themes for backward compatibility, although they should be avoided going forward.
export const themes = { ...lightThemes };

export type ThemeName = string;

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
    primaryButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 48, ...theme.glows.primary },
    primaryButtonText: { color: theme.colors.white, fontSize: 16, fontFamily: theme.fonts.bold, textAlign: "center" },
    secondaryButton: { backgroundColor: theme.glass.neutralFill, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 48, borderWidth: 1, borderColor: theme.glass.borderColor },
    secondaryButtonText: { color: theme.colors.text, fontSize: 16, fontFamily: theme.fonts.medium, textAlign: "center" },
    ghostButton: { backgroundColor: "transparent", paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, alignItems: "center", justifyContent: "center", minHeight: 44 },
    ghostButtonText: { color: theme.colors.primary, fontSize: 14, fontFamily: theme.fonts.medium, textAlign: "center" },
    destructiveButton: { backgroundColor: `${theme.colors.primary}15`, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 48, borderWidth: 1, borderColor: `${theme.colors.primary}30` },
    destructiveButtonText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.fonts.bold, textAlign: "center" },
    glassCard: {
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      borderRadius: theme.borderRadius.lg,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: theme.glows.card.shadowOffset,
          shadowOpacity: theme.glows.card.shadowOpacity,
          shadowRadius: theme.glows.card.shadowRadius,
        },
        android: {
          elevation: theme.glows.card.elevation,
        },
        web: {
          boxShadow: `0px ${theme.glows.card.shadowOffset.height}px ${theme.glows.card.shadowRadius}px rgba(0, 0, 0, ${theme.glows.card.shadowOpacity})`,
        },
      }),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    modalContent: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg + 8,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      padding: theme.spacing.xl,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.glows.card.shadowOpacity * 1.5,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
        web: {
          boxShadow: `0px 8px 24px rgba(0, 0, 0, ${theme.glows.card.shadowOpacity * 1.5})`,
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
      backgroundColor: theme.glass.neutralFill,
      alignItems: "center",
      justifyContent: "center",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${theme.colors.textSecondary}40`,
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
      backgroundColor: `${theme.colors.secondary}0A`,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}15`,
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
      backgroundColor: theme.glass.neutralFill,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
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
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}15`,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}${theme.glass.iconTintAlpha}`,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${theme.colors.secondary}20`,
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
/*  Every component takes `theme` as a prop so this file doesn't      */
/*  depend on how your app provides themes. Swap in your own hook     */
/*  if you prefer: const theme = useAppTheme();                       */
/* ------------------------------------------------------------------ */

type ThemeProps = { theme: Theme };

/** Primary color at a given hex alpha. Works because all primaries are 6-digit hex. */
const tint = (theme: Theme) => `${theme.colors.primary}${theme.glass.iconTintAlpha}`;

/** The only container used for icons: rounded square, tinted primary fill. */
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
        backgroundColor: active ? tint(theme) : theme.glass.neutralFill,
      }}
    >
      <Icon
        size={theme.icons.lg}
        strokeWidth={theme.icons.stroke}
        color={active ? theme.colors.primary : theme.colors.textSecondary}
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
        backgroundColor: theme.glass.neutralFill,
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
        <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.primary }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: theme.glass.neutralFill }}>
        <View style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 3, backgroundColor: colors.primary }} />
      </View>

      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        style={[shared.primaryButton, { marginTop: spacing.lg, borderRadius: 999, flexDirection: "row", gap: spacing.sm }]}
      >
        <Text style={shared.primaryButtonText}>{buttonText}</Text>
        <ArrowRight size={theme.icons.md} strokeWidth={theme.icons.stroke} color={colors.white} />
      </Pressable>

      <Pressable onPress={onTimeline} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.primary }}>
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
          backgroundColor: theme.glass.neutralFill,
          borderWidth: 1,
          borderColor: theme.glass.borderColor,
        }}
      >
        <Clock size={12} strokeWidth={theme.icons.stroke} color={colors.primary} />
        <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.primary }}>
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
              color={on ? theme.colors.primary : theme.colors.textSecondary}
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
        {/* Plain glyph, no tile: decoration, not an action */}
        <MoonStar size={theme.icons.md} strokeWidth={theme.icons.stroke} color={colors.textSecondary} />
      </View>

      <Text style={label}>Current focus</Text>
      <FocusCard
        theme={theme}
        title="Next: Sleep"
        startsAt="10:30 PM"
        duration="30m"
        progress={0}
        onStart={() => {}}
        onTimeline={() => {}}
      />

      <Text style={label}>Up next</Text>
      <UpNextRow theme={theme} title="Sleep" time="10:30 PM" duration="30m" onPlay={() => {}} />

      <View style={{ flex: 1 }} />
      <BottomNav theme={theme} active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}
