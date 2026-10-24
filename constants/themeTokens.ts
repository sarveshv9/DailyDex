/**
 * Zen App Design System Tokens
 * Central repository of colors, spacing, typography, radii, icons, and timing constants.
 */

export const themeTokens = {
  colors: {
    white: "#FFFFFF",
    black: "#000000",
    gray: {
      50: "#F8F8F8",
      100: "#F5F5F7",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#CCCCCC",
      500: "#A0A0A0",
      600: "#666666",
      700: "#333333",
      800: "#2A2A2A",
      850: "#1E1E1E",
      900: "#1A1A1A",
      950: "#121212",
    },
    // Semantic status colors
    danger: "#EF4444",
    dangerDark: "#DC2626",
    dangerMuted: "#FF3333",
    warning: "#F59E0B",
    warningLight: "#FDE047",
    success: "#10B981",
    successDark: "#059669",
    info: "#0EA5E9",
    infoDark: "#0369A1",
  },

  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  fonts: {
    family: {
      regular: "UbuntuRegular",
      medium: "UbuntuMedium",
      bold: "UbuntuBold",
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      display: 28,
      hero: 34,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  icons: {
    stroke: 1.75,
    xs: 14,
    sm: 16,
    md: 20,
    lg: 22,
    xl: 28,
  },

  glass: {
    light: {
      cardBg: "rgba(239, 239, 239, 0.76)",
      borderColor: "rgba(255, 255, 255, 0.45)",
      shadowOpacity: 0.06,
      iconTintAlpha: "1C", // ~11% of primary
      neutralFill: "rgba(0, 0, 0, 0.06)",
    },
    dark: {
      cardBg: "rgba(30, 30, 30, 0.55)",
      borderColor: "rgba(255, 255, 255, 0.10)",
      shadowOpacity: 0.15,
      iconTintAlpha: "29", // ~16% of primary
      neutralFill: "rgba(255, 255, 255, 0.08)",
    },
  },

  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

export type ThemeTokens = typeof themeTokens;
