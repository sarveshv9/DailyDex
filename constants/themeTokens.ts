/**
 * Zen App Design System Tokens
 * Central repository of colors, spacing, typography, radii, icons, and timing constants.
 */

export const themeTokens = {
  colors: {
    white: "#FFFFFF",
    black: "#000000",
    ink: "#0B0B0E",
    gray: {
      50: "#F8F8F8",
      100: "#E7E7EA",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#CCCCCC",
      500: "#9A9AA3",
      600: "#666666",
      700: "#333333",
      800: "#2B2B31",
      850: "#1F1F24",
      900: "#1F1F23",
      950: "#151519",
    },
    // Semantic status colors
    danger: "#FF4545",
    dangerDark: "#B91C1C",
    dangerMuted: "#F87171",
    dangerSoftLight: "#FFE4E6",
    dangerSoftDark: "#350410",
    dangerSoft: {
      light: "#FFE4E6",
      dark: "#350410",
    },
    warning: "#FFB020",
    warningDark: "#854D0E",
    warningLight: "#FDE047",
    success: "#2FD170",
    successDark: "#166534",
    info: "#2FA8FF",
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
      cardBg: "#FFFFFF",
      borderColor: "#E0E0E0",
      shadowOpacity: 0,
      iconTintAlpha: "1C", // ~11% of primary
      neutralFill: "#EEEEEE",
    },
    dark: {
      cardBg: "#000000",
      borderColor: "#1C1C22",
      shadowOpacity: 0,
      iconTintAlpha: "29", // ~16% of primary
      neutralFill: "#0A0A0D",
    },
  },

  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

export type ThemeTokens = typeof themeTokens;
