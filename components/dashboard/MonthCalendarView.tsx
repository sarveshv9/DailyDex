import React, { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Theme } from '../../constants/shared';
import { RoutineItem } from '../../utils/utils';

interface Props {
    currentDate: Date;
    routineItems: RoutineItem[];
    onSelectDate: (date: Date) => void;
    theme: Theme;
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
    if (isNaN(h)) return time; // return raw if unparseable
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
        <View style={[detail.container, { backgroundColor: theme.colors.card }]}>
            {/* Header */}
            <View style={detail.header}>
                <View>
                    <Text style={[detail.dayName, { color: theme.colors.textSecondary }]}>
                        {DAY_FULL[date.getDay()].toUpperCase()}
                    </Text>
                    <View style={detail.dateLine}>
                        <Text style={[detail.dateNum, { color: isToday ? '#FF453A' : theme.colors.text }]}>
                            {date.getDate()}
                        </Text>
                        <Text style={[detail.monthYear, { color: theme.colors.textSecondary }]}>
                            {MONTH_SHORT[date.getMonth()]} {date.getFullYear()}
                        </Text>
                    </View>
                </View>
                <View style={[detail.badge, { backgroundColor: isToday ? 'rgba(255,69,58,0.12)' : 'rgba(150,150,150,0.1)' }]}>
                    <Text style={[detail.badgeText, { color: isToday ? '#FF453A' : theme.colors.textSecondary }]}>
                        {items.length} {items.length === 1 ? 'task' : 'tasks'}
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View style={[detail.divider, { backgroundColor: 'rgba(150,150,150,0.15)' }]} />

            {/* Task list */}
            {items.length === 0 ? (
                <View style={detail.emptyState}>
                    <Text style={[detail.emptyIcon]}>○</Text>
                    <Text style={[detail.emptyText, { color: theme.colors.textSecondary }]}>
                        No tasks scheduled
                    </Text>
                </View>
            ) : (
                <View style={detail.taskList}>
                    {items.map((item, i) => {
                        const color = getTaskColor(item, i);
                        const label = item.task ?? item.imageKey?.replace(/_/g, ' ') ?? '';
                        return (
                            <View key={i} style={detail.taskRow}>
                                <View style={[detail.taskDot, { backgroundColor: color }]} />
                                <View style={detail.taskInfo}>
                                    <Text style={[detail.taskName, { color: theme.colors.text }]}>
                                        {label}
                                    </Text>
                                    <Text style={[detail.taskMeta, { color: theme.colors.textSecondary }]}>
                                        {fmtTime(item.time)}
                                        {item.duration ? ` · ${item.duration}min` : ''}
                                    </Text>
                                </View>
                                <View style={[detail.taskPill, { backgroundColor: color + '22' }]}>
                                    <Text style={[detail.taskPillText, { color }]}>
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function MonthCalendarView({ currentDate, routineItems, onSelectDate, theme }: Props) {
    const [year, setYear] = useState(currentDate.getFullYear());
    const [month, setMonth] = useState(currentDate.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

    const todayStr = fmtDateKey(new Date());
    const selectedStr = fmtDateKey(selectedDate);

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
        // Pad to complete the last row
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [year, month]);

    const getDayItems = (date: Date) => {
        const weekday = date.getDay();
        const dateStr = fmtDateKey(date);
        return routineItems
            .filter(item => item.daysOfWeek?.includes(weekday) || item.date === dateStr)
            .sort((a, b) => a.time.localeCompare(b.time));
    };

    const selectedItems = useMemo(() => getDayItems(selectedDate), [selectedDate, routineItems]);

    // Tapping a grid cell only highlights it; tapping the detail card fires onSelectDate
    const handleCellPress = (date: Date) => {
        setSelectedDate(date);
    };

    const handleDetailCardPress = () => {
        onSelectDate(selectedDate);
    };

    // Dot colors for a cell (up to 3 unique colors)
    const getCellDots = (date: Date) => {
        const items = getDayItems(date);
        const colors = items.slice(0, 3).map((item, i) => getTaskColor(item, i));
        return { colors, total: items.length };
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            {/* ── Month Navigation ── */}
            <View style={[nav.container]}>
                <Pressable onPress={prevMonth} hitSlop={16} style={nav.chevronBtn}>
                    <Text style={[nav.chevron, { color: theme.colors.textSecondary }]}>‹</Text>
                </Pressable>

                <View style={nav.center}>
                    <Text style={[nav.monthName, { color: theme.colors.text }]}>
                        {MONTH_NAMES[month]}
                    </Text>
                    <Text style={[nav.yearLabel, { color: theme.colors.textSecondary }]}>
                        {year}
                    </Text>
                </View>

                <Pressable onPress={nextMonth} hitSlop={16} style={nav.chevronBtn}>
                    <Text style={[nav.chevron, { color: theme.colors.textSecondary }]}>›</Text>
                </Pressable>
            </View>

            {/* ── Day of Week Headers ── */}
            <View style={[grid.headerRow, { paddingHorizontal: 16, marginBottom: 6 }]}>
                {DAY_HEADERS.map((d, i) => (
                    <View key={i} style={grid.headerCell}>
                        <Text style={[
                            grid.headerText,
                            { color: (i === 0 || i === 6) ? '#FF453A' : theme.colors.textSecondary },
                        ]}>
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
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedStr;
                            const isWeekend = cellIdx === 0 || cellIdx === 6;
                            const { colors: dotColors, total: taskCount } = getCellDots(date);

                            return (
                                <Pressable
                                    key={dateStr}
                                    onPress={() => handleCellPress(date)}
                                    style={({ pressed }) => [
                                        grid.cell,
                                        isSelected && [grid.cellSelected, { backgroundColor: theme.colors.primary }],
                                        isToday && !isSelected && grid.cellToday,
                                        pressed && !isSelected && { opacity: 0.6 },
                                    ]}
                                >
                                    {/* Date Number */}
                                    <Text style={[
                                        grid.cellNum,
                                        isSelected
                                            ? grid.cellNumSelected
                                            : isToday
                                                ? [grid.cellNumToday, { color: '#FF453A' }]
                                                : { color: isWeekend ? theme.colors.textSecondary : theme.colors.text },
                                    ]}>
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
                                                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : color },
                                                    ]}
                                                />
                                            ))}
                                            {taskCount > 3 && (
                                                <Text style={[grid.dotMore, { color: isSelected ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }]}>
                                                    +{taskCount - 3}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Thin separator ── */}
            <View style={[sep.line, { backgroundColor: 'rgba(150,150,150,0.15)', marginHorizontal: 16, marginTop: 16 }]} />

            {/* ── Selected Day Detail ── tap the card to confirm selection ── */}
            <Pressable
                onPress={handleDetailCardPress}
                style={({ pressed }) => ({ paddingHorizontal: 16, marginTop: 16, opacity: pressed ? 0.85 : 1 })}
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
    chevron: {
        fontSize: 32,
        fontWeight: '300',
        lineHeight: 36,
    },
    center: {
        alignItems: 'center',
    },
    monthName: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    yearLabel: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 1,
        marginTop: 1,
        opacity: 0.6,
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
        fontWeight: '600',
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
        borderColor: '#FF453A',
        borderRadius: 10,
    },
    cellNum: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    cellNumSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    cellNumToday: {
        fontWeight: '700',
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    dotMore: {
        fontSize: 8,
        fontWeight: '600',
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
        borderRadius: 28,
        padding: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayName: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    dateLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    dateNum: {
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: -1,
        lineHeight: 40,
    },
    monthYear: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        marginTop: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    emptyIcon: {
        fontSize: 22,
        opacity: 0.25,
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.5,
        letterSpacing: 0.2,
    },
    taskList: {
        gap: 12,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    taskDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        flexShrink: 0,
    },
    taskInfo: {
        flex: 1,
        gap: 1,
    },
    taskName: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
        letterSpacing: 0.1,
    },
    taskMeta: {
        fontSize: 12,
        opacity: 0.6,
    },
    taskPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    taskPillText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

const detailCard = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 18,
    },
    headerOpen: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    colorBar: {
        width: 3,
        height: 36,
        borderRadius: 2,
    },
    headerDay: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    headerDate: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    chevron: {
        fontSize: 16,
        opacity: 0.5,
    },
    body: {
        paddingHorizontal: 18,
        paddingBottom: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
});