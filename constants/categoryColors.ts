/**
 * constants/categoryColors.ts
 *
 * Single source of truth for routine and task category colors.
 * Keeps vibrant, distinctive hues while avoiding muddy clusters.
 *
 * CRITICAL: Zero imports from react-native, expo, or stores.
 */

export type CategoryKey =
  | "wakeup"
  | "sleep"
  | "water"
  | "tea_journal"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "study"
  | "reflect"
  | "walk"
  | "breathe"
  | "yoga"
  | "prepare_sleep"
  | "commute"
  | "gym"
  | "cleaning"
  | "pet"
  | "shopping"
  | "coding"
  | "gaming"
  | "finances"
  | "laundry"
  | "travel"
  | "health"
  | "podcast";

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  wakeup: "#FF9330",
  sleep: "#5B8DFF",
  water: "#1FC8EA",
  tea_journal: "#FFA51F",
  breakfast: "#FF8040",
  lunch: "#FF8040",
  dinner: "#FF8040",
  study: "#6B6FFF",
  reflect: "#6B6FFF",
  walk: "#1FCB8A",
  breathe: "#1FCB8A",
  yoga: "#7FD01F",
  prepare_sleep: "#7088B0",
  commute: "#12B8D0",
  gym: "#FF4D2E",
  cleaning: "#14C4AE",
  pet: "#FFB82E",
  shopping: "#FF4F7B",
  coding: "#1FA2FF",
  gaming: "#A055FF",
  finances: "#20B864",
  laundry: "#3DD6F0",
  travel: "#1488F0",
  health: "#FF4DA6",
  podcast: "#DD55F5",
};

/** Deeper variations for bright colors to hold up on pure white in light mode */
export const CATEGORY_COLORS_LIGHT: Partial<Record<CategoryKey, string>> = {
  pet: "#F5A800",
  tea_journal: "#F09400",
  wakeup: "#FF8A1F",
  yoga: "#6DB812",
  laundry: "#22BDDC",
};

export const FALLBACK_CATEGORY_COLORS = [
  "#7B8CDE",
  "#C084FC",
  "#4DA8DA",
  "#6BCB77",
  "#E8975E",
  "#B89B72",
] as const;

export function getCategoryColor(
  categoryKey?: string | null,
  isDark: boolean = true
): string | undefined {
  if (!categoryKey) return undefined;
  if (!isDark && categoryKey in CATEGORY_COLORS_LIGHT) {
    return CATEGORY_COLORS_LIGHT[categoryKey as CategoryKey];
  }
  return (CATEGORY_COLORS as Record<string, string>)[categoryKey];
}
