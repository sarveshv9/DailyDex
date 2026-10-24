import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import * as Haptics from '../../utils/haptics';
import { Theme } from '../../styles/shared';
import { RoutineItem, getRoutineItemsForDate, timeToMinutes } from '../../utils/utils';

interface Props {
    currentDate: Date;
    routineItems: RoutineItem[];
    onSelectDate: (date: Date) => void;
    theme: Theme;
    todayTrigger?: number;
}

const TASK_COLORS: Record<string, string> = {
    wakeup: '#FFB347',
    sleep: '#9CBBE3',
    water: '#77CCEE',
    tea_journal: '#E6D5B8',
    breakfast: '#FFD1BA',
    lunch: '#FFD1BA',
    dinner: '#FFD1BA',
    study: '#A0C4FF',
    walk: '#B9FBC0',
    yoga: '#CFBAF0',
    reflect: '#A0C4FF',
    prepare_sleep: '#BDB2FF',
    breathe: '#B9FBC0',
};

const FALLBACK_COLORS = ['#7B8CDE', '#C084FC', '#4DA8DA', '#6BCB77', '#E8975E', '#B89B72'];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmtDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtTime = (time?: string): string => {
    if (!time) return '';
    const parts = time.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] ?? '0', 10);
    if (isNaN(h)) return time;
    const suffix = h < 12 ? 'am' : 'pm';
    const hour = h % 12 || 12;
    const mins = isNaN(m) ? '00' : String(m).padStart(2, '0');
    return `${hour}:${mins}${suffix}`;
};

function getTaskColor(item: RoutineItem, idx: number): string {
    if (item.imageKey && TASK_COLORS[item.imageKey]) return TASK_COLORS[item.imageKey];
    return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ─── Day Detail Panel ────────────────────────────────────────────────────────

interface DayDetailProps {
    date: Date;
    items: RoutineItem[];
    theme: Theme;
}

function DayDetail({ date, items, theme }: DayDetailProps) {
    const isToday = fmtDateKey(date) === fmtDateKey(new Date());

    return (
        <View
            style={[
                detail.container,
                {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.glass.borderColor,
                },
            ]}
        >
            {/* Header */}
            <View style={detail.header}>
                <View>
                    <Text style={[detail.dayName, { color: theme.colors.textSecondary, fontFamily: theme.fonts.bold }]}>
                        {DAY_FULL[date.getDay()].toUpperCase()}
                    </Text>
                    <View style={detail.dateLine}>
                        <Text style={[detail.dateNum, { color: isToday ? theme.colors.primary : theme.colors.text, fontFamily: theme.fonts.bold }]}>
                            {date.getDate()}
                        </Text>
                        <Text style={[detail.monthYear, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                            {MONTH_SHORT[date.getMonth()]} {date.getFullYear()}
                        </Text>
                    </View>
                </View>
                <View style={[detail.badge, { backgroundColor: isToday ? `${theme.colors.primary}18` : `${theme.colors.textSecondary}15` }]}>
                    <Text style={[detail.badgeText, { color: isToday ? theme.colors.primary : theme.colors.textSecondary, fontFamily: theme.fonts.bold }]}>
                        {items.length} {items.length === 1 ? 'task' : 'tasks'}
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View style={[detail.divider, { backgroundColor: theme.glass.borderColor }]} />

            {/* Task list */}
            {items.length === 0 ? (
                <View style={detail.emptyState}>
                    <Ionicons name="calendar-outline" size={26} color={theme.colors.textSecondary} style={{ opacity: 0.4 }} />
                    <Text style={[detail.emptyText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                        No tasks scheduled
                    </Text>
                </View>
            ) : (
                <View style={detail.taskList}>
                    {items.map((item, i) => {
                        const color = getTaskColor(item, i);
                        const label = item.task ?? item.imageKey?.replace(/_/g, ' ') ?? '';
                        return (
                            <View key={item.id ?? i} style={detail.taskRow}>
                                <View style={[detail.taskDot, { backgroundColor: color }]} />
                                <View style={detail.taskInfo}>
                                    <Text style={[detail.taskName, { color: theme.colors.text, fontFamily: theme.fonts.medium }]}>
                                        {label}
                                    </Text>
                                    <Text style={[detail.taskMeta, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
                                        {fmtTime(item.time)}
                                        {item.duration ? ` · ${item.duration}m` : ''}
                                    </Text>
                                </View>
                                <View style={[detail.taskPill, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                                    <Text style={[detail.taskPillText, { color, fontFamily: theme.fonts.bold }]}>
                                        {fmtTime(item.time)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

interface CalendarCellProps {
    date: Date | null;
    cellIdx: number;
    isToday: boolean;
    isSelected: boolean;
    isWeekend: boolean;
    dotColors: string[];
    taskCount: number;
    theme: Theme;
    onPress: (date: Date) => void;
}

const CalendarCellComponent: React.FC<CalendarCellProps> = ({
    date,
    isToday,
    isSelected,
    isWeekend,
    dotColors,
    taskCount,
    theme,
    onPress,
}) => {
    if (!date) {
        return <View style={grid.cell} />;
    }

    return (
        <Pressable
            onPress={() => onPress(date)}
            style={({ pressed }) => [
                grid.cell,
                isSelected && [grid.cellSelected, { backgroundColor: theme.colors.primary }],
                isToday && !isSelected && [grid.cellToday, { borderColor: theme.colors.primary }],
                pressed && !isSelected && { opacity: 0.6 },
            ]}
        >
            {/* Date Number */}
            <Text
                style={[
                    grid.cellNum,
                    { fontFamily: theme.fonts.medium },
                    isSelected
                        ? [grid.cellNumSelected, { fontFamily: theme.fonts.bold }]
                        : isToday
                            ? [grid.cellNumToday, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]
                            : { color: isWeekend ? theme.colors.textSecondary : theme.colors.text },
                ]}
            >
                {date.getDate()}
            </Text>

            {/* Task dots */}
            {taskCount > 0 && (
                <View style={grid.dotsRow}>
                    {dotColors.map((color, di) => (
                        <View
                            key={di}
                            style={[
                                grid.dot,
                                { backgroundColor: isSelected ? '#FFFFFF' : color },
                            ]}
                        />
                    ))}
                    {taskCount > 3 && (
                        <Text
                            style={[
                                grid.dotMore,
                                {
                                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                                    fontFamily: theme.fonts.bold,
                                },
                            ]}
                        >
                            +{taskCount - 3}
                        </Text>
                    )}
                </View>
            )}
        </Pressable>
    );
};

const CalendarCell = React.memo(CalendarCellComponent);

// ─── Main Component ──────────────────────────────────────────────────────────

function MonthCalendarViewComponent({ currentDate, routineItems, onSelectDate, theme, todayTrigger }: Props) {
    const [year, setYear] = useState(currentDate.getFullYear());
    const [month, setMonth] = useState(currentDate.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

    useEffect(() => {
        if (!todayTrigger) return;
        const target = new Date();
        setYear(target.getFullYear());
        setMonth(target.getMonth());
        setSelectedDate(target);
    }, [todayTrigger]);

    useEffect(() => {
        setYear(currentDate.getFullYear());
        setMonth(currentDate.getMonth());
        setSelectedDate(currentDate);
    }, [currentDate]);

    const todayStr = fmtDateKey(new Date());
    const selectedStr = fmtDateKey(selectedDate);

    const now = new Date();
    const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

    const prevMonth = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    // Build the 6-row grid (42 cells), padded with nulls for leading/trailing days
    const gridCells = useMemo(() => {
        const firstDow = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < firstDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [year, month]);

    // Pre-calculate dot colors and total counts for the entire month once
    const monthDotsMap = useMemo(() => {
        const map = new Map<string, { colors: string[]; total: number }>();
        for (const date of gridCells) {
            if (!date) continue;
            const dateStr = fmtDateKey(date);
            const items = getRoutineItemsForDate(routineItems, date);
            const colors = items.slice(0, 3).map((item, i) => getTaskColor(item, i));
            map.set(dateStr, { colors, total: items.length });
        }
        return map;
    }, [gridCells, routineItems]);

    // Data-accurate routine item retrieval matching timeline
    const getDayItems = useCallback((date: Date): RoutineItem[] => {
        return getRoutineItemsForDate(routineItems, date)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }, [routineItems]);

    const selectedItems = useMemo(() => getDayItems(selectedDate), [selectedDate, getDayItems]);

    const handleDetailCardPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectDate(selectedDate);
    }, [onSelectDate, selectedDate]);

    // Tapping a grid cell selects it; tapping the already selected date confirms and navigates
    const handleCellPress = useCallback((date: Date) => {
        const dateStr = fmtDateKey(date);
        if (dateStr === selectedStr) {
            handleDetailCardPress();
            return;
        }
        Haptics.selectionAsync();
        setSelectedDate(date);
    }, [selectedStr, handleDetailCardPress]);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            {/* ── Month Navigation ── */}
            <View style={nav.container}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        prevMonth();
                    }}
                    hitSlop={16}
                    style={({ pressed }) => [nav.chevronBtn, pressed && { opacity: 0.6 }]}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </Pressable>

                <View style={nav.center}>
                    <Text style={[nav.monthName, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>
                        {MONTH_NAMES[month]}
                    </Text>
                    <Text style={[nav.yearLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                        {year}
                    </Text>
                </View>

                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        nextMonth();
                    }}
                    hitSlop={16}
                    style={({ pressed }) => [nav.chevronBtn, pressed && { opacity: 0.6 }]}
                >
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                </Pressable>
            </View>

            {/* ── Day of Week Headers ── */}
            <View style={[grid.headerRow, { paddingHorizontal: 16, marginBottom: 6 }]}>
                {DAY_HEADERS.map((d, i) => (
                    <View key={i} style={grid.headerCell}>
                        <Text
                            style={[
                                grid.headerText,
                                {
                                    color: (i === 0 || i === 6) ? theme.colors.primary : theme.colors.textSecondary,
                                    fontFamily: theme.fonts.bold,
                                },
                            ]}
                        >
                            {d}
                        </Text>
                    </View>
                ))}
            </View>

            {/* ── Calendar Grid ── */}
            <View style={[grid.gridContainer, { paddingHorizontal: 16 }]}>
                {Array.from({ length: gridCells.length / 7 }, (_, weekIdx) => (
                    <View key={weekIdx} style={grid.weekRow}>
                        {gridCells.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, cellIdx) => {
                            if (!date) {
                                return <View key={cellIdx} style={grid.cell} />;
                            }

                            const dateStr = fmtDateKey(date);
                            const dots = monthDotsMap.get(dateStr) || { colors: [], total: 0 };

                            return (
                                <CalendarCell
                                    key={dateStr}
                                    date={date}
                                    cellIdx={cellIdx}
                                    isToday={dateStr === todayStr}
                                    isSelected={dateStr === selectedStr}
                                    isWeekend={cellIdx === 0 || cellIdx === 6}
                                    dotColors={dots.colors}
                                    taskCount={dots.total}
                                    theme={theme}
                                    onPress={handleCellPress}
                                />
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Thin separator ── */}
            <View style={[sep.line, { backgroundColor: theme.glass.borderColor, marginHorizontal: 16, marginTop: 16 }]} />

            {/* ── Selected Day Detail ── tap the card to confirm selection ── */}
            <Pressable
                onPress={handleDetailCardPress}
                style={({ pressed }) => ({ paddingHorizontal: 16, marginTop: 16, opacity: pressed ? 0.9 : 1 })}
            >
                <DayDetail
                    date={selectedDate}
                    items={selectedItems}
                    theme={theme}
                />
            </Pressable>
        </ScrollView>
    );
}

export const MonthCalendarView = React.memo(MonthCalendarViewComponent);

// ─── Styles ──────────────────────────────────────────────────────────────────

const nav = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
    },
    chevronBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        alignItems: 'center',
    },
    monthName: {
        fontSize: 22,
        letterSpacing: -0.4,
    },
    yearLabel: {
        fontSize: 13,
        letterSpacing: 0.5,
        marginTop: 2,
        opacity: 0.65,
    },
});

const grid = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
    },
    headerCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    headerText: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
    gridContainer: {
        gap: 4,
    },
    weekRow: {
        flexDirection: 'row',
        gap: 4,
    },
    cell: {
        flex: 1,
        aspectRatio: 0.85,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 3,
    },
    cellSelected: {
        borderRadius: 10,
    },
    cellToday: {
        borderWidth: 1.5,
        borderRadius: 10,
    },
    cellNum: {
        fontSize: 15,
        letterSpacing: -0.3,
    },
    cellNumSelected: {
        color: '#FFFFFF',
    },
    cellNumToday: {},
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2.5,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    dotMore: {
        fontSize: 8.5,
        marginLeft: 1,
    },
});

const sep = StyleSheet.create({
    line: {
        height: 1,
    },
});

const detail = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 20,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: { elevation: 3 },
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    dayName: {
        fontSize: 11,
        letterSpacing: 1.3,
        marginBottom: 2,
    },
    dateLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    dateNum: {
        fontSize: 34,
        letterSpacing: -0.8,
        lineHeight: 38,
    },
    monthYear: {
        fontSize: 13.5,
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: 9,
        paddingVertical: 4.5,
        borderRadius: 12,
        marginTop: 2,
    },
    badgeText: {
        fontSize: 11.5,
        letterSpacing: 0.2,
    },
    divider: {
        height: 1,
        marginBottom: 14,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    emptyText: {
        fontSize: 13.5,
        opacity: 0.6,
        letterSpacing: 0.1,
    },
    taskList: {
        gap: 10,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    taskDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        flexShrink: 0,
    },
    taskInfo: {
        flex: 1,
        gap: 1.5,
    },
    taskName: {
        fontSize: 14,
        letterSpacing: -0.1,
    },
    taskMeta: {
        fontSize: 12,
        opacity: 0.6,
    },
    taskPill: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
        borderWidth: 1,
    },
    taskPillText: {
        fontSize: 10.5,
        letterSpacing: 0.1,
    },
});