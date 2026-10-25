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
    accent: "#FF3333",
    label: "Classic Pokéball",
    pokemonId: 100,
    description: "Iconic Red & White",
  },
  pikachu: {
    accent: "#EAB308",
    label: "Pikachu",
    pokemonId: 25,
    description: "Electric energy",
  },
  squirtle: {
    accent: "#0EA5E9",
    label: "Squirtle",
    pokemonId: 7,
    description: "Cool blue vibes",
  },
  bulbasaur: {
    accent: "#10B981",
    label: "Bulbasaur",
    pokemonId: 1,
    description: "Fresh & natural",
  },
  gengar: {
    accent: "#A855F7",
    label: "Gengar",
    pokemonId: 94,
    description: "Spooky vibes",
  },
  charizard: {
    accent: "#F97316",
    label: "Charizard",
    pokemonId: 6,
    description: "Fire & power",
  },
} as const;

export type PresetThemeName = keyof typeof THEME_ACCENTS;
export type ThemeName = PresetThemeName | string;

export const themeNames = Object.keys(THEME_ACCENTS) as PresetThemeName[];
export const DEFAULT_THEME_NAME: PresetThemeName = "pokeball";
