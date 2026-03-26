import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../constants/shared';
import { RoutineItem, timeToMinutes } from '../../utils/utils';

interface Props {
    currentDate: Date;
    routineItems: RoutineItem[];
    onSelectDate: (date: Date) => void;
    theme: Theme;
}

const PILL_H = 27;
const PILL_GAP = 5;

const TASK_COLORS: Record<string, string> = {
    wakeup: '#E8975E',
    sleep: '#5A5A7A',
    water: '#4DA8DA',
    tea_journal: '#B89B72',
    breakfast: '#E8975E',
    lunch: '#E8975E',
    dinner: '#E8975E',
    study: '#7B8CDE',
    walk: '#6BCB77',
    yoga: '#C084FC',
    reflect: '#7B8CDE',
    prepare_sleep: '#5A5A7A',
    breathe: '#6BCB77',
};

const CARD_TINTS = [
    '#7B8CDE', '#C084FC',
    '#4DA8DA', '#6BCB77', '#5A5A7A',
];

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmtDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function MonthCalendarView({ currentDate, routineItems, onSelectDate, theme }: Props) {
    const [year, setYear] = useState(currentDate.getFullYear());
    const [month, setMonth] = useState(currentDate.getMonth());

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = fmtDateKey(new Date());
    const selectedStr = fmtDateKey(currentDate);

    const prevMonth = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    const days = useMemo(
        () => Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
        [year, month, daysInMonth],
    );

    const getDayItems = (date: Date) => {
        const weekday = date.getDay();
        const dateStr = fmtDateKey(date);
        return routineItems
            .filter(item => item.daysOfWeek?.includes(weekday) || item.date === dateStr)
            .sort((a, b) => a.time.localeCompare(b.time));
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

            {/* ── Month navigation ── */}
            <View style={styles.monthNav}>
                <Pressable onPress={prevMonth} hitSlop={16}>
                    <Text style={[styles.navSideLabel, { color: theme.colors.textSecondary }]}>
                        {MONTH_NAMES[(month - 1 + 12) % 12]}
                    </Text>
                </Pressable>
                <View style={styles.navCenter}>
                    <Pressable onPress={prevMonth} hitSlop={16}>
                        <Text style={[styles.navChevron, { color: theme.colors.textSecondary }]}>‹</Text>
                    </Pressable>
                    <Text style={[styles.navCurrentLabel, { color: theme.colors.text }]}>
                        {MONTH_NAMES[month]}
                    </Text>
                    <Pressable onPress={nextMonth} hitSlop={16}>
                        <Text style={[styles.navChevron, { color: theme.colors.textSecondary }]}>›</Text>
                    </Pressable>
                </View>
                <Pressable onPress={nextMonth} hitSlop={16}>
                    <Text style={[styles.navSideLabel, { color: theme.colors.textSecondary }]}>
                        {MONTH_NAMES[(month + 1) % 12]}
                    </Text>
                </Pressable>
            </View>

            {/* ── Day cards ── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {days.map((date, index) => {
                    const dateStr = fmtDateKey(date);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedStr;
                    const items = getDayItems(date);

                    const fallbackPillColor = CARD_TINTS[index % CARD_TINTS.length];

                    // Time window: Start exactly at earliest task, pad 1hr after latest
                    let minH = 8, maxH = 11;
                    if (items.length > 0) {
                        const hours = items.map(it => Math.floor(timeToMinutes(it.time) / 60));
                        minH = Math.min(...hours);
                        maxH = Math.min(23, Math.max(...hours) + 2);
                    }
                    if (maxH - minH < 3) maxH = minH + 3;
                    const hourSpan = maxH - minH;
                    const totalMins = hourSpan * 60;

                    const isOccupied = new Array(totalMins).fill(false);
                    items.forEach(item => {
                        const mStart = timeToMinutes(item.time) - (minH * 60);
                        const dur = item.duration ?? 60;
                        for (let m = mStart; m < mStart + dur; m++) {
                            if (m >= 0 && m < totalMins) isOccupied[m] = true;
                        }
                    });

                    const cX = new Array(totalMins + 1).fill(0);
                    let currentX = 0;
                    for (let i = 0; i < totalMins; i++) {
                        cX[i] = currentX;
                        currentX += isOccupied[i] ? 1.5 : 0.35;
                    }
                    cX[totalMins] = currentX;

                    // Dynamic spacing to fit content automatically
                    const { width: SCREEN_WIDTH } = Dimensions.get('window');
                    const availableWidth = SCREEN_WIDTH - 125; // Account for left block and padding
                    const rawTimelineWidth = cX[totalMins];
                    const scaleFactor = Math.max(1, availableWidth / Math.max(1, rawTimelineWidth));
                    
                    const dynamicPillW = Math.max(50, Math.min(90, 60 * 1.5 * scaleFactor - 8));

                    // Pill layout: horizontal by time offset, vertical stack for same-hour conflicts
                    const hourStack: Record<number, number> = {};
                    const pillLayout = items.map(item => {
                        const mStart = timeToMinutes(item.time) - (minH * 60);
                        const h = Math.floor(mStart / 60);
                        const safeStart = Math.max(0, Math.min(totalMins, mStart));
                        const leftPx = cX[safeStart] * scaleFactor;
                        const row = hourStack[h] ?? 0;
                        hourStack[h] = row + 1;
                        return { leftPx, row };
                    });

                    const maxStack = items.length > 0 ? Math.max(...Object.values(hourStack)) : 1;
                    const pillsHeight = maxStack * (PILL_H + PILL_GAP) - PILL_GAP;
                    const cardHeight = Math.max(100, 44 + 22 + 10 + pillsHeight + 20);

                    // Content width = last pill's left edge + pill width + padding
                    const lastLeft = pillLayout.length > 0
                        ? Math.max(...pillLayout.map(p => p.leftPx))
                        : rawTimelineWidth * scaleFactor;
                    const timelineContentWidth = Math.max(
                        rawTimelineWidth * scaleFactor,
                        lastLeft + dynamicPillW + 24,
                    );

                    // Hour tick marks
                    const hourMarkers = Array.from({ length: hourSpan + 1 }, (_, i) => minH + i);

                    return (
                        <View
                            key={dateStr}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: theme.colors.card,
                                    borderColor: isSelected
                                        ? theme.colors.primary
                                        : isToday
                                            ? '#FF453A'
                                            : 'rgba(150,150,150,0.15)',
                                    borderWidth: isSelected || isToday ? 2 : 1,
                                    height: cardHeight,
                                },
                            ]}
                        >
                            {/* ── Left date block — tap target ── */}
                            <Pressable
                                onPress={() => onSelectDate(date)}
                                style={styles.cardLeft}
                            >
                                <Text style={[styles.cardWeekday, { color: isToday ? '#FF453A' : theme.colors.textSecondary }]}>
                                    {DAY_NAMES[date.getDay()]}
                                </Text>
                                <Text style={[
                                    styles.cardDateNum,
                                    { color: isToday ? '#FF453A' : theme.colors.text },
                                ]}>
                                    {date.getDate()}
                                </Text>
                                <Text style={[styles.cardMonthTag, { color: isToday ? 'rgba(255, 69, 58, 0.8)' : theme.colors.textSecondary }]}>
                                    {MONTH_NAMES[month]}
                                </Text>
                            </Pressable>

                            {/* Thin vertical divider */}
                            <View style={[styles.rule, { backgroundColor: 'rgba(150,150,150,0.2)' }]} />

                            {/* ── Horizontally scrollable timeline ── */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.timelineScroll}
                                contentContainerStyle={{ width: timelineContentWidth }}
                                nestedScrollEnabled
                            >
                                <View style={{ width: timelineContentWidth, flex: 1 }}>

                                    {/* Hour label row */}
                                    <View style={[styles.hourRow, { width: timelineContentWidth }]}>
                                        {hourMarkers.map((h) => {
                                            const label = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
                                            return (
                                                <View
                                                    key={h}
                                                    style={[styles.hourMarkerWrap, { left: cX[(h - minH) * 60] * scaleFactor }]}
                                                >
                                                    <Text style={[styles.hourLabel, { color: theme.colors.textSecondary }]}>
                                                        {label}
                                                    </Text>
                                                    <View style={[styles.hourTick, {
                                                        backgroundColor: 'rgba(150,150,150,0.15)',
                                                        height: pillsHeight + 10,
                                                    }]} />
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Pills */}
                                    <View style={[styles.pillsLayer, { height: pillsHeight, width: timelineContentWidth }]}>
                                        {items.length === 0 ? (
                                            <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                                                No tasks
                                            </Text>
                                        ) : (
                                            items.map((item, ti) => {
                                                const { leftPx, row } = pillLayout[ti];
                                                const pillColor = item.imageKey
                                                    ? (TASK_COLORS[item.imageKey] ?? fallbackPillColor)
                                                    : fallbackPillColor;
                                                return (
                                                    <View
                                                        key={ti}
                                                        style={[
                                                            styles.pill,
                                                            {
                                                                backgroundColor: pillColor,
                                                                left: leftPx,
                                                                top: row * (PILL_H + PILL_GAP),
                                                                width: dynamicPillW,
                                                            },
                                                        ]}
                                                    >
                                                        <Text style={styles.pillText} numberOfLines={1}>
                                                            {item.task ?? item.imageKey?.replace(/_/g, ' ') ?? ''}
                                                        </Text>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>

                                </View>
                            </ScrollView>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 18,
    },
    navSideLabel: {
        fontSize: 18,
        fontWeight: '300',
        letterSpacing: 2,
        opacity: 0.45,
        width: 44,
        textAlign: 'center',
    },
    navCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    navChevron: {
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '300',
        paddingHorizontal: 4,
    },
    navCurrentLabel: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 2,
        minWidth: 72,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 180,
        gap: 12,
    },
    card: {
        borderRadius: 22,
        flexDirection: 'row',
        paddingLeft: 16,
        paddingVertical: 14,
        overflow: 'hidden',
    },
    cardLeft: {
        width: 72,
        justifyContent: 'flex-start',
    },
    cardWeekday: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    cardDateNum: {
        fontSize: 48,
        fontWeight: '700',
        lineHeight: 50,
        letterSpacing: -2,
        marginTop: 1,
    },
    cardMonthTag: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 2,
    },
    rule: {
        width: 1,
        marginHorizontal: 10,
        alignSelf: 'stretch',
        borderRadius: 1,
    },
    timelineScroll: {
        flex: 1,
    },
    hourRow: {
        height: 22,
        position: 'relative',
        marginBottom: 8,
    },
    hourMarkerWrap: {
        position: 'absolute',
        top: 0,
        alignItems: 'flex-start',
    },
    hourLabel: {
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 0.2,
        marginBottom: 2,
        opacity: 0.7,
    },
    hourTick: {
        width: 1,
    },
    pillsLayer: {
        position: 'relative',
    },
    pill: {
        position: 'absolute',
        height: PILL_H,
        paddingHorizontal: 8,
        borderRadius: 8,
        justifyContent: 'center',
    },
    pillText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    emptyHint: {
        fontSize: 11,
        opacity: 0.35,
        marginTop: 4,
    },
});