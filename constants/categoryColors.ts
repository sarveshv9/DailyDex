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
  wakeup: "#FF9E42",
  sleep: "#5B8DEF",
  water: "#22D3EE",
  tea_journal: "#F59E0B",
  breakfast: "#FB923C",
  lunch: "#FB923C",
  dinner: "#FB923C",
  study: "#6366F1",
  reflect: "#6366F1",
  walk: "#10B981",
  breathe: "#10B981",
  yoga: "#84CC16",
  prepare_sleep: "#64748B",
  commute: "#06B6D4",
  gym: "#FF5722",
  cleaning: "#14B8A6",
  pet: "#FBBF24",
  shopping: "#F43F5E",
  coding: "#0EA5E9",
  gaming: "#9333EA",
  finances: "#15803D",
  laundry: "#67E8F9",
  travel: "#0284C7",
  health: "#EC4899",
  podcast: "#D946EF",
};

export const FALLBACK_CATEGORY_COLORS = [
  "#7B8CDE",
  "#C084FC",
  "#4DA8DA",
  "#6BCB77",
  "#E8975E",
  "#B89B72",
] as const;

export function getCategoryColor(categoryKey?: string | null): string | undefined {
  if (!categoryKey) return undefined;
  return (CATEGORY_COLORS as Record<string, string>)[categoryKey];
}
