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
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

import { supabase } from '../lib/supabase';

export const loadStats = async (): Promise<UserStats> => {
    try {
        let finalStats: UserStats | null = null;
        let localStats: UserStats | null = null;

        const data = await AsyncStorage.getItem(STATS_STORAGE_KEY);
        if (data) {
            try { localStats = JSON.parse(data); } catch(e){}
        }

        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth?.user) {
            const { data: remote, error } = await supabase.from('user_stats').select('*').eq('id', userAuth.user.id).single();
            if (!error && remote) {
                finalStats = {
                    totalFocusMinutes: remote.total_focus_minutes || 0,
                    tasksCompleted: remote.tasks_completed || 0,
                    sessionsCompleted: remote.sessions_completed || 0,
                    currentStreak: remote.current_streak || 0,
                    bestStreak: remote.best_streak || 0,
                    history: remote.history || {}
                };
                await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(finalStats));
            } else if (localStats) {
                finalStats = localStats;
                await supabase.from('user_stats').upsert({
                    id: userAuth.user.id,
                    total_focus_minutes: localStats.totalFocusMinutes,
                    tasks_completed: localStats.tasksCompleted,
                    sessions_completed: localStats.sessionsCompleted,
                    current_streak: localStats.currentStreak,
                    best_streak: localStats.bestStreak,
                    history: localStats.history
                });
            }
        }

        if (!finalStats && localStats) finalStats = localStats;
        if (!finalStats) finalStats = DEFAULT_STATS;

        // Streak logic check
        const today = getTodayString();
        const yesterday = getYesterdayString();
        if (!finalStats.history[today] && !finalStats.history[yesterday]) {
            finalStats.currentStreak = 0;
        }

        return finalStats;
    } catch (e) {
        console.error("Failed to load stats", e);
        return DEFAULT_STATS;
    }
};

export const saveStats = async (stats: UserStats): Promise<void> => {
    try {
        // Immediate local save
        await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
        
        // Background sync to cloud
        supabase.auth.getUser().then(async ({ data: userAuth }) => {
            if (userAuth?.user) {
                const { error } = await supabase.from('user_stats').upsert({
                    id: userAuth.user.id,
                    total_focus_minutes: stats.totalFocusMinutes,
                    tasks_completed: stats.tasksCompleted,
                    sessions_completed: stats.sessionsCompleted,
                    current_streak: stats.currentStreak,
                    best_streak: stats.bestStreak,
                    history: stats.history
                });
                if (error) console.error("Failed to sync user stats", error);
            }
        });
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
