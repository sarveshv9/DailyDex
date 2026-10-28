/**
 * constants/themeGenerator.ts
 *
 * Theme GENERATOR:
 * Given an accent hex and a mode ('light' | 'dark'), produces a complete,
 * contrast-guaranteed, readably flat Theme object.
 *
 * CRITICAL: Zero imports from react-native, expo, or stores.
 * Must run cleanly in plain Node.js / tsx environments.
 */

import { themeTokens } from "./themeTokens";
import {
  blendOpaque,
  clampForContrast,
  deriveOnPrimary,
  derivePrimaryText,
  normalizeHex,
  scaleChroma,
} from "../utils/color";

export interface ThemeColors {
  // New primary / accent tokens
  primary: string;
  onPrimary: string;
  primarySoft: string;
  primaryText: string;

  // Theme-independent neutrals per mode
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  divider: string;
  text: string;
  textSecondary: string;
  scrim: string;

  // Semantic status
  danger: string;
  dangerSoft: string;
  dangerText: string;
  warning: string;
  warningText: string;
  success: string;
  successText: string;
  info: string;
  infoText: string;
}

export interface ThemeGlass {
  cardBg: string;
  borderColor: string;
  shadowOpacity: number;
  iconTintAlpha: string;
  neutralFill: string;
}

export interface GeneratedTheme {
  isDarkMode: boolean;
  accentInput: string;
  wasAdjusted: boolean;
  colors: ThemeColors;
  glass: ThemeGlass;
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
    stroke: number;
    sm: number;
    md: number;
    lg: number;
  };
}

// Global memoization cache: `${accentHex}|${mode}` -> GeneratedTheme
const themeCache = new Map<string, GeneratedTheme>();

// Track warned accents to warn only once in development
const warnedAccents = new Set<string>();

export function createTheme(
  rawAccentHex: string,
  mode: "light" | "dark"
): GeneratedTheme {
  const normAccent = normalizeHex(rawAccentHex);
  const cacheKey = `${normAccent}|${mode}`;

  const cached = themeCache.get(cacheKey);
  if (cached) return cached;

  const isDark = mode === "dark";

  // 1. NEUTRALS: Independent of theme per mode (OLED Black seamless dark theme)
  const background = isDark ? themeTokens.colors.black : themeTokens.colors.white;
  const surface = isDark ? themeTokens.colors.black : themeTokens.colors.gray[50];
  const surfaceMuted = isDark ? "#0A0A0D" : themeTokens.colors.gray[200];
  const border = isDark ? "#1C1C22" : themeTokens.colors.gray[300];
  const divider = isDark ? "#16161B" : themeTokens.colors.gray[200];
  const text = isDark ? "#FFFFFF" : themeTokens.colors.gray[900];
  const textSecondary = isDark ? "#8E8E98" : themeTokens.colors.gray[600];
  const scrim = isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.45)";

  const danger = isDark ? themeTokens.colors.danger : themeTokens.colors.dangerDark;
  const dangerSoft = isDark ? themeTokens.colors.dangerSoftDark : themeTokens.colors.dangerSoftLight;
  const dangerText = isDark ? themeTokens.colors.danger : themeTokens.colors.dangerDark;

  const warning = themeTokens.colors.warning;
  const warningText = isDark ? themeTokens.colors.warning : themeTokens.colors.warningDark;

  const success = themeTokens.colors.success;
  const successText = isDark ? themeTokens.colors.success : themeTokens.colors.successDark;

  const info = themeTokens.colors.info;
  const infoText = isDark ? themeTokens.colors.info : themeTokens.colors.infoDark;

  // 2. ACCENT DERIVATION
  // Filled buttons already get a legible label via onPrimary (>= 4.5:1),
  // and accent-as-text is protected separately by primaryText (>= 4.5:1).
  // Lowering only the fill target in light mode is a deliberate vibrancy trade-off.
  // Do NOT lower the primaryText or onPrimary thresholds.
  const tunedAccent = isDark ? scaleChroma(normAccent, 0.9) : normAccent;
  const fillMinContrast = isDark ? 3.0 : 2.0;
  const clamped = clampForContrast(tunedAccent, background, fillMinContrast, mode);
  const primary = clamped.hex;
  const wasAdjusted = clamped.wasAdjusted;

  if (
    wasAdjusted &&
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    !warnedAccents.has(cacheKey)
  ) {
    warnedAccents.add(cacheKey);
    console.warn(
      `[ZenThemeGenerator] Accent ${normAccent} adjusted to ${primary} in ${mode} mode for WCAG readability.`
    );
  }

  // onPrimary: high contrast text on primary fill (>= 4.5:1)
  const onPrimary = deriveOnPrimary(primary);

  // primarySoft: Opaque blend over surface (12% light, 18% dark)
  const primarySoft = blendOpaque(primary, surface, isDark ? 0.18 : 0.12);

  // primaryText: Accent used as text/icons (>= 4.5:1 on surface, primarySoft, background)
  const primaryText = derivePrimaryText(primary, surface, primarySoft, background, mode);

  // 3. FLAT SURFACE CONFIG (maintained as glass interface for backwards compatibility)
  const glassTokens = isDark ? themeTokens.glass.dark : themeTokens.glass.light;
  const glass: ThemeGlass = {
    cardBg: surface,
    borderColor: border,
    shadowOpacity: 0,
    iconTintAlpha: glassTokens.iconTintAlpha,
    neutralFill: surfaceMuted,
  };

  const theme: GeneratedTheme = {
    isDarkMode: isDark,
    accentInput: normAccent,
    wasAdjusted,
    colors: {
      primary,
      onPrimary,
      primarySoft,
      primaryText,
      background,
      surface,
      surfaceMuted,
      border,
      divider,
      text,
      textSecondary,
      scrim,
      danger,
      dangerSoft,
      dangerText,
      warning,
      warningText,
      success,
      successText,
      info,
      infoText,
    },
    glass,
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

  themeCache.set(cacheKey, theme);
  return theme;
}

/** Clear generator cache (e.g. for testing) */
export function _clearThemeCache(): void {
  themeCache.clear();
  warnedAccents.clear();
}
