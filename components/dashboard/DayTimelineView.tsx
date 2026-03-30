import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from '../../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Theme } from '../../constants/shared';
import { useTheme } from '../../context/ThemeContext';
import { RoutineItem, timeToMinutes } from '../../utils/utils';
import { MergedTaskChain } from './MergedTaskChain';
import { MonthCalendarView } from './MonthCalendarView';

/* ─────────────────────────────── Config ─────────────────────────────── */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Width reserved for the time-label column on the left */
const TIME_AXIS_WIDTH = 44;

/** Column count and width are computed dynamically inside the component based on viewMode */
const COL_WIDTH_3DAY = (SCREEN_WIDTH - TIME_AXIS_WIDTH - 16) / 3;
const COL_WIDTH_7DAY = (SCREEN_WIDTH - TIME_AXIS_WIDTH - 16) / 7;

/** Circle sizes — selected day is larger */
const CIRCLE_SEL = 80;
const CIRCLE_OTHER = 30;
/** Warm color palette for task types (sleep = dark, alarm = amber, etc.) */
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─────────────────────────────── Helpers ────────────────────────────── */

const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const get3DayDates = (centerDate: Date): Date[] =>
    Array.from({ length: 3 }, (_, i) => {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() + (i - 1));
        return d;
    });

const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekDates = (date: Date): Date[] => {
    const sunday = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
    });
};

/** Default task duration in minutes when item.duration is absent */
const DEFAULT_DURATION = 30;

export const getTimelineMinute = (timeStr: string, startHour: number) => {
    let m = timeToMinutes(timeStr);
    if (m < startHour * 60) m += 24 * 60;
    return m - (startHour * 60);
};

/* ─────────────────────────────── Icon map ───────────────────────────── */

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    wakeup: 'alarm-outline',
    sleep: 'moon-outline',
    water: 'water-outline',
    tea_journal: 'cafe-outline',
    breakfast: 'restaurant-outline',
    lunch: 'restaurant-outline',
    dinner: 'restaurant-outline',
    study: 'book-outline',
    walk: 'walk-outline',
    yoga: 'fitness-outline',
    reflect: 'journal-outline',
    prepare_sleep: 'bed-outline',
    breathe: 'leaf-outline',
};

/* ─────────────────────────────── Props ──────────────────────────────── */

interface DayTimelineViewProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    routineItems: RoutineItem[];
    onPressPeek?: () => void;
    scrollY?: Animated.Value;
    listAnim?: Animated.Value;
    onPressTask?: (item: RoutineItem) => void;
}

/* ───────────────────────────── TimeAxisItem ─────────────────────────── */

const TimeAxisItem = memo<{
    num: string;
    ampm: string;
    topY: number;
    circleHalf: number;
    theme: Theme;
}>(({ num, ampm, topY, circleHalf, theme }) => (
    <View
        style={{
            position: 'absolute',
            top: topY - 8,
            left: 0,
            width: TIME_AXIS_WIDTH - 6,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
        }}
    >
        <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, opacity: 0.6 }}>
            {num}
        </Text>
        <Text style={{ fontSize: 7, fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, opacity: 0.6, marginTop: 1, marginLeft: 1 }}>
            {ampm}
        </Text>
    </View>
));


/* ───────────────────────────── TimelinePage ─────────────────────────── */

const TimelinePage = memo<{
    pageDates: Date[];
    allRoutines: RoutineItem[];
    selectedKey: string;
    todayKey: string;
    circleSel: number;
    circleOther: number;
    is7Day: boolean;
    COL_WIDTH: number;
    theme: Theme;
    styles: any;
    handleSelectDate: (date: Date) => void;
    startHour: number;
    totalMinutes: number;
    timeLabels: { hour: number; num: string; ampm: string }[];
    onPressTask?: (item: RoutineItem) => void;
}>(({
    pageDates, allRoutines, selectedKey, todayKey,
    circleSel, circleOther, is7Day, COL_WIDTH, theme, styles, handleSelectDate,
    startHour, totalMinutes, timeLabels, onPressTask
}) => {
    const { cumY, dynamicBodyHeight, timeAxisPositions } = useMemo(() => {
        // Occupied-minute map (union across all visible days)
        const isOccupied = new Array(totalMinutes).fill(false);

        // Per-column max tasks per hour — only expand when a SINGLE column
        // genuinely has ≥2 tasks in the same hour
        const TOTAL_HOURS = totalMinutes / 60;
        const maxTasksPerHour = new Array(TOTAL_HOURS).fill(0);

        pageDates.forEach(date => {
            const di = date.getDay();
            const dateStr = formatDateKey(date);
            const items = allRoutines.filter(item =>
                item.daysOfWeek?.includes(di) || item.date === dateStr
            );

            // Per-column hour counter (reset for every column)
            const colTasksPerHour = new Array(TOTAL_HOURS).fill(0);

            items.forEach(item => {
                const itemStart = getTimelineMinute(item.time, startHour);
                const duration = item.duration ?? DEFAULT_DURATION;
                const itemEnd = itemStart + duration;

                for (let m = itemStart; m < itemEnd; m++) {
                    if (m >= 0 && m < totalMinutes) isOccupied[m] = true;
                }

                // Which hour slots does this task touch?
                const startHourIdx = Math.floor(itemStart / 60);
                const endHourIdx = Math.floor((itemEnd - 1) / 60);
                for (let h = startHourIdx; h <= endHourIdx; h++) {
                    if (h >= 0 && h < TOTAL_HOURS) colTasksPerHour[h]++;
                }
            });

            // Take the max across all columns
            for (let h = 0; h < TOTAL_HOURS; h++) {
                maxTasksPerHour[h] = Math.max(maxTasksPerHour[h], colTasksPerHour[h]);
            }
        });

        // ── First pass: build cumulative Y with expanded/compact rates ──
        const cY = new Array(totalMinutes + 1).fill(0);
        let currentY = 0;
        const expandedMult = is7Day ? 0.9 : 1.5;
        const compactMult = is7Day ? 0.35 : 0.5;

        for (let i = 0; i < totalMinutes; i++) {
            cY[i] = currentY;

            const hourIdx = Math.floor(i / 60);
            const busyHour = (maxTasksPerHour[hourIdx] ?? 0) >= 2;

            if (isOccupied[i]) {
                currentY += expandedMult;
            } else if (busyHour) {
                currentY += expandedMult;
            } else {
                currentY += compactMult;
            }
        }
        cY[totalMinutes] = currentY;

        // ── Second pass: two-layer minimum-height guarantee ──
        const selCircle = is7Day ? 28 : CIRCLE_SEL;
        const minPillPx = selCircle + 4; // each pill needs at least this many px

        // Helper to inflate a minute range [rangeStart..rangeEnd] in cY
        const inflateRange = (rangeStart: number, rangeEnd: number, requiredSpan: number) => {
            const s = Math.max(0, Math.min(totalMinutes, Math.floor(rangeStart)));
            const e = Math.max(0, Math.min(totalMinutes, Math.floor(rangeEnd)));
            const yStart = cY[s];
            const yEnd = cY[e];
            const currentSpan = yEnd - yStart;
            if (currentSpan >= requiredSpan || currentSpan <= 0) return;

            const scale = requiredSpan / currentSpan;
            const delta = requiredSpan - currentSpan;
            for (let m = s; m <= e; m++) {
                cY[m] = yStart + (cY[m] - yStart) * scale;
            }
            for (let m = e + 1; m <= totalMinutes; m++) {
                cY[m] += delta;
            }
        };

        // Layer 1: Per-task — ensure EVERY task's cumY span is at least
        // minPillPx so that even short tasks get a full-sized pill and
        // sequential pills within the same hour never visually overlap.
        // Process tasks in chronological order so shifts propagate correctly.
        const allTasks: { startMin: number; endMin: number }[] = [];
        pageDates.forEach(date => {
            const di = date.getDay();
            const dateStr = formatDateKey(date);
            allRoutines
                .filter(item => item.daysOfWeek?.includes(di) || item.date === dateStr)
                .forEach(item => {
                    const start = getTimelineMinute(item.time, startHour);
                    const dur = item.duration ?? DEFAULT_DURATION;
                    allTasks.push({ startMin: start, endMin: start + dur });
                });
        });

        // Deduplicate tasks that have the same time range (e.g. same repeating task on different days)
        const seen = new Set<string>();
        const uniqueTasks = allTasks.filter(t => {
            const key = `${t.startMin}-${t.endMin}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        uniqueTasks.sort((a, b) => a.startMin - b.startMin);

        for (const task of uniqueTasks) {
            inflateRange(task.startMin, task.endMin, minPillPx);
        }

        // Layer 2: Cluster-level — ensure overlapping tasks that merge
        // into a single chain have enough room for N stacked pills.
        pageDates.forEach(date => {
            const di = date.getDay();
            const dateStr = formatDateKey(date);
            const items = allRoutines
                .filter(item => item.daysOfWeek?.includes(di) || item.date === dateStr)
                .sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));

            type Cluster = { count: number; startMin: number; endMin: number };
            const colClusters: Cluster[] = [];
            items.forEach(item => {
                const start = getTimelineMinute(item.time, startHour);
                const dur = item.duration ?? DEFAULT_DURATION;
                const end = start + dur;
                if (colClusters.length === 0) {
                    colClusters.push({ count: 1, startMin: start, endMin: end });
                } else {
                    const last = colClusters[colClusters.length - 1];
                    if (start <= last.endMin) {
                        last.count++;
                        last.endMin = Math.max(last.endMin, end);
                    } else {
                        colClusters.push({ count: 1, startMin: start, endMin: end });
                    }
                }
            });

            colClusters
                .filter(c => c.count >= 2)
                .sort((a, b) => a.startMin - b.startMin)
                .forEach(c => inflateRange(c.startMin, c.endMin, c.count * minPillPx));
        });

        const positions = timeLabels.map(tl => {
            const m = (tl.hour - startHour) * 60;
            const topY = cY[Math.max(0, Math.min(totalMinutes, m))] || 0;
            return { ...tl, topY };
        });

        return { cumY: cY, dynamicBodyHeight: cY[totalMinutes], timeAxisPositions: positions };
    }, [pageDates, allRoutines, is7Day, startHour, totalMinutes, timeLabels]);

    return (
        <ScrollView
            style={{ width: SCREEN_WIDTH }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
        >
            {/* Day header row */}
            <View style={styles.dayHeaderRow}>
                {/* Spacer for time axis */}
                <View style={{ width: TIME_AXIS_WIDTH }} />
                {pageDates.map(date => {
                    const key = formatDateKey(date);
                    const dayIndex = date.getDay();
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    return (
                        <Pressable
                            key={key}
                            style={[styles.dayHeaderCell, { flex: 1 }]}
                            onPress={() => handleSelectDate(date)}
                        >
                            <View style={{ height: 16, justifyContent: 'center' }}>
                                <Text style={[
                                    styles.dayLabel,
                                    isSelected && styles.dayLabelSelected,
                                    isToday && !isSelected && { color: theme.colors.primary, opacity: 0.5 },
                                ]}>
                                    {DAY_LABELS[dayIndex]}
                                </Text>
                            </View>
                            {/* Date badge */}
                            <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                                <View style={[
                                    styles.dateBadge,
                                    isSelected && styles.dateBadgeSelected,
                                    isToday && !isSelected && styles.dateBadgeToday,
                                ]}>
                                    {isSelected ? (
                                        <LinearGradient
                                            colors={[theme.colors.primary, `${theme.colors.primary}CC`]}
                                            style={styles.dateBadgeGradient}
                                            start={{ x: 0.3, y: 0 }}
                                            end={{ x: 0.8, y: 1 }}
                                        >
                                            <Text style={[styles.dateNumSelected]}>
                                                {date.getDate()}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={[
                                            styles.dateNum,
                                            isToday && { color: theme.colors.primary },
                                        ]}>
                                            {date.getDate()}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {/* Body row — time axis + columns */}
            <View style={styles.bodyRow}>
                {/* ── Left time axis ── */}
                <View style={[styles.timeAxis, { height: dynamicBodyHeight }]}>
                    {timeAxisPositions.map(tl => (
                        <TimeAxisItem
                            key={tl.hour}
                            num={tl.num}
                            ampm={tl.ampm}
                            topY={tl.topY}
                            circleHalf={circleSel / 2}
                            theme={theme}
                        />
                    ))}
                </View>

                {/* ── Horizontal time reference lines ── */}
                {timeAxisPositions.map(tl => (
                    <View
                        key={`hline-${tl.hour}`}
                        style={{
                            position: 'absolute',
                            top: tl.topY,
                            left: TIME_AXIS_WIDTH,
                            right: 8,
                            height: StyleSheet.hairlineWidth,
                            backgroundColor: `${theme.colors.text}08`,
                        }}
                    />
                ))}

                {/* ── 3 day columns ── */}
                {pageDates.map(date => {
                    const key = formatDateKey(date);
                    const dayIndex = date.getDay();
                    const dateStr = formatDateKey(date);
                    const isSelected = key === selectedKey;
                    const dayItems = allRoutines.filter(item =>
                        item.daysOfWeek?.includes(dayIndex) || item.date === dateStr
                    ).sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));
                    const circleSize = isSelected ? circleSel : circleOther;
                    const lineColor = isSelected
                        ? `${theme.colors.primary}35`
                        : `${theme.colors.text}0D`;

                    return (
                        <View
                            key={key}
                            style={[styles.column, { flex: 1, opacity: isSelected ? 1 : 0.45, height: dynamicBodyHeight }]}
                        >
                            {/* Vertical line */}
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,
                                alignItems: 'center',
                                pointerEvents: 'none',
                            }}>
                                <View style={{
                                    flex: 1,
                                    width: isSelected ? 2 : 1.5,
                                    backgroundColor: lineColor,
                                    borderRadius: 1,
                                }} />
                            </View>

                            {/* Clustering overlapping items to visually merge them into chained capsules */}
                            {(() => {
                                const clusters: { items: RoutineItem[]; startMins: number; endMins: number }[] = [];
                                dayItems.forEach(item => {
                                    const start = getTimelineMinute(item.time, startHour);
                                    const dur = item.duration ?? DEFAULT_DURATION;
                                    const end = start + dur;

                                    if (clusters.length === 0) {
                                        clusters.push({ items: [item], startMins: start, endMins: end });
                                    } else {
                                        const lastCluster = clusters[clusters.length - 1];
                                        if (start <= lastCluster.endMins) {
                                            lastCluster.items.push(item);
                                            lastCluster.endMins = Math.max(lastCluster.endMins, end);
                                        } else {
                                            clusters.push({ items: [item], startMins: start, endMins: end });
                                        }
                                    }
                                });

                                const getCumY = (m: number) => {
                                    if (m <= 0) return cumY[0];
                                    if (m >= totalMinutes) return cumY[totalMinutes];
                                    return cumY[Math.floor(m)] || 0;
                                };

                                return clusters.map((cluster, idx) => {
                                    const topY = getCumY(cluster.startMins);
                                    const bottomY = getCumY(cluster.endMins);
                                    const totalHeight = Math.max(circleSize, bottomY - topY);

                                    return (
                                        <View
                                            key={`cluster-${idx}`}
                                            style={{
                                                position: 'absolute',
                                                top: topY,
                                                left: 0,
                                                right: 0,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <MergedTaskChain
                                                cluster={cluster.items}
                                                size={circleSize}
                                                isSelected={isSelected}
                                                theme={theme}
                                                cumY={cumY}
                                                TOTAL_MINUTES={totalMinutes}
                                                startHour={startHour}
                                                onPressTask={onPressTask}
                                            />
                                        </View>
                                    );
                                });
                            })()}
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
});

/* ─────────────────────────────── Component ──────────────────────────── */

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
    selectedDate,
    onSelectDate,
    routineItems,
    onPressPeek,
    scrollY,
    listAnim,
    onPressTask,
}) => {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [viewMode, setViewMode] = React.useState<'3-day' | '7-day' | 'month'>('3-day');
    const is7Day = viewMode === '7-day';
    const COL_WIDTH = is7Day ? COL_WIDTH_7DAY : COL_WIDTH_3DAY;

    // Circle sizes — in 7-day view everything is smaller to fit
    const circleSel = is7Day ? 28 : CIRCLE_SEL;
    const circleOther = is7Day ? 18 : CIRCLE_OTHER;

    /* ── Collapse animations (header shrinks when list scrolls) ── */
    const headerCollapseAnim = useMemo(() => {
        if (!scrollY && !listAnim) return new Animated.Value(0);
        const anims: Animated.Value[] = [];
        if (listAnim) anims.push(listAnim);
        if (scrollY) {
            anims.push(
                scrollY.interpolate({
                    inputRange: [0, 90],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                }) as unknown as Animated.Value
            );
        }
        if (anims.length === 2) {
            return Animated.add(anims[0], anims[1]).interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
            });
        }
        return anims[0] ?? new Animated.Value(0);
    }, [scrollY, listAnim]);

    const headerPaddingTop = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [14, 34],
    });
    const headerFontSize = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [22, 30],
    });
    const collapseOpacity = headerCollapseAnim.interpolate({
        inputRange: [0, 0.6],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const handleSelectDate = useCallback((date: Date) => {
        Haptics.selectionAsync();
        onSelectDate(date);
    }, [onSelectDate]);

    /* ── Dynamic Bounds based on Wake Up / Sleep tasks ── */
    const { startHour, endHour, totalMinutes, timeLabels } = useMemo(() => {
        let minH = 6;
        let maxH = 26;

        const wakeUps = routineItems.filter(i => i.task?.toLowerCase().trim() === 'wake up' || i.imageKey === 'wakeup');
        const sleeps = routineItems.filter(i => i.task?.toLowerCase().trim() === 'sleep' || i.imageKey === 'sleep');

        if (wakeUps.length > 0) {
            minH = Math.min(...wakeUps.map(i => Math.floor(timeToMinutes(i.time) / 60)));
        }

        if (sleeps.length > 0) {
            maxH = Math.max(...sleeps.map(i => {
                let m = timeToMinutes(i.time);
                if (m < minH * 60) m += 24 * 60;
                const dur = i.duration ?? DEFAULT_DURATION;
                return Math.ceil((m + dur) / 60);
            }));
        } else if (wakeUps.length > 0) {
            maxH = minH + 16;
        }

        if (maxH <= minH) maxH = minH + 12;

        const tMins = (maxH - minH) * 60;
        const labels = [];
        for (let h = minH; h <= maxH; h++) {
            const displayH = h % 24;
            const ampm = displayH < 12 ? 'AM' : 'PM';
            let num = displayH % 12;
            if (num === 0) num = 12;
            labels.push({ hour: h, num: num.toString(), ampm });
        }

        return { startHour: minH, endHour: maxH, totalMinutes: tMins, timeLabels: labels };
    }, [routineItems]);

    /* ── Items grouped by day-of-week ── */


    const currentDayItems = useMemo(() => {
        const dow = selectedDate.getDay();
        const dateStr = formatDateKey(selectedDate);
        return routineItems.filter(item =>
            item.daysOfWeek?.includes(dow) || item.date === dateStr
        ).sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));
    }, [routineItems, selectedDate, startHour]);
    const firstItem = currentDayItems[0] ?? null;

    /* ── Date helpers ── */
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const selectedKey = formatDateKey(selectedDate);
    const todayKey = formatDateKey(today);

    // Number of pages around today (e.g. 260 weeks = 5 years)
    const RANGE_PAGES = 260;

    // Compute the pages and initial index
    const { pages, initialPageIndex } = useMemo(() => {
        const p: Date[][] = [];
        let todayIdx = 0;

        for (let i = -RANGE_PAGES; i <= RANGE_PAGES; i++) {
            const anchor = new Date(today);
            if (is7Day) {
                anchor.setDate(anchor.getDate() + (i * 7));
                p.push(getWeekDates(anchor));
            } else {
                anchor.setDate(anchor.getDate() + (i * 3));
                p.push(get3DayDates(anchor));
            }
            if (i === 0) todayIdx = p.length - 1;
        }
        return { pages: p, initialPageIndex: todayIdx };
    }, [today, is7Day]);

    const initialTargetIndex = useMemo(() => {
        const dateStr = formatDateKey(selectedDate);
        const idx = pages.findIndex(page => page.some(d => formatDateKey(d) === dateStr));
        return idx !== -1 ? idx : initialPageIndex;
    }, [pages, selectedDate, initialPageIndex]);

    const flatListRef = useRef<FlatList>(null);

    // Sync scroll when viewMode changes
    React.useEffect(() => {
        if (viewMode === 'month') return;

        const dateStr = formatDateKey(selectedDate);
        const targetIndex = pages.findIndex(page => page.some(d => formatDateKey(d) === dateStr));
        const indexToScroll = targetIndex !== -1 ? targetIndex : initialPageIndex;

        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: indexToScroll, animated: false });
        }, 50);
    }, [viewMode, is7Day, selectedDate]);

    const renderPage = useCallback(({ item: pageDates }: { item: Date[] }) => (
        <TimelinePage
            pageDates={pageDates}
            allRoutines={routineItems}
            selectedKey={selectedKey}
            todayKey={todayKey}
            circleSel={circleSel}
            circleOther={circleOther}
            is7Day={is7Day}
            COL_WIDTH={COL_WIDTH}
            theme={theme}
            styles={styles}
            handleSelectDate={handleSelectDate}
            startHour={startHour}
            totalMinutes={totalMinutes}
            timeLabels={timeLabels}
            onPressTask={onPressTask}
        />
    ), [routineItems, selectedKey, todayKey, circleSel, circleOther, is7Day, COL_WIDTH, theme, styles, handleSelectDate, startHour, totalMinutes, timeLabels, onPressTask]);

    // Split header date into weekday + rest
    const dateHeader = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const [weekdayStr, ...restParts] = dateHeader.split(', ');
    const restStr = restParts.join(', ');

    const router = useRouter();

    return (
        <View style={styles.outer} testID="day-timeline-view">

            {/* ── Header ── */}
            <Animated.View style={[styles.header, { paddingTop: headerPaddingTop }]}>

                <Pressable onPress={() => router.back()} style={styles.backButton} testID="back-button">
                    {({ pressed }) => (
                        <View style={[styles.backIconCircle, pressed && { opacity: 0.6, transform: [{ scale: 0.93 }] }]}>
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </View>
                    )}
                </Pressable>

                <Pressable style={styles.headerDateBlock} onPress={() => handleSelectDate(today)}>
                    <View style={styles.headerDateInner}>
                        <Animated.Text style={[styles.headerWeekday, { fontSize: headerFontSize }]}>
                            {weekdayStr}
                        </Animated.Text>
                        <Animated.Text style={[
                            styles.headerRest,
                            {
                                fontSize: headerCollapseAnim.interpolate({
                                    inputRange: [0, 1], outputRange: [13, 15],
                                }),
                            },
                        ]}>
                            {restStr}
                        </Animated.Text>
                    </View>
                </Pressable>

                {/* ── View-mode toggle (calendar-outline = 3-day, calendar = 7-day, grid = month) ── */}
                <Animated.View style={{ opacity: collapseOpacity }}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setViewMode(prev => {
                                if (prev === '3-day') return '7-day';
                                if (prev === '7-day') return 'month';
                                return '3-day';
                            });
                        }}
                        style={styles.viewToggleBtn}
                        testID="view-toggle-btn"
                    >
                        <Ionicons
                            name={viewMode === '3-day' ? 'calendar' : viewMode === '7-day' ? 'grid' : 'calendar-outline'}
                            size={22}
                            color={theme.colors.primary}
                        />
                    </Pressable>
                </Animated.View>
            </Animated.View>

            {viewMode === 'month' ? (
                <MonthCalendarView
                    currentDate={selectedDate || today}
                    routineItems={routineItems}
                    onSelectDate={(date) => {
                        handleSelectDate(date);
                        setViewMode('3-day');
                    }}
                    theme={theme}
                />
            ) : (
                <>
                    {/* ── Timeline (virtualized FlatList for multi-year calendar) ── */}
                    <Animated.View style={[styles.timelineWrapper, { opacity: collapseOpacity }]}>
                        <FlatList
                            ref={flatListRef}
                            data={pages}
                            renderItem={renderPage}
                            keyExtractor={(_, index) => `page-${index}`}
                            horizontal
                            pagingEnabled={Platform.OS !== 'web'}
                            snapToInterval={Platform.OS === 'web' ? SCREEN_WIDTH : undefined}
                            snapToAlignment="start"
                            decelerationRate={Platform.OS === 'web' ? "fast" : "normal"}
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={initialTargetIndex}
                            getItemLayout={(_, index) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * index,
                                index,
                            })}
                            // Performance optimizations
                            windowSize={3}
                            maxToRenderPerBatch={2}
                            updateCellsBatchingPeriod={50}
                            removeClippedSubviews={Platform.OS === 'android'}
                            onScrollToIndexFailed={info => {
                                flatListRef.current?.scrollToOffset({
                                    offset: info.averageItemLength * info.index,
                                    animated: false,
                                });
                            }}
                        />
                    </Animated.View>

                    {/* ── Peek card ── */}
                    {firstItem && (
                        <Animated.View style={[styles.peekWrapper, { opacity: collapseOpacity }]}>
                            <View style={styles.peekDivider} />
                            <Pressable
                                style={({ pressed }) => [
                                    styles.peekCard,
                                    pressed && { opacity: 0.88, transform: [{ scale: 0.975 }] },
                                ]}
                                onPress={onPressPeek}
                                testID="peek-card"
                            >
                                <BlurView intensity={100} tint={isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <LinearGradient
                                    colors={[`${theme.colors.primary}18`, `${theme.colors.primary}04`]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <View style={[styles.peekAccentBar, { backgroundColor: theme.colors.primary }]} />

                                <View style={styles.peekCircleWrapper}>
                                    <LinearGradient
                                        colors={[theme.colors.primary, `${theme.colors.primary}BB`]}
                                        style={styles.peekCircle}
                                        start={{ x: 0.1, y: 0 }}
                                        end={{ x: 0.9, y: 1 }}
                                    >
                                        <Ionicons
                                            name={ICON_MAP[firstItem.imageKey ?? ''] ?? 'ellipse-outline'}
                                            size={22}
                                            color={theme.colors.white}
                                        />
                                    </LinearGradient>
                                </View>

                                <View style={styles.peekText}>
                                    <View style={styles.peekTimeRow}>
                                        <Ionicons
                                            name="time-outline"
                                            size={11}
                                            color={theme.colors.textSecondary}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.peekTime}>{firstItem.time}</Text>
                                        <View style={[styles.peekBadge, { backgroundColor: `${theme.colors.primary}14` }]}>
                                            <Text style={[styles.peekBadgeText, { color: theme.colors.primary }]}>
                                                {firstItem.daysOfWeek?.length ? "↺ Daily" : "Once"}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.peekTitle} numberOfLines={1} testID="peek-title">
                                        {firstItem.task}
                                    </Text>
                                </View>

                                <View style={[
                                    styles.peekChevron,
                                    { borderColor: `${theme.colors.primary}40`, backgroundColor: `${theme.colors.primary}10` },
                                ]}>
                                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                                </View>
                            </Pressable>
                        </Animated.View>
                    )}
                </>
            )}
        </View>
    );
};

/* ─────────────────────────────── Styles ─────────────────────────────── */

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        outer: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },

        /* ── Header ── */
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 25,
            height: 70, // Fixed height for iOS
            backgroundColor: theme.colors.background,
            zIndex: 100,
        },
        backButton: {
            marginRight: 10,
        },
        backIconCircle: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${theme.colors.text}08`, // Verifying color change
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: `${theme.colors.text}10`,
        },
        headerDateBlock: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 4,
        },
        headerDateInner: {
            alignItems: 'flex-start',
            gap: 1,
        },
        headerWeekday: {
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 36, // Slightly taller
            letterSpacing: -0.5,
        },
        headerRest: {
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            letterSpacing: 0.1,
            marginTop: 0,
        },
        headerArrowContainer: {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: `${theme.colors.primary}12`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
        },
        viewToggleBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${theme.colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
        },

        /* ── Timeline layout ── */
        timelineWrapper: {
            flex: 1,
        },

        /* Day header row (day labels + date badges) */
        dayHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 0,
            paddingBottom: 12,
            paddingTop: 4,
            borderBottomWidth: 0,
            borderBottomColor: 'transparent',
        },
        dayHeaderCell: {
            alignItems: 'center',
            gap: 2,
        },
        dayLabel: {
            fontSize: 10,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            opacity: 0.35,
        },
        dayLabelSelected: {
            color: theme.colors.primary,
            opacity: 1,
            fontSize: 12,
            letterSpacing: 2,
            fontFamily: theme.fonts.bold,
        },
        dateBadge: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        dateBadgeSelected: {
            width: 52,
            height: 52,
            borderRadius: 26,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.55,
                    shadowRadius: 16,
                },
                android: { elevation: 10 },
            }),
        },
        dateBadgeGradient: {
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateBadgeToday: {
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}50`,
        },
        dateNum: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
            opacity: 0.6,
        },
        dateNumSelected: {
            fontSize: 20,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
            letterSpacing: -0.5,
        },

        /* Body row = time axis + columns */
        bodyRow: {
            flexDirection: 'row',
            paddingRight: 0, // Remove right padding so columns perfectly align with header cells
            paddingBottom: CIRCLE_SEL / 2, // space for pill caps at top/bottom
        },

        /* Left time axis */
        timeAxis: {
            width: TIME_AXIS_WIDTH,
            position: 'relative',
        },

        /* Day column */
        column: {
            position: 'relative',
        },


        /* ── Peek card ── */
        peekWrapper: {
            paddingBottom: 22,
        },
        peekDivider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: `${theme.colors.text}10`,
            marginBottom: 14,
            marginHorizontal: 20,
        },
        peekCard: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingVertical: 14,
            backgroundColor: theme.colors.card,
            marginHorizontal: 16,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: `${theme.colors.primary}18`,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 14,
                },
                android: { elevation: 5 },
            }),
        },
        peekAccentBar: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
        },
        peekCircleWrapper: {
            marginRight: 14,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                },
                android: { elevation: 4 },
            }),
        },
        peekCircle: {
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
        },
        peekText: { flex: 1 },
        peekTimeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
            gap: 4,
        },
        peekTime: {
            fontSize: 11,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            letterSpacing: 0.3,
        },
        peekBadge: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
        },
        peekBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.bold,
            letterSpacing: 0.2,
        },
        peekTitle: {
            fontSize: 19,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            letterSpacing: -0.3,
        },
        peekChevron: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            marginLeft: 8,
        },
    });