import AsyncStorage from "@react-native-async-storage/async-storage";

export const STATS_STORAGE_KEY = "@zen_stats";

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

const DEFAULT_STATS: UserStats = {
    totalFocusMinutes: 0,
    tasksCompleted: 0,
    sessionsCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    history: {},
};

export const getTodayString = () => {
    return new Date().toISOString().split("T")[0];
};

const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
};

export const getWeeklyData = (stats: UserStats) => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

        const dayStats = stats.history[dateStr] || { tasks: 0, focusMinutes: 0 };
        data.push({
            dateStr,
            dayOfWeek,
            tasks: dayStats.tasks,
            focusMinutes: dayStats.focusMinutes,
        });
    }
    return data;
};

export const getMonthlyData = (stats: UserStats) => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayOfWeek = d.getDate().toString();

        const dayStats = stats.history[dateStr] || { tasks: 0, focusMinutes: 0 };
        data.push({
            dateStr,
            dayOfWeek,
            tasks: dayStats.tasks,
            focusMinutes: dayStats.focusMinutes,
        });
    }
    return data;
};

export const getYearlyData = (stats: UserStats) => {
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        
        let tasks = 0;
        let focusMinutes = 0;
        
        Object.keys(stats.history).forEach(dateStr => {
            if (dateStr.startsWith(monthKey)) {
                tasks += stats.history[dateStr].tasks;
                focusMinutes += stats.history[dateStr].focusMinutes;
            }
        });
        
        data.push({
            dateStr: monthKey,
            dayOfWeek: monthLabel,
            tasks,
            focusMinutes,
        });
    }
    return data;
};

export const loadStats = async (): Promise<UserStats> => {
    try {
        const data = await AsyncStorage.getItem(STATS_STORAGE_KEY);
        if (!data) return DEFAULT_STATS;

        const stats: UserStats = JSON.parse(data);

        // Streak logic check
        const today = getTodayString();
        const yesterday = getYesterdayString();

        // If they didn't do anything today AND didn't do anything yesterday, streak is broken
        if (!stats.history[today] && !stats.history[yesterday]) {
            stats.currentStreak = 0;
        }

        return stats;
    } catch (e) {
        console.error("Failed to load stats", e);
        return DEFAULT_STATS;
    }
};

export const saveStats = async (stats: UserStats): Promise<void> => {
    try {
        await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error("Failed to save stats", e);
    }
};

export const addFocusSession = async (minutes: number): Promise<UserStats> => {
    const stats = await loadStats();
    const today = getTodayString();

    if (!stats.history[today]) {
        stats.history[today] = { tasks: 0, focusMinutes: 0 };
        // Only increment streak if this is the first action today
        stats.currentStreak += 1;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
    }

    stats.history[today].focusMinutes += minutes;
    stats.totalFocusMinutes += minutes;
    stats.sessionsCompleted += 1;

    await saveStats(stats);
    return stats;
};

export const addTaskCompleted = async (): Promise<UserStats> => {
    const stats = await loadStats();
    const today = getTodayString();

    if (!stats.history[today]) {
        stats.history[today] = { tasks: 0, focusMinutes: 0 };
        stats.currentStreak += 1;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
    }

    stats.history[today].tasks += 1;
    stats.tasksCompleted += 1;

    await saveStats(stats);
    return stats;
};
export const removeTaskCompleted = async (count: number = 1): Promise<UserStats> => {
    const stats = await loadStats();
    const today = getTodayString();

    if (stats.history[today] && stats.history[today].tasks > 0) {
        stats.history[today].tasks = Math.max(0, stats.history[today].tasks - count);
    }
    
    if (stats.tasksCompleted > 0) {
        stats.tasksCompleted = Math.max(0, stats.tasksCompleted - count);
    }


    await saveStats(stats);
    return stats;
};
