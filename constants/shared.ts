// styles/shared.ts
import { Platform, StyleSheet } from "react-native";

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
}

const baseTheme = {
  fonts: {
    regular: "UbuntuRegular",
    medium: "UbuntuMedium",
    bold: "UbuntuBold",
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  borderRadius: { sm: 8, md: 12, lg: 16 },
};

const lightGlass = {
  cardBg: "rgba(239, 239, 239, 0.76)",
  borderColor: "rgba(255, 255, 255, 0.45)",
  shadowOpacity: 0.06,
};

const darkGlass = {
  cardBg: "rgba(30, 30, 30, 0.55)",
  borderColor: "rgba(255, 255, 255, 0.10)",
  shadowOpacity: 0.15,
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
  });
};
