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
    accent: "#FF3B3B",
    label: "Classic Pokéball",
    pokemonId: 100,
    description: "Vibrant Crimson Red",
  },
  pikachu: {
    accent: "#FFB800",
    label: "Pikachu",
    pokemonId: 25,
    description: "Electric energy",
  },
  squirtle: {
    accent: "#1E9BFF",
    label: "Squirtle",
    pokemonId: 7,
    description: "Cool azure vibes",
  },
  bulbasaur: {
    accent: "#1FCB8A",
    label: "Bulbasaur",
    pokemonId: 1,
    description: "Fresh emerald",
  },
  gengar: {
    accent: "#9B5CFF",
    label: "Gengar",
    pokemonId: 94,
    description: "Electric violet",
  },
  charizard: {
    accent: "#FF7A1A",
    label: "Charizard",
    pokemonId: 6,
    description: "Radiant flame",
  },
} as const;

export type PresetThemeName = keyof typeof THEME_ACCENTS;
export type ThemeName = PresetThemeName | string;

export const themeNames = Object.keys(THEME_ACCENTS) as PresetThemeName[];
export const DEFAULT_THEME_NAME: PresetThemeName = "pokeball";
