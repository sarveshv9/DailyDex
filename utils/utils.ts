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
}

import { Ionicons } from "@expo/vector-icons";

export const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  wakeup: "alarm-outline",
  water: "water-outline",
  yoga: "fitness-outline",
  tea_journal: "cafe-outline",
  breakfast: "restaurant-outline",
  study: "book-outline",
  lunch: "restaurant-outline",
  walk: "walk-outline",
  reflect: "journal-outline",
  dinner: "restaurant-outline",
  prepare_sleep: "bed-outline",
  sleep: "moon-outline",
  breathe: "leaf-outline",
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
  return hours * 60 + minutes;
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