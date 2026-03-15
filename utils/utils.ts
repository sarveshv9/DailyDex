// src/utils/utils.ts
export interface RoutineItem {
  id: string;
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  insertionOrder?: number;
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday)
}

export const ROUTINE_IMAGES: Record<string, any> = {
  wakeup: require("../assets/images/pixel/wakeup.png"),
  water: require("../assets/images/pixel/water.png"),
  yoga: require("../assets/images/pixel/yoga.png"),
  tea_journal: require("../assets/images/pixel/tea_journal.png"),
  breakfast: require("../assets/images/pixel/breakfast.png"),
  study: require("../assets/images/pixel/study.png"),
  lunch: require("../assets/images/pixel/lunch.png"),
  walk: require("../assets/images/pixel/walk.png"),
  reflect: require("../assets/images/pixel/reflect.png"),
  dinner: require("../assets/images/pixel/dinner.png"),
  prepare_sleep: require("../assets/images/pixel/prepare_sleep.png"),
  sleep: require("../assets/images/pixel/sleep.png"),
  breathe: require("../assets/images/pixel/breathe.png"),
};

export const getRoutineImage = (key?: string) => {
  if (key && ROUTINE_IMAGES[key]) {
    return ROUTINE_IMAGES[key];
  }
  return ROUTINE_IMAGES["breathe"];
};

export interface FormData {
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  daysOfWeek: number[];
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