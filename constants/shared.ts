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
  cardBg: "rgba(255, 255, 255, 0.62)",
  borderColor: "rgba(255, 255, 255, 0.45)",
  shadowOpacity: 0.06,
};

const darkGlass = {
  cardBg: "rgba(30, 30, 30, 0.55)",
  borderColor: "rgba(255, 255, 255, 0.10)",
  shadowOpacity: 0.15,
};

// --- LIGHT VARIATIONS ---
// Light versions have tinted bright backgrounds, vibrant pokemon brand colors,
// and dark text for contrast.
export const lightThemes: Record<string, Theme> = {
  default: { ...baseTheme, glass: lightGlass, colors: { primary: "#FF4D4D", secondary: "#2D2D2D", background: "#FFFFFF", card: "#F8F8F8", text: "#1A1A1A", textSecondary: "#666666", white: "#FFFFFF" } },
  dark: { ...baseTheme, glass: lightGlass, colors: { primary: "#E5E7EB", secondary: "#9CA3AF", background: "#0F172A", card: "#1E293B", text: "#F9FAFB", textSecondary: "#D1D5DB", white: "#FFFFFF" } },
  pikachu: { ...baseTheme, glass: lightGlass, colors: { primary: "#D97706", secondary: "#B45309", background: "#FEF9C3", card: "#FFFFFF", text: "#451A03", textSecondary: "#78350F", white: "#FFFFFF" } },
  squirtle: { ...baseTheme, glass: lightGlass, colors: { primary: "#0284C7", secondary: "#0369A1", background: "#E0F2FE", card: "#FFFFFF", text: "#0C4A6E", textSecondary: "#075985", white: "#FFFFFF" } },
  dragonite: { ...baseTheme, glass: lightGlass, colors: { primary: "#EA580C", secondary: "#C2410C", background: "#FFEDD5", card: "#FFFFFF", text: "#431407", textSecondary: "#7C2D12", white: "#FFFFFF" } },
  mew: { ...baseTheme, glass: lightGlass, colors: { primary: "#DB2777", secondary: "#BE185D", background: "#FDF2F8", card: "#FFFFFF", text: "#4C0519", textSecondary: "#831843", white: "#FFFFFF" } },
  slowpoke: { ...baseTheme, glass: lightGlass, colors: { primary: "#E11D48", secondary: "#BE123C", background: "#FFE4E6", card: "#FFFFFF", text: "#4C0519", textSecondary: "#881337", white: "#FFFFFF" } },
  psyduck: { ...baseTheme, glass: lightGlass, colors: { primary: "#CA8A04", secondary: "#A16207", background: "#FEF08A", card: "#FFFFFF", text: "#422006", textSecondary: "#713F12", white: "#FFFFFF" } },
  charizard: { ...baseTheme, glass: lightGlass, colors: { primary: "#C2410C", secondary: "#9A3412", background: "#FFE4D6", card: "#FFFFFF", text: "#431407", textSecondary: "#7C2D12", white: "#FFFFFF" } },
  bulbasaur: { ...baseTheme, glass: lightGlass, colors: { primary: "#059669", secondary: "#047857", background: "#D1FAE5", card: "#FFFFFF", text: "#022C22", textSecondary: "#064E3B", white: "#FFFFFF" } },
  meowth: { ...baseTheme, glass: lightGlass, colors: { primary: "#B45309", secondary: "#92400E", background: "#FEF3C7", card: "#FFFFFF", text: "#451A03", textSecondary: "#78350F", white: "#FFFFFF" } },
  jigglypuff: { ...baseTheme, glass: lightGlass, colors: { primary: "#DP93E5", secondary: "#2563EB", background: "#FAE8FF", card: "#FFFFFF", text: "#4A044E", textSecondary: "#701A75", white: "#FFFFFF" } },
  gengar: { ...baseTheme, glass: lightGlass, colors: { primary: "#7E22CE", secondary: "#6B21A8", background: "#F3E8FF", card: "#FFFFFF", text: "#3B0764", textSecondary: "#581C87", white: "#FFFFFF" } },
  snorlax: { ...baseTheme, glass: lightGlass, colors: { primary: "#0F766E", secondary: "#0D9488", background: "#CCFBF1", card: "#FFFFFF", text: "#042F2E", textSecondary: "#134E4A", white: "#FFFFFF" } },
};

// --- DARK VARIATIONS ---
// Dark versions have deep dark backgrounds, subtle card overlays, bright popped primary accents,
// and off-white text.
export const darkThemes: Record<string, Theme> = {
  default: { ...baseTheme, glass: darkGlass, colors: { primary: "#FF4D4D", secondary: "#F2F2F2", background: "#0A0A0A", card: "#161616", text: "#F2F2F2", textSecondary: "#A0A0A0", white: "#FFFFFF" } },
  dark: { ...baseTheme, glass: darkGlass, colors: { primary: "#6B7280", secondary: "#4B5563", background: "#030712", card: "#111827", text: "#E5E7EB", textSecondary: "#9CA3AF", white: "#FFFFFF" } },
  pikachu: { ...baseTheme, glass: darkGlass, colors: { primary: "#FBBF24", secondary: "#F59E0B", background: "#1C1917", card: "#292524", text: "#FEF3C7", textSecondary: "#FDE68A", white: "#000000" } },
  squirtle: { ...baseTheme, glass: darkGlass, colors: { primary: "#38BDF8", secondary: "#0EA5E9", background: "#082F49", card: "#0C4A6E", text: "#E0F2FE", textSecondary: "#BAE6FD", white: "#FFFFFF" } },
  dragonite: { ...baseTheme, glass: darkGlass, colors: { primary: "#FB923C", secondary: "#F97316", background: "#431407", card: "#7C2D12", text: "#FFEDD5", textSecondary: "#FDBA74", white: "#FFFFFF" } },
  mew: { ...baseTheme, glass: darkGlass, colors: { primary: "#F472B6", secondary: "#EC4899", background: "#4C0519", card: "#831843", text: "#FCE7F3", textSecondary: "#FBCFE8", white: "#FFFFFF" } },
  slowpoke: { ...baseTheme, glass: darkGlass, colors: { primary: "#FB7185", secondary: "#F43F5E", background: "#4C0519", card: "#881337", text: "#FFE4E6", textSecondary: "#FECDD3", white: "#FFFFFF" } },
  psyduck: { ...baseTheme, glass: darkGlass, colors: { primary: "#FACC15", secondary: "#EAB308", background: "#422006", card: "#713F12", text: "#FEF08A", textSecondary: "#FDE047", white: "#171717" } },
  charizard: { ...baseTheme, glass: darkGlass, colors: { primary: "#F97316", secondary: "#EA580C", background: "#431407", card: "#7C2D12", text: "#FFEDD5", textSecondary: "#FDBA74", white: "#FFFFFF" } },
  bulbasaur: { ...baseTheme, glass: darkGlass, colors: { primary: "#34D399", secondary: "#10B981", background: "#022C22", card: "#064E3B", text: "#D1FAE5", textSecondary: "#A7F3D0", white: "#064E3B" } },
  meowth: { ...baseTheme, glass: darkGlass, colors: { primary: "#F59E0B", secondary: "#D97706", background: "#451A03", card: "#78350F", text: "#FEF3C7", textSecondary: "#FDE68A", white: "#451A03" } },
  jigglypuff: { ...baseTheme, glass: darkGlass, colors: { primary: "#E879F9", secondary: "#D946EF", background: "#4A044E", card: "#701A75", text: "#FAE8FF", textSecondary: "#F5D0FE", white: "#4A044E" } },
  gengar: { ...baseTheme, glass: darkGlass, colors: { primary: "#C084FC", secondary: "#A855F7", background: "#3B0764", card: "#581C87", text: "#F3E8FF", textSecondary: "#E9D5FF", white: "#3B0764" } },
  snorlax: { ...baseTheme, glass: darkGlass, colors: { primary: "#2DD4BF", secondary: "#14B8A6", background: "#042F2E", card: "#134E4A", text: "#CCFBF1", textSecondary: "#99F6E4", white: "#042F2E" } },
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
    primaryButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 48 },
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
  });
};