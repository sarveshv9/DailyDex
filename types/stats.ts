export interface DailyStats {
  tasks: number;
  focusMinutes: number;
}

export interface UserStats {
  totalFocusMinutes: number;
  tasksCompleted: number;
  sessionsCompleted: number;
  currentStreak: number;
  bestStreak: number;
  history: Record<string, DailyStats>; // "YYYY-MM-DD" -> DailyStats
}

export interface WeeklyStatItem {
  dateStr: string;
  dayOfWeek: string;
  tasks: number;
  focusMinutes: number;
}
