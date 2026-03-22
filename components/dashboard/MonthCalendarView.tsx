import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../../constants/shared';
import { RoutineItem } from '../../utils/utils';

interface Props {
    currentDate: Date;
    routineItems: RoutineItem[];
    onSelectDate: (date: Date) => void;
    theme: Theme;
}

export function MonthCalendarView({ currentDate, routineItems, onSelectDate, theme }: Props) {
    const styles = useMemo(() => getStyles(theme), [theme]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null); // empty slots before the 1st
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const todayString = new Date().toISOString().split('T')[0];

    // Build a set of days that have active history or routines
    // Since we're looking at routines for ANY day vs TODAY
    // Usually routineItems contains all items, but we only know their repeats
    // Let's do a quick determination if there's any valid tasks falling on this day.
    // For simplicity of visualization in the context of the prototype, we assume if `repeatOnDays` includes the day's weekday, it has a task. Or if it has no repeat but its time is this day (actually RoutineItem doesn't store full Date, just hours).
    const isDayActive = (date: Date) => {
        const weekdayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' });
        // Return true if any task repeats on this weekday or doesn't have repeatDays but is active.
        return routineItems.some(req => 
            req.daysOfWeek?.includes(date.getDay()) || (!req.daysOfWeek?.length && req.date === date.toISOString().split('T')[0])
        );
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                {weekDays.map(d => (
                    <Text key={d} style={styles.weekdayText}>{d}</Text>
                ))}
            </View>
            <View style={styles.grid}>
                {days.map((date, index) => {
                    if (!date) {
                        return <View key={`empty-${index}`} style={styles.cell} />;
                    }
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = dateStr === todayString;
                    const hasItems = isDayActive(date);

                    return (
                        <Pressable 
                            key={dateStr} 
                            style={[styles.cell, isToday && styles.todayCell]}
                            onPress={() => onSelectDate(date)}
                        >
                            <Text style={[styles.dayText, isToday && styles.todayText]}>
                                {date.getDate()}
                            </Text>
                            {hasItems && <View style={styles.dot} />}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: theme.colors.background,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekdayText: {
        fontSize: 12,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        width: 40,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: '14.28%', // 100/7
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderRadius: 20,
    },
    todayCell: {
        backgroundColor: `${theme.colors.primary}20`,
    },
    dayText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text,
        marginBottom: 2,
    },
    todayText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
        position: 'absolute',
        bottom: 6,
    }
});
