import type { Theme, ThemeName } from "../styles/shared";

export type { Theme, ThemeName };

export interface CustomThemeConfig {
  pokemonId: string;
  primaryColor: string;
  name: string;
}

export interface GlowConfig {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface GlassConfig {
  cardBg: string;
  borderColor: string;
  shadowOpacity: number;
  iconTintAlpha: string;
  neutralFill: string;
}
