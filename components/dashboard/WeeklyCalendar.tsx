import * as Haptics from '../../utils/haptics';
import React, { useMemo, useRef } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Theme } from '../../constants/shared';
import { useTheme } from '../../context/ThemeContext';

interface WeeklyCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    /** Map of "YYYY-MM-DD" -> number of events that day */
    eventCountMap?: Record<string, number>;
    /** Called when the user taps the chevron to reveal/hide the timeline panel */
    onSwipeDown?: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Get the Sunday of the week that contains `date` */
const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // go back to Sunday
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Build an array of 7 dates for the week containing `date` */
const getWeekDates = (date: Date): Date[] => {
    const sunday = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
    });
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
    selectedDate,
    onSelectDate,
    eventCountMap = {},
    onSwipeDown,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const scrollRef = useRef<ScrollView>(null);

    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    // Generate multiple weeks centered on today — enough to swipe forward/backward
    // We show 5 weeks total (prev 2 + current + next 2)
    const weeks = useMemo(() => {
        return Array.from({ length: 5 }, (_, wi) => {
            const anchor = new Date(today);
            anchor.setDate(anchor.getDate() + (wi - 2) * 7);
            return getWeekDates(anchor);
        });
    }, [today]);

    // Auto-scroll horizontally to the week containing the selectedDate on mount
    const selectedWeekIndex = useMemo(() => {
        for (let i = 0; i < weeks.length; i++) {
            const start = weeks[i][0];
            const end = weeks[i][6];
            if (selectedDate >= start && selectedDate <= end) return i;
        }
        return 2; // default to middle (current week)
    }, [weeks, selectedDate]);

    const todayKey = formatDateKey(today);
    const selectedKey = formatDateKey(selectedDate);

    // Month/year text from selected date
    const monthHeader = selectedDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <View style={styles.container} testID="weekly-calendar">
            {/* Header: date like "11 March 2026 >" + chevron to expand panel */}
            <View style={styles.headerRow}>
                <Pressable
                    style={styles.headerDateBlock}
                    onPress={() => onSelectDate(today)}
                >
                    <Text style={styles.headerText} testID="calendar-header-date">{monthHeader}</Text>
                    <Text style={styles.headerArrow}> ›</Text>
                </Pressable>

                {onSwipeDown && (
                    <Pressable
                        style={styles.headerChevronBtn}
                        onPress={onSwipeDown}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.headerChevronIcon}>⌄</Text>
                    </Pressable>
                )}
            </View>

            {/* Horizontal week strip */}
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onLayout={() => {
                    // Scroll to the current week page
                    // Each page = full width (we'll use fixed column width * 7)
                }}
            >
                {weeks.map((weekDates, wi) => (
                    <View key={wi} style={styles.weekRow}>
                        {/* Day labels row */}
                        <View style={styles.dayLabelRow}>
                            {DAY_LABELS.map((label, di) => {
                                const date = weekDates[di];
                                const key = formatDateKey(date);
                                const isSelected = key === selectedKey;
                                return (
                                    <Text
                                        key={di}
                                        style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
                                    >
                                        {label}
                                    </Text>
                                );
                            })}
                        </View>

                        {/* Date numbers row */}
                        <View style={styles.dateRow}>
                            {weekDates.map((date, di) => {
                                const key = formatDateKey(date);
                                const isSelected = key === selectedKey;
                                const isToday = key === todayKey;
                                const eventCount = eventCountMap[key] ?? 0;

                                return (
                                    <Pressable
                                        key={di}
                                        style={styles.dayCell}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            onSelectDate(date);
                                        }}
                                    >
                                        <View
                                            style={[
                                                styles.dateBubble,
                                                isSelected && { backgroundColor: theme.colors.primary },
                                                isToday && !isSelected && styles.todayBubble,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dateNumber,
                                                    isSelected && styles.dateNumberSelected,
                                                    isToday && !isSelected && { color: theme.colors.primary },
                                                ]}
                                            >
                                                {date.getDate()}
                                            </Text>
                                        </View>

                                        {/* Event dots below the date */}
                                        {eventCount > 0 && (
                                            <View style={styles.dotsRow}>
                                                {Array.from({ length: Math.min(eventCount, 3) }, (_, i) => (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.dot,
                                                            { backgroundColor: i === 0 ? theme.colors.primary : theme.colors.secondary },
                                                            isSelected && { backgroundColor: theme.colors.primary, opacity: 0.7 },
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const DAY_CELL_WIDTH = 48;

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.colors.background,
            paddingBottom: 8,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: `${theme.colors.text}15`,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingTop: 14,
            paddingBottom: 14,
        },
        headerDateBlock: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        headerText: {
            fontSize: 24,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        headerArrow: {
            fontSize: 24,
            color: theme.colors.primary,
            fontFamily: theme.fonts.bold,
        },
        headerChevronBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${theme.colors.primary}18`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerChevronIcon: {
            fontSize: 20,
            color: theme.colors.primary,
            lineHeight: 24,
        },
        scrollContent: {
            // No extra padding — pages are screen width
        },
        weekRow: {
            width: DAY_CELL_WIDTH * 7,
        },
        dayLabelRow: {
            flexDirection: 'row',
            marginBottom: 6,
        },
        dayLabel: {
            width: DAY_CELL_WIDTH,
            textAlign: 'center',
            fontSize: 11,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
        },
        dayLabelSelected: {
            color: theme.colors.primary,
        },
        dateRow: {
            flexDirection: 'row',
        },
        dayCell: {
            width: DAY_CELL_WIDTH,
            alignItems: 'center',
            paddingBottom: 6,
        },
        dateBubble: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
        },
        todayBubble: {
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
        },
        dateNumber: {
            fontSize: 15,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        dateNumberSelected: {
            color: theme.colors.white,
        },
        dotsRow: {
            flexDirection: 'row',
            gap: 3,
            marginTop: 4,
        },
        dot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
        },
    });
