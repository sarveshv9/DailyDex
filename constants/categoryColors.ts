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

export type ThemeMode = 'light' | 'dark';

export interface DualColorToken {
  dark: string;
  light: string;
}

export const HABIT_PALETTE = {
  wakeup: { dark: '#F4B342', light: '#FF8000' },
  sleep: { dark: '#818CF8', light: '#584EE6' },
  water: { dark: '#38BDF8', light: '#0077C2' },
  tea_journal: { dark: '#74C69D', light: '#00824D' },
  breakfast: { dark: '#FB923C', light: '#CC4C00' },
  lunch: { dark: '#7EC850', light: '#358500' },
  dinner: { dark: '#F07167', light: '#DB2E2E' },
  study: { dark: '#60A5FA', light: '#1D66E5' },
  reflect: { dark: '#C084FC', light: '#9033D6' },
  walk: { dark: '#46C97E', light: '#008542' },
  breathe: { dark: '#4CD4C0', light: '#00857A' },
  yoga: { dark: '#F48FB1', light: '#D6296E' },
  prepare_sleep: { dark: '#93A8E8', light: '#3B59D9' },
  commute: { dark: '#7FA6C4', light: '#0073A8' },
  gym: { dark: '#F87171', light: '#E01B1B' },
  cleaning: { dark: '#64C9CF', light: '#007D8A' },
  pet: { dark: '#E09F5A', light: '#BD5B00' },
  shopping: { dark: '#EC7AA0', light: '#D12462' },
  coding: { dark: '#2DD4BF', light: '#008573' },
  gaming: { dark: '#A87FFB', light: '#7231E6' },
  finances: { dark: '#52B788', light: '#00824A' },
  laundry: { dark: '#74A9F5', light: '#1A6BE0' },
  travel: { dark: '#F78C58', light: '#CC4700' },
  health: { dark: '#F46B84', light: '#DB234B' },
  podcast: { dark: '#D884E8', light: '#9E25BA' },
} as const satisfies Record<CategoryKey, DualColorToken>;

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  wakeup: HABIT_PALETTE.wakeup.dark,
  sleep: HABIT_PALETTE.sleep.dark,
  water: HABIT_PALETTE.water.dark,
  tea_journal: HABIT_PALETTE.tea_journal.dark,
  breakfast: HABIT_PALETTE.breakfast.dark,
  lunch: HABIT_PALETTE.lunch.dark,
  dinner: HABIT_PALETTE.dinner.dark,
  study: HABIT_PALETTE.study.dark,
  reflect: HABIT_PALETTE.reflect.dark,
  walk: HABIT_PALETTE.walk.dark,
  breathe: HABIT_PALETTE.breathe.dark,
  yoga: HABIT_PALETTE.yoga.dark,
  prepare_sleep: HABIT_PALETTE.prepare_sleep.dark,
  commute: HABIT_PALETTE.commute.dark,
  gym: HABIT_PALETTE.gym.dark,
  cleaning: HABIT_PALETTE.cleaning.dark,
  pet: HABIT_PALETTE.pet.dark,
  shopping: HABIT_PALETTE.shopping.dark,
  coding: HABIT_PALETTE.coding.dark,
  gaming: HABIT_PALETTE.gaming.dark,
  finances: HABIT_PALETTE.finances.dark,
  laundry: HABIT_PALETTE.laundry.dark,
  travel: HABIT_PALETTE.travel.dark,
  health: HABIT_PALETTE.health.dark,
  podcast: HABIT_PALETTE.podcast.dark,
};

/** Deeper variations for bright colors to achieve >= 4.5:1 WCAG AA contrast on pure white in light mode */
export const CATEGORY_COLORS_LIGHT: Record<CategoryKey, string> = {
  wakeup: HABIT_PALETTE.wakeup.light,
  sleep: HABIT_PALETTE.sleep.light,
  water: HABIT_PALETTE.water.light,
  tea_journal: HABIT_PALETTE.tea_journal.light,
  breakfast: HABIT_PALETTE.breakfast.light,
  lunch: HABIT_PALETTE.lunch.light,
  dinner: HABIT_PALETTE.dinner.light,
  study: HABIT_PALETTE.study.light,
  reflect: HABIT_PALETTE.reflect.light,
  walk: HABIT_PALETTE.walk.light,
  breathe: HABIT_PALETTE.breathe.light,
  yoga: HABIT_PALETTE.yoga.light,
  prepare_sleep: HABIT_PALETTE.prepare_sleep.light,
  commute: HABIT_PALETTE.commute.light,
  gym: HABIT_PALETTE.gym.light,
  cleaning: HABIT_PALETTE.cleaning.light,
  pet: HABIT_PALETTE.pet.light,
  shopping: HABIT_PALETTE.shopping.light,
  coding: HABIT_PALETTE.coding.light,
  gaming: HABIT_PALETTE.gaming.light,
  finances: HABIT_PALETTE.finances.light,
  laundry: HABIT_PALETTE.laundry.light,
  travel: HABIT_PALETTE.travel.light,
  health: HABIT_PALETTE.health.light,
  podcast: HABIT_PALETTE.podcast.light,
};

/**
 * Generates a subtle background tint for habit icon badges and active pills
 * (16% opacity in Dark Mode, 12% opacity in Light Mode)
 */
export const getSoftTint = (hex: string, mode: ThemeMode): string => {
  const baseHex = hex.startsWith('#') ? hex.slice(0, 7) : `#${hex.slice(0, 6)}`;
  const alphaHex = mode === 'dark' ? '29' : '1F';
  return `${baseHex}${alphaHex}`;
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
  const palette = (HABIT_PALETTE as Record<string, DualColorToken>)[categoryKey];
  if (palette) {
    return isDark ? palette.dark : palette.light;
  }
  return undefined;
}
