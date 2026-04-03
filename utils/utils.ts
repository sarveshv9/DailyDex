// src/utils/utils.ts
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoutineItem {
  id: string;
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  insertionOrder?: number;
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday)
  date?: string; // "YYYY-MM-DD"
  duration?: number;
  subtasks?: SubTask[];
  isSkipped?: boolean; // Flag to indicate a deleted one-off occurrence of a recurring task
}

import { Ionicons } from "@expo/vector-icons";

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

  // Fallback
  custom: "add-circle-outline",
};

export const getRoutineIcon = (key?: string): keyof typeof Ionicons.glyphMap => {
  if (key && ICON_MAP[key]) {
    return ICON_MAP[key];
  }
  return ICON_MAP["breathe"];
};

export interface FormData {
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  daysOfWeek: number[];
  date?: string;
  duration?: number;
}

export const parseTime = (
  timeStr: string
): { hours: number; minutes: number; isValid: boolean } => {
  if (!timeStr || typeof timeStr !== "string") {
    return { hours: 0, minutes: 0, isValid: false };
  }

  const cleanTime = timeStr.trim().toUpperCase();
  const timeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/;
  const match = cleanTime.match(timeRegex);

  if (!match) {
    return { hours: 0, minutes: 0, isValid: false };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const ampm = match[3];

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { hours: 0, minutes: 0, isValid: false };
  }

  if (ampm) {
    if (hours < 1 || hours > 12) {
      return { hours: 0, minutes: 0, isValid: false };
    }

    if (ampm === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes, isValid: true };
};

export const timeToMinutes = (timeStr: string): number => {
  const { hours, minutes, isValid } = parseTime(timeStr);
  if (!isValid) {
    return Number.MAX_SAFE_INTEGER;
  }
  // Shift late-night times (before 4 AM) so they logically appear at the end of the day
  const adjustedHours = hours < 4 ? hours + 24 : hours;
  return adjustedHours * 60 + minutes;
};

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
    const key = i.task.toLowerCase().trim();
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