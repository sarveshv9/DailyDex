/**
 * constants/themeRegistry.ts
 *
 * Single source of truth for preset theme accents.
 * Adding a Pokémon theme is a one-line entry.
 *
 * CRITICAL: Zero imports from react-native, expo, or stores.
 */

export type ThemeMode = 'light' | 'dark';

export interface DualColorToken {
  dark: string;
  light: string;
}

export const POKEMON_THEMES = {
  pokeball: { dark: '#FF4036', light: '#FF1D1D' },
  pikachu: { dark: '#F5B731', light: '#FFBF00' },
  squirtle: { dark: '#48B8E8', light: '#00A6FF' },
  bulbasaur: { dark: '#3CC88E', light: '#008559' },
  gengar: { dark: '#9D7FEA', light: '#8040CC' },
  charizard: { dark: '#FF6928', light: '#FF5500' },
  snorlax: { dark: '#5CA4A9', light: '#007A87' },
} as const satisfies Record<string, DualColorToken>;

export interface ThemePresetConfig {
  accent: string;
  lightAccent?: string;
  label: string;
  pokemonId?: number;
  description?: string;
}

export const THEME_ACCENTS: Record<string, ThemePresetConfig> = {
  pokeball: {
    accent: POKEMON_THEMES.pokeball.dark,
    lightAccent: POKEMON_THEMES.pokeball.light,
    label: "Classic Pokéball",
    pokemonId: 100,
    description: "Vibrant Crimson Red",
  },
  pikachu: {
    accent: POKEMON_THEMES.pikachu.dark,
    lightAccent: POKEMON_THEMES.pikachu.light,
    label: "Pikachu",
    pokemonId: 25,
    description: "Electric energy",
  },
  squirtle: {
    accent: POKEMON_THEMES.squirtle.dark,
    lightAccent: POKEMON_THEMES.squirtle.light,
    label: "Squirtle",
    pokemonId: 7,
    description: "Cool azure vibes",
  },
  bulbasaur: {
    accent: POKEMON_THEMES.bulbasaur.dark,
    lightAccent: POKEMON_THEMES.bulbasaur.light,
    label: "Bulbasaur",
    pokemonId: 1,
    description: "Fresh emerald",
  },
  gengar: {
    accent: POKEMON_THEMES.gengar.dark,
    lightAccent: POKEMON_THEMES.gengar.light,
    label: "Gengar",
    pokemonId: 94,
    description: "Electric violet",
  },
  charizard: {
    accent: POKEMON_THEMES.charizard.dark,
    lightAccent: POKEMON_THEMES.charizard.light,
    label: "Charizard",
    pokemonId: 6,
    description: "Radiant flame",
  },
  snorlax: {
    accent: POKEMON_THEMES.snorlax.dark,
    lightAccent: POKEMON_THEMES.snorlax.light,
    label: "Snorlax",
    pokemonId: 143,
    description: "Calm deep teal",
  },
} as const;

export type PresetThemeName = keyof typeof THEME_ACCENTS;
export type ThemeName = PresetThemeName | string;

export const themeNames = Object.keys(THEME_ACCENTS) as PresetThemeName[];
export const DEFAULT_THEME_NAME: PresetThemeName = "pokeball";
