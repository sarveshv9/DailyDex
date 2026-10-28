/**
 * constants/themeRegistry.ts
 *
 * Single source of truth for preset theme accents.
 * Adding a Pokémon theme is a one-line entry.
 *
 * CRITICAL: Zero imports from react-native, expo, or stores.
 */

export interface ThemePresetConfig {
  accent: string;
  label: string;
  pokemonId?: number;
  description?: string;
}

export const THEME_ACCENTS: Record<string, ThemePresetConfig> = {
  pokeball: {
    accent: "#FF4D6D",
    label: "Classic Pokéball",
    pokemonId: 100,
    description: "Vibrant Coral Rose",
  },
  pikachu: {
    accent: "#F59E0B",
    label: "Pikachu",
    pokemonId: 25,
    description: "Electric energy",
  },
  squirtle: {
    accent: "#0284C7",
    label: "Squirtle",
    pokemonId: 7,
    description: "Cool azure vibes",
  },
  bulbasaur: {
    accent: "#10B981",
    label: "Bulbasaur",
    pokemonId: 1,
    description: "Fresh emerald",
  },
  gengar: {
    accent: "#8B5CF6",
    label: "Gengar",
    pokemonId: 94,
    description: "Electric violet",
  },
  charizard: {
    accent: "#F97316",
    label: "Charizard",
    pokemonId: 6,
    description: "Radiant flame",
  },
} as const;

export type PresetThemeName = keyof typeof THEME_ACCENTS;
export type ThemeName = PresetThemeName | string;

export const themeNames = Object.keys(THEME_ACCENTS) as PresetThemeName[];
export const DEFAULT_THEME_NAME: PresetThemeName = "pokeball";
