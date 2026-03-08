// styles/shared.ts
import { StyleSheet } from 'react-native';

// Define the structure of a theme
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    white: string;
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

// Base theme with shared styles for fonts, spacing, etc.
const baseTheme = {
  fonts: {
    regular: "UbuntuRegular",
    medium: "UbuntuMedium",
    bold: "UbuntuBold",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

// 🎨 All heavy themes
export const themes = {
  default: {
    ...baseTheme,
    colors: {
      primary: "#6C757D",
      secondary: "#495057",
      background: "#F8F9FA",
      white: "#FFFFFF",
    },
  } as Theme,

  pikachu: {
    ...baseTheme,
    colors: { primary: "#FFCC00", secondary: "#CC0000", background: "#FFF9E6", white: "#FFFFFF" },
  } as Theme,

  squirtle: {
    ...baseTheme,
    colors: { primary: "#5EB3E4", secondary: "#2C7FB8", background: "#EAF6FF", white: "#FFFFFF" },
  } as Theme,

  dragonite: {
    ...baseTheme,
    colors: { primary: "#FFAB5E", secondary: "#68C9B9", background: "#FFF6EC", white: "#FFFFFF" },
  } as Theme,

  mew: {
    ...baseTheme,
    colors: { primary: "#FB9FCF", secondary: "#EE6FA8", background: "#FFF6FB", white: "#FFFFFF" },
  } as Theme,

  slowpoke: {
    ...baseTheme,
    colors: { primary: "#FF9FB2", secondary: "#E57A8D", background: "#FFF6F8", white: "#FFFFFF" },
  } as Theme,

  psyduck: {
    ...baseTheme,
    colors: { primary: "#FFDC5E", secondary: "#8B6914", background: "#FFFBE6", white: "#FFFFFF" },
  } as Theme,

  charizard: {
    ...baseTheme,
    colors: { primary: "#F58220", secondary: "#5BBDD9", background: "#FFF4E9", white: "#FFFFFF" },
  } as Theme,

  bulbasaur: {
    ...baseTheme,
    colors: { primary: "#49D0B0", secondary: "#318C5E", background: "#F0FFF6", white: "#FFFFFF" },
  } as Theme,

  meowth: {
    ...baseTheme,
    colors: { primary: "#F2E8C6", secondary: "#8B6914", background: "#FFFBF2", white: "#FFFFFF" },
  } as Theme,

  jigglypuff: {
    ...baseTheme,
    colors: { primary: "#FFB3E6", secondary: "#5599DD", background: "#FFF6FB", white: "#FFFFFF" },
  } as Theme,

  gengar: {
    ...baseTheme,
    colors: { primary: "#705898", secondary: "#D14A7E", background: "#F7F2FF", white: "#FFFFFF" },
  } as Theme,

  snorlax: {
    ...baseTheme,
    colors: { primary: "#39697E", secondary: "#0D4F5C", background: "#F3FBFF", white: "#FFFFFF" },
  } as Theme,

  // Dark theme (added so setThemeName('dark') is valid)
  dark: {
    ...baseTheme,
    colors: { primary: "#E5E7EB", secondary: "#9CA3AF", background: "#0F172A", white: "#FFFFFF" },
  } as Theme,
};

// lightThemes map: keys like 'light-pikachu'
export const lightThemes: Record<string, Theme> = {};
const lightBackground = "#F8F9FA";
const lightSecondary = "#495057";

(Object.keys(themes) as Array<keyof typeof themes>).forEach((themeKey) => {
  if (themeKey !== 'default') {
    const heavyTheme = themes[themeKey];
    // create a light-<name> variant
    lightThemes[`light-${themeKey}`] = {
      ...baseTheme,
      colors: {
        primary: heavyTheme.colors.primary,
        secondary: lightSecondary,
        background: lightBackground,
        white: "#FFFFFF",
      },
    };
  }
});

// --- TYPE DEFINITIONS ---
type HeavyThemeName = keyof typeof themes; // includes 'dark' now
type LightThemeName = `light-${Exclude<HeavyThemeName, 'default'>}`;
export type ThemeName = HeavyThemeName | LightThemeName;

// Shared styles (with the missing keys added)
export const getSharedStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: { flex: 1, width: '100%', height: '100%', backgroundColor: theme.colors.background },
    safeArea: { flex: 1, width: '100%', height: '100%', backgroundColor: theme.colors.background },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
    heading: { fontSize: 28, fontFamily: theme.fonts.bold, color: theme.colors.primary, textAlign: 'center' },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: theme.colors.primary },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
    primaryButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.lg },
    primaryButtonText: { color: theme.colors.white, fontSize: 16, fontFamily: theme.fonts.bold, textAlign: 'center' },
  });
};