// src/utils/utils.ts
import { Ionicons } from "@expo/vector-icons";
import type { RoutineFormData, RoutineItem, SubTask } from "../types";
import {
  addMinutesToTime,
  formatDuration,
  minutesToTimeStr,
  parseTime,
  timeToMinutes,
} from "./timeMath";

export type { SubTask, RoutineItem, RoutineFormData as FormData };
export {
  addMinutesToTime,
  formatDuration,
  minutesToTimeStr,
  parseTime,
  timeToMinutes,
};

export const isWakeupOrSleep = (item: RoutineItem): boolean => {
  const key = item.imageKey?.toLowerCase() ?? '';
  const taskName = item.task?.toLowerCase() ?? '';
  return (
    key === 'wakeup' ||
    key === 'sleep' ||
    key === 'prepare_sleep' ||
    taskName.includes('wake up') ||
    taskName.includes('wakeup') ||
    taskName.includes('sleep')
  );
};

export const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Morning
  wakeup: "alarm-outline",
  water: "water-outline",
  cold_shower: "snow-outline",
  skincare: "sparkles-outline",
  affirmations: "heart-outline",

  // Meals
  breakfast: "restaurant-outline",
  lunch: "restaurant-outline",
  dinner: "restaurant-outline",
  snack: "nutrition-outline",
  meal_prep: "cut-outline",
  tea_journal: "cafe-outline",
  coffee: "cafe-outline",

  // Fitness
  gym: "barbell-outline",
  yoga: "fitness-outline",
  run: "footsteps-outline",
  walk: "walk-outline",
  swim: "water-outline",
  sports: "football-outline",
  home_workout: "body-outline",
  cycling: "bicycle-outline",

  // Productivity
  study: "book-outline",
  deep_work: "desktop-outline",
  read: "reader-outline",
  side_project: "rocket-outline",
  emails: "mail-outline",
  planning: "calendar-outline",

  // Mindfulness
  meditate: "flower-outline",
  breathe: "leaf-outline",
  journal: "journal-outline",
  reflect: "journal-outline",
  gratitude: "happy-outline",
  prayer: "hand-left-outline",

  // Creative
  draw: "brush-outline",
  music_practice: "musical-notes-outline",
  write: "pencil-outline",
  photography: "camera-outline",
  craft: "color-palette-outline",

  // Social
  family_time: "people-outline",
  call_friend: "call-outline",
  date_night: "heart-circle-outline",
  volunteer: "hand-right-outline",

  // Evening
  prepare_sleep: "bed-outline",
  screen_off: "phone-landscape-outline",
  night_walk: "cloudy-night-outline",
  sleep: "moon-outline",

  // Everyday Life & Chores
  pet: "paw-outline",
  cleaning: "sparkles-outline",
  laundry: "shirt-outline",
  shopping: "cart-outline",
  plant: "leaf-outline",
  finances: "wallet-outline",
  commute: "car-outline",
  travel: "airplane-outline",
  health: "medkit-outline",
  coding: "code-slash-outline",
  gaming: "game-controller-outline",
  podcast: "headset-outline",

  // Fallback & custom
  star: "star-outline",
  sparkles: "sparkles-outline",
  custom: "add-circle-outline",
};

export const getRoutineIcon = (key?: string): keyof typeof Ionicons.glyphMap => {
  if (key && ICON_MAP[key]) {
    return ICON_MAP[key];
  }
  return ICON_MAP["breathe"];
};

export const guessRoutineIconKey = (text: string): string => {
  const lower = text.toLowerCase().trim();
  if (!lower) return "breathe";
  if (lower.includes("wake") || lower.includes("alarm") || lower.includes("morning")) return "wakeup";
  if (lower.includes("water") || lower.includes("drink") || lower.includes("hydrat")) return "water";
  if (lower.includes("shower") || lower.includes("bath")) return "cold_shower";
  if (lower.includes("skin") || lower.includes("wash face")) return "skincare";
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("cafe")) return "coffee";
  if (lower.includes("breakfast") || lower.includes("brunch")) return "breakfast";
  if (lower.includes("lunch")) return "lunch";
  if (lower.includes("dinner") || lower.includes("supper")) return "dinner";
  if (lower.includes("snack") || lower.includes("fruit")) return "snack";
  if (lower.includes("gym") || lower.includes("workout") || lower.includes("lift") || lower.includes("fitness")) return "gym";
  if (lower.includes("yoga") || lower.includes("stretch")) return "yoga";
  if (lower.includes("run") || lower.includes("jog")) return "run";
  if (lower.includes("walk")) return "walk";
  if (lower.includes("cycling") || lower.includes("bike")) return "cycling";
  if (lower.includes("meditat")) return "meditate";
  if (lower.includes("breath")) return "breathe";
  if (lower.includes("journal") || lower.includes("diary")) return "journal";
  if (lower.includes("reflect") || lower.includes("gratitude")) return "reflect";
  if (lower.includes("read") || lower.includes("book")) return "read";
  if (lower.includes("study") || lower.includes("class") || lower.includes("learn")) return "study";
  if (lower.includes("work") || lower.includes("code") || lower.includes("project")) return "deep_work";
  if (lower.includes("email") || lower.includes("inbox")) return "emails";
  if (lower.includes("draw") || lower.includes("art") || lower.includes("sketch")) return "draw";
  if (lower.includes("music") || lower.includes("piano") || lower.includes("guitar")) return "music_practice";
  if (lower.includes("write")) return "write";
  if (lower.includes("sleep") || lower.includes("bed") || lower.includes("rest")) return "sleep";
  if (lower.includes("wind down") || lower.includes("relax")) return "prepare_sleep";

  // Everyday life & chores
  if (lower.includes("drive") || lower.includes("car") || lower.includes("commut") || lower.includes("traffic") || lower.includes("office") || lower.includes("bus") || lower.includes("train")) return "commute";
  if (lower.includes("pet") || lower.includes("dog") || lower.includes("cat") || lower.includes("puppy")) return "pet";
  if (lower.includes("clean") || lower.includes("tidy") || lower.includes("dish") || lower.includes("vacuum") || lower.includes("mop")) return "cleaning";
  if (lower.includes("laund") || lower.includes("clothes") || lower.includes("fold") || lower.includes("iron")) return "laundry";
  if (lower.includes("shop") || lower.includes("grocer") || lower.includes("buy") || lower.includes("market")) return "shopping";
  if (lower.includes("plant") || lower.includes("garden")) return "plant";
  if (lower.includes("bill") || lower.includes("money") || lower.includes("financ") || lower.includes("budget") || lower.includes("tax")) return "finances";
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("trip") || lower.includes("hotel")) return "travel";
  if (lower.includes("med") || lower.includes("doctor") || lower.includes("pill") || lower.includes("vitamin") || lower.includes("health")) return "health";
  if (lower.includes("code") || lower.includes("dev") || lower.includes("program") || lower.includes("github")) return "coding";
  if (lower.includes("game") || lower.includes("gaming") || lower.includes("play")) return "gaming";
  if (lower.includes("podcast") || lower.includes("audio")) return "podcast";

  return "breathe";
};

export const ICON_GROUPS: { category: string; icons: { key: string; label: string }[] }[] = [
  {
    category: "Mind & Focus",
    icons: [
      { key: "meditate", label: "Meditate" },
      { key: "breathe", label: "Breathe" },
      { key: "journal", label: "Journal" },
      { key: "read", label: "Read" },
      { key: "deep_work", label: "Deep Work" },
      { key: "study", label: "Study" },
      { key: "planning", label: "Planning" },
      { key: "emails", label: "Emails" },
    ],
  },
  {
    category: "Health & Fitness",
    icons: [
      { key: "gym", label: "Gym" },
      { key: "yoga", label: "Yoga" },
      { key: "run", label: "Run" },
      { key: "walk", label: "Walk" },
      { key: "cycling", label: "Cycling" },
      { key: "home_workout", label: "Workout" },
      { key: "swim", label: "Swim" },
      { key: "sports", label: "Sports" },
      { key: "water", label: "Hydrate" },
      { key: "health", label: "Health" },
    ],
  },
  {
    category: "Everyday & Chores",
    icons: [
      { key: "commute", label: "Commute / Drive" },
      { key: "pet", label: "Pet / Dog" },
      { key: "cleaning", label: "Clean" },
      { key: "laundry", label: "Laundry" },
      { key: "shopping", label: "Shopping" },
      { key: "plant", label: "Plants" },
      { key: "finances", label: "Finances" },
      { key: "travel", label: "Travel" },
    ],
  },
  {
    category: "Food & Meals",
    icons: [
      { key: "coffee", label: "Coffee / Tea" },
      { key: "breakfast", label: "Breakfast" },
      { key: "lunch", label: "Lunch" },
      { key: "dinner", label: "Dinner" },
      { key: "snack", label: "Snack" },
      { key: "meal_prep", label: "Meal Prep" },
    ],
  },
  {
    category: "Morning & Night",
    icons: [
      { key: "wakeup", label: "Wake Up" },
      { key: "cold_shower", label: "Shower" },
      { key: "skincare", label: "Skincare" },
      { key: "affirmations", label: "Affirmations" },
      { key: "prepare_sleep", label: "Wind Down" },
      { key: "sleep", label: "Sleep" },
      { key: "night_walk", label: "Night Walk" },
      { key: "screen_off", label: "Screen Off" },
    ],
  },
  {
    category: "Creative & Play",
    icons: [
      { key: "draw", label: "Draw" },
      { key: "music_practice", label: "Music" },
      { key: "write", label: "Write" },
      { key: "photography", label: "Photo" },
      { key: "craft", label: "Craft" },
      { key: "gaming", label: "Gaming" },
      { key: "podcast", label: "Podcast" },
      { key: "coding", label: "Coding" },
    ],
  },
  {
    category: "Social",
    icons: [
      { key: "family_time", label: "Family" },
      { key: "call_friend", label: "Call" },
      { key: "date_night", label: "Date" },
      { key: "volunteer", label: "Volunteer" },
      { key: "gratitude", label: "Gratitude" },
    ],
  },
];


export const sortRoutineItems = (items: RoutineItem[]): RoutineItem[] => {
  return [...items].sort((a, b) => {
    const timeA = timeToMinutes(a.time);
    const timeB = timeToMinutes(b.time);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const orderA = a.insertionOrder || 0;
    const orderB = b.insertionOrder || 0;
    return orderA - orderB;
  });
};

export const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getRoutineItemsForDate = (items: RoutineItem[], date: Date): RoutineItem[] => {
  const dow = date.getDay();
  const dateStr = getDateString(date);

  const filtered = items.filter(item =>
    item.daysOfWeek?.includes(dow) || item.date === dateStr
  );

  const map = new Map<string, RoutineItem[]>();
  filtered.forEach(i => {
    // If parentId exists, group by that; otherwise if it has recurring days, group by id; otherwise fallback to task + time
    const key = i.parentId || (i.daysOfWeek && i.daysOfWeek.length > 0 ? i.id : `${i.task.toLowerCase().trim()}_${i.time}`);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  });

  const result: RoutineItem[] = [];
  map.forEach(group => {
    const oneOff = group.find(i => i.date === dateStr);
    if (oneOff) {
      if (!oneOff.isSkipped) {
        result.push(oneOff);
      }
    } else {
      result.push(...group);
    }
  });

  return result;
};