import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from '../../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
    Animated,
    FlatList,
    InteractionManager,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { Theme } from '../../styles/shared';
import { useTheme } from '../../context/ThemeContext';
import { RoutineItem, timeToMinutes, getRoutineItemsForDate, ICON_MAP, isWakeupOrSleep } from '../../utils/utils';
import { MonthCalendarView } from './MonthCalendarView';

/* ─────────────────────────────── Config ─────────────────────────────── */

/** Width reserved for the time-label column on the left and symmetric right margin */
const TIME_AXIS_WIDTH = 26;

/** Helper to compute column width dynamically based on screen width with symmetric margins */
const getColWidth = (screenWidth: number) => 
    (screenWidth - 2 * TIME_AXIS_WIDTH) / 7;

/** Circle sizes — well-proportioned for 7-day week timeline */
const CIRCLE_SEL = 28;
const CIRCLE_OTHER = 22;
/** Warm color palette for task types (sleep = dark, alarm = amber, etc.) */
export const TASK_COLORS: Record<string, string> = {
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
  commute: '#79B4B7',
  gym: '#FF9F80',
  cleaning: '#80CED7',
  pet: '#E3C75F',
  shopping: '#F6B8B8',
  coding: '#7EA0B7',
  gaming: '#BD93F9',
  finances: '#9AD0C2',
  laundry: '#C5DFF8',
  travel: '#7BC9FF',
  health: '#F875AA',
  podcast: '#C683D7',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─────────────────────────────── Helpers ────────────────────────────── */

const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;


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



/* ─────────────────────────────── Props ──────────────────────────────── */

interface DayTimelineViewProps {
    selectedDate: Date | null;
    onSelectDate: (date: Date | null) => void;
    routineItems: RoutineItem[];
    onPressPeek?: () => void;
    scrollY?: Animated.Value;
    listAnim?: Animated.Value;
    isTaskModalOpen?: boolean;
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
            top: topY - 7,
            left: 0,
            width: TIME_AXIS_WIDTH,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'baseline',
        }}
    >
        <Text style={{ fontSize: 9, fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, opacity: 0.55 }}>
            {num}
        </Text>
        <Text style={{ fontSize: 5.5, fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, opacity: 0.45, marginLeft: 0.5 }}>
            {ampm}
        </Text>
    </View>
));

/* ─────────────────────────── TimelineTaskPill ───────────────────────── */

const TimelineTaskPill = memo<{
    item: RoutineItem;
    size: number;
    pillHeight: number;
    isSelected: boolean;
    isDarkMode: boolean;
    theme: Theme;
    onPressTask?: (item: RoutineItem) => void;
    isOverlapping?: boolean;
    overlapIndex?: number;
}>(({ item, size, pillHeight, isSelected, isDarkMode, theme, onPressTask, isOverlapping, overlapIndex }) => {
    const taskColor = TASK_COLORS[item.imageKey ?? ''] ?? theme.colors.primary;
    const iconSize = Math.round(size * 0.46);

    return (
        <View
            style={[
                isOverlapping && Platform.select({
                    ios: {
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 2.5 },
                        shadowOpacity: isDarkMode ? 0.45 : 0.22,
                        shadowRadius: 4,
                    },
                    android: { elevation: 4 },
                }),
                !isOverlapping && isSelected && Platform.select({
                    ios: {
                        shadowColor: taskColor,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                    },
                    android: { elevation: 4 },
                }),
            ]}
        >
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPressTask?.(item);
                }}
                style={({ pressed }) => [
                    {
                        width: size,
                        height: pillHeight,
                        borderRadius: size / 2,
                        backgroundColor: theme.colors.background,
                        borderWidth: isOverlapping ? (isSelected ? 2 : 1.5) : (isSelected ? 1.5 : 1),
                        borderColor: isOverlapping
                            ? (isSelected ? `${taskColor}95` : `${taskColor}55`)
                            : (isSelected ? `${taskColor}75` : `${taskColor}30`),
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.94 }] },
                ]}
            >
                {/* Pastel tint layer on top of solid opaque base (blocks the timeline line) */}
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: isSelected ? `${taskColor}28` : `${taskColor}16` },
                    ]}
                />
                <Ionicons
                    name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                    size={iconSize}
                    color={taskColor}
                />
            </Pressable>
        </View>
    );
});

/* ───────────────────────────── TimelinePage ─────────────────────────── */

const TimelinePage = memo<{
    pageDates: Date[];
    allRoutines: RoutineItem[];
    selectedKey: string;
    todayKey: string;
    circleSel: number;
    circleOther: number;
    COL_WIDTH: number;
    screenWidth: number;
    theme: Theme;
    isDarkMode: boolean;
    styles: any;
    handleSelectDate: (date: Date) => void;
    startHour: number;
    totalMinutes: number;
    timeLabels: { hour: number; num: string; ampm: string }[];
    onPressTask?: (item: RoutineItem) => void;
    listAnim?: Animated.Value;
}>(({
    pageDates, allRoutines, selectedKey, todayKey,
    circleSel, circleOther, COL_WIDTH, screenWidth, theme, isDarkMode, styles, handleSelectDate,
    startHour, totalMinutes, timeLabels, onPressTask, listAnim
}) => {
    const badgesOpacity = useMemo(() => {
        if (!listAnim) return new Animated.Value(0);
        return listAnim.interpolate({
            inputRange: [0, 0.35, 1],
            outputRange: [0, 0, 1],
            extrapolate: 'clamp',
        });
    }, [listAnim]);

    const badgesHeight = useMemo(() => {
        if (!listAnim) return new Animated.Value(0);
        return listAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 16],
            extrapolate: 'clamp',
        });
    }, [listAnim]);

    const timelineOpacity = useMemo(() => {
        if (!listAnim) return new Animated.Value(1);
        return listAnim.interpolate({
            inputRange: [0, 0.4, 0.85, 1],
            outputRange: [1, 0.7, 0, 0],
            extrapolate: 'clamp',
        });
    }, [listAnim]);

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
            const items = getRoutineItemsForDate(allRoutines, date);

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
        const TOP_TIMELINE_PAD = 16;
        const cY = new Array(totalMinutes + 1).fill(0);
        let currentY = TOP_TIMELINE_PAD;
        const expandedMult = 0.9;
        const compactMult = 0.35;

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
        const selCircle = circleSel;
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
            getRoutineItemsForDate(allRoutines, date)
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
            const items = getRoutineItemsForDate(allRoutines, date)
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

        return { cumY: cY, dynamicBodyHeight: cY[totalMinutes] + TOP_TIMELINE_PAD, timeAxisPositions: positions };
    }, [pageDates, allRoutines, circleSel, startHour, totalMinutes, timeLabels]);

    return (
        <View style={{ width: screenWidth, flex: 1 }}>
            {/* Pinned Day header row */}
            <View style={styles.dayHeaderRow}>
                {/* Spacer for time axis */}
                <View style={{ width: TIME_AXIS_WIDTH }} />
                {pageDates.map(date => {
                    const key = formatDateKey(date);
                    const dayIndex = date.getDay();
                    const isSelected = Boolean(selectedKey && key === selectedKey);
                    const isToday = key === todayKey;
                    const dayTasks = getRoutineItemsForDate(allRoutines, date)
                        .sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));

                    const dayBadges = (() => {
                        if (dayTasks.length === 0) return [];
                        const wakeup = dayTasks.find(t => t.imageKey === 'wakeup' || t.task?.toLowerCase().includes('wake'));
                        const sleep = dayTasks.find(t => t.imageKey === 'sleep' || t.task?.toLowerCase().includes('sleep'));
                        const middle = dayTasks.filter(t => t !== wakeup && t !== sleep);
                        const result: RoutineItem[] = [];
                        if (wakeup) result.push(wakeup);
                        const middleSlots = isSelected ? 2 : 1;
                        result.push(...middle.slice(0, middleSlots));
                        if (sleep && !result.includes(sleep)) {
                            result.push(sleep);
                        }
                        return result;
                    })();

                    return (
                        <Pressable
                            key={key}
                            style={[styles.dayHeaderCell, { flex: 1 }]}
                            onPress={() => handleSelectDate(date)}
                        >
                            <View style={{ height: 18, justifyContent: 'center' }}>
                                <Text style={[
                                    styles.dayLabel,
                                    isSelected && styles.dayLabelSelected,
                                    isToday && !isSelected && { color: theme.colors.primary },
                                ]}>
                                    {DAY_LABELS[dayIndex]}
                                </Text>
                            </View>
                            {/* Date badge */}
                            <View style={styles.dateBadgeWrapper}>
                                <View style={[
                                    styles.dateBadge,
                                    isSelected && styles.dateBadgeSelected,
                                    isToday && !isSelected && styles.dateBadgeToday,
                                ]}>
                                    {isSelected ? (
                                        <LinearGradient
                                            colors={[theme.colors.primary, `${theme.colors.primary}E6`]}
                                            style={styles.dateBadgeGradient}
                                            start={{ x: 0.2, y: 0 }}
                                            end={{ x: 0.8, y: 1 }}
                                        >
                                            <Text style={styles.dateNumSelected}>
                                                {date.getDate()}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <Text style={[
                                            styles.dateNum,
                                            isToday && styles.dateNumToday,
                                        ]}>
                                            {date.getDate()}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Overlapping task icon badges for this day (only when task modal is up) */}
                            {dayBadges.length > 0 ? (
                                <Animated.View
                                    style={[
                                        styles.taskBadgesRow,
                                        {
                                            opacity: badgesOpacity,
                                            height: badgesHeight,
                                            overflow: 'hidden',
                                        },
                                    ]}
                                >
                                    {dayBadges.map((task, bIdx) => {
                                        const badgeColor = TASK_COLORS[task.imageKey ?? ''] ?? theme.colors.primary;
                                        const iconName = ICON_MAP[task.imageKey ?? ''] ?? 'ellipse-outline';
                                        return (
                                            <View
                                                key={`${task.id}-${bIdx}`}
                                                style={[
                                                    styles.taskBadgeDot,
                                                    {
                                                        backgroundColor: badgeColor,
                                                        marginLeft: bIdx === 0 ? 0 : -3.5,
                                                        zIndex: 10 + bIdx,
                                                    },
                                                ]}
                                            >
                                                <Ionicons name={iconName} size={7} color="#FFFFFF" />
                                            </View>
                                        );
                                    })}
                                </Animated.View>
                            ) : (
                                <Animated.View style={[styles.taskBadgesPlaceholder, { height: badgesHeight }]} />
                            )}
                        </Pressable>
                    );
                })}
                {/* Right spacer for symmetry */}
                <View style={{ width: TIME_AXIS_WIDTH }} />
            </View>

            {/* Vertically scrollable timeline body (hidden when task modal is up so it doesn't peek through rounded corners) */}
            <Animated.View style={{ flex: 1, opacity: timelineOpacity }}>
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 110 }}
                >
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
                            right: TIME_AXIS_WIDTH,
                            height: StyleSheet.hairlineWidth,
                            backgroundColor: `${theme.colors.text}08`,
                        }}
                    />
                ))}

                {/* ── 7 day columns (Week timeline) ── */}
                {pageDates.map(date => {
                    const key = formatDateKey(date);
                    const isSelected = Boolean(selectedKey && key === selectedKey);
                    const colItems = getRoutineItemsForDate(allRoutines, date)
                        .sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));
                    const circleSize = isSelected ? circleSel : circleOther;
                    const lineColor = isSelected
                        ? `${theme.colors.primary}35`
                        : `${theme.colors.text}0D`;

                    return (
                        <View
                            key={key}
                            style={[styles.column, { flex: 1, opacity: isSelected ? 1 : 0.45, height: dynamicBodyHeight }]}
                        >
                            {/* Segmented spine line and elements (never cuts through circles or pills) */}
                            {(() => {
                                const getCumY = (m: number) => {
                                    if (m <= 0) return cumY[0];
                                    if (m >= totalMinutes) return cumY[totalMinutes];
                                    return cumY[Math.floor(m)] || 0;
                                };

                                // Separate wakeup & sleep tasks from other routine tasks
                                type ElementEntry =
                                    | { type: 'wakeup_sleep'; item: RoutineItem; top: number; bottom: number; height: number }
                                    | { type: 'single'; item: RoutineItem; top: number; bottom: number; height: number }
                                    | {
                                        type: 'chain';
                                        items: RoutineItem[];
                                        top: number;
                                        bottom: number;
                                        pillHeight: number;
                                        stepY: number;
                                        overlap: number;
                                    };

                                const rawElements: ElementEntry[] = [];

                                // 1. Partition colItems into wakeup/sleep vs chainable items
                                const chainableItems: RoutineItem[] = [];

                                colItems.forEach(item => {
                                    const start = getTimelineMinute(item.time, startHour);
                                    const dur = item.duration ?? DEFAULT_DURATION;
                                    const topY = getCumY(start);

                                    if (isWakeupOrSleep(item)) {
                                        // Standalone circle node — never merged into a chain
                                        rawElements.push({
                                            type: 'wakeup_sleep',
                                            item,
                                            top: topY,
                                            bottom: topY + circleSize,
                                            height: circleSize,
                                        });
                                    } else {
                                        chainableItems.push(item);
                                    }
                                });

                                // 2. Group chainable items into overlapping clusters
                                type Cluster = { items: RoutineItem[]; startMin: number; endMin: number };
                                const clusters: Cluster[] = [];

                                chainableItems.forEach(item => {
                                    const start = getTimelineMinute(item.time, startHour);
                                    const dur = item.duration ?? DEFAULT_DURATION;
                                    const end = start + dur;

                                    if (clusters.length === 0) {
                                        clusters.push({ items: [item], startMin: start, endMin: end });
                                    } else {
                                        const last = clusters[clusters.length - 1];
                                        if (start < last.endMin) {
                                            last.items.push(item);
                                            last.endMin = Math.max(last.endMin, end);
                                        } else {
                                            clusters.push({ items: [item], startMin: start, endMin: end });
                                        }
                                    }
                                });

                                // 3. Build single or chain elements from clusters
                                clusters.forEach(cluster => {
                                    if (cluster.items.length === 1) {
                                        const item = cluster.items[0];
                                        const start = getTimelineMinute(item.time, startHour);
                                        const dur = item.duration ?? DEFAULT_DURATION;
                                        const topY = getCumY(start);
                                        const rawH = getCumY(start + dur) - topY;
                                        const pillHeight = Math.max(circleSize, Math.min(circleSize * 2.2, rawH));
                                        rawElements.push({
                                            type: 'single',
                                            item,
                                            top: topY,
                                            bottom: topY + pillHeight,
                                            height: pillHeight,
                                        });
                                    } else {
                                        const N = cluster.items.length;
                                        const topY0 = getCumY(cluster.startMin);
                                        const endY0 = getCumY(cluster.endMin);
                                        const totalSlotH = Math.max(circleSize * 1.8 * N, endY0 - topY0);
                                        const overlap = circleSize >= 40 ? 12 : 8;
                                        const pillHeight = Math.max(
                                            circleSize * 1.6,
                                            Math.min(circleSize * 2.2, (totalSlotH + (N - 1) * overlap) / N)
                                        );
                                        const stepY = pillHeight - overlap;
                                        const totalChainH = (N - 1) * stepY + pillHeight;

                                        rawElements.push({
                                            type: 'chain',
                                            items: cluster.items,
                                            top: topY0,
                                            bottom: topY0 + totalChainH,
                                            pillHeight,
                                            stepY,
                                            overlap,
                                        });
                                    }
                                });

                                // Sort elements chronologically by topY
                                rawElements.sort((a, b) => a.top - b.top);

                                // Ensure minimum 6px gap between adjacent elements to avoid accidental overlap
                                let currentBottom = -1;
                                const elements = rawElements.map(el => {
                                    let { top, bottom } = el;
                                    if (top < currentBottom + 6) {
                                        const shift = currentBottom + 6 - top;
                                        top += shift;
                                        bottom += shift;
                                    }
                                    currentBottom = bottom;
                                    return { ...el, top, bottom };
                                });

                                // 4. Build SEGMENTED CONNECTOR LINES between elements
                                // Line strictly starts from the first pill and ends at the last pill on that day.
                                // Never extends above the first pill, and never extends below the last pill.
                                const spineSegments: { key: string; top: number; height: number }[] = [];
                                if (elements.length >= 2) {
                                    // Connectors between adjacent elements only
                                    for (let k = 0; k < elements.length - 1; k++) {
                                        const segTop = elements[k].bottom;
                                        const segHeight = elements[k + 1].top - segTop;
                                        if (segHeight > 0) {
                                            spineSegments.push({
                                                key: `spine-seg-${k}`,
                                                top: segTop,
                                                height: segHeight,
                                            });
                                        }
                                    }
                                }

                                const primaryColor = theme.colors.primary;
                                const spineColor = isSelected ? primaryColor : (isDarkMode ? '#2C2C2E' : '#D0D0D0');

                                return (
                                    <>
                                        {/* Segmented spine lines */}
                                        {spineSegments.map(seg => (
                                            <View
                                                key={seg.key}
                                                style={{
                                                    position: 'absolute',
                                                    top: seg.top,
                                                    height: seg.height,
                                                    left: 0,
                                                    right: 0,
                                                    alignItems: 'center',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: isSelected ? 2 : 1.5,
                                                        height: '100%',
                                                        backgroundColor: spineColor,
                                                        borderRadius: 1,
                                                    }}
                                                />
                                            </View>
                                        ))}

                                        {/* Visual elements */}
                                        {elements.map((el, elIdx) => {
                                            if (el.type === 'wakeup_sleep') {
                                                const { item, top } = el;
                                                const iconSize = Math.round(circleSize * 0.46);

                                                return (
                                                    <View
                                                        key={`ws-${item.id}`}
                                                        style={{
                                                            position: 'absolute',
                                                            top,
                                                            left: 0,
                                                            right: 0,
                                                            alignItems: 'center',
                                                            zIndex: 10,
                                                        }}
                                                    >
                                                        <Pressable
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                onPressTask?.(item);
                                                            }}
                                                            style={({ pressed }) => [
                                                                {
                                                                    width: circleSize,
                                                                    height: circleSize,
                                                                    borderRadius: circleSize / 2,
                                                                    backgroundColor: isSelected ? primaryColor : (isDarkMode ? '#242426' : '#E8E8E8'),
                                                                    borderWidth: isSelected ? 1.5 : 1,
                                                                    borderColor: isSelected ? `${primaryColor}CC` : 'transparent',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                },
                                                                pressed && { opacity: 0.82, transform: [{ scale: 0.94 }] },
                                                                isSelected && Platform.select({
                                                                    ios: {
                                                                        shadowColor: primaryColor,
                                                                        shadowOffset: { width: 0, height: 3 },
                                                                        shadowOpacity: 0.4,
                                                                        shadowRadius: 6,
                                                                    },
                                                                    android: { elevation: 4 },
                                                                }),
                                                            ]}
                                                        >
                                                            <Ionicons
                                                                name={ICON_MAP[item.imageKey ?? ''] ?? 'alarm-outline'}
                                                                size={iconSize}
                                                                color={isSelected ? '#FFFFFF' : primaryColor}
                                                            />
                                                        </Pressable>
                                                    </View>
                                                );
                                            }

                                            if (el.type === 'single') {
                                                const { item, top, height } = el;
                                                const iconSize = Math.round(circleSize * 0.46);

                                                return (
                                                    <View
                                                        key={`single-${item.id}`}
                                                        style={{
                                                            position: 'absolute',
                                                            top,
                                                            left: 0,
                                                            right: 0,
                                                            alignItems: 'center',
                                                            zIndex: 10,
                                                        }}
                                                    >
                                                        <Pressable
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                onPressTask?.(item);
                                                            }}
                                                            style={({ pressed }) => [
                                                                {
                                                                    width: circleSize,
                                                                    height,
                                                                    borderRadius: circleSize / 2,
                                                                    backgroundColor: isSelected ? primaryColor : (isDarkMode ? '#242426' : '#E8E8E8'),
                                                                    borderWidth: isSelected ? 1.5 : 1,
                                                                    borderColor: isSelected ? `${primaryColor}CC` : 'transparent',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden',
                                                                },
                                                                pressed && { opacity: 0.82, transform: [{ scale: 0.94 }] },
                                                                isSelected && Platform.select({
                                                                    ios: {
                                                                        shadowColor: primaryColor,
                                                                        shadowOffset: { width: 0, height: 3 },
                                                                        shadowOpacity: 0.35,
                                                                        shadowRadius: 6,
                                                                    },
                                                                    android: { elevation: 4 },
                                                                }),
                                                            ]}
                                                        >
                                                            <Ionicons
                                                                name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                                                                size={iconSize}
                                                                color={isSelected ? '#FFFFFF' : primaryColor}
                                                            />
                                                        </Pressable>
                                                    </View>
                                                );
                                            }

                                            // el.type === 'chain' (Directly overlapping pills, no cutouts)
                                            const { items, top: chainTop, pillHeight, stepY } = el;
                                            const chainBg = isSelected ? primaryColor : (isDarkMode ? '#242426' : '#E8E8E8');
                                            const iconColor = isSelected ? '#FFFFFF' : primaryColor;

                                            return (
                                                <React.Fragment key={`chain-${elIdx}-${chainTop}`}>
                                                    {/* Directly overlapping stadium pills */}
                                                    {items.map((item, i) => {
                                                        const pillTop = chainTop + i * stepY;
                                                        const iconSize = Math.round(circleSize * 0.46);

                                                        return (
                                                            <View
                                                                key={`chain-pill-${item.id}`}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: pillTop,
                                                                    left: 0,
                                                                    right: 0,
                                                                    alignItems: 'center',
                                                                    zIndex: 10 + i,
                                                                }}
                                                            >
                                                                <Pressable
                                                                    onPress={() => {
                                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                        onPressTask?.(item);
                                                                    }}
                                                                    style={({ pressed }) => [
                                                                        {
                                                                            width: circleSize,
                                                                            height: pillHeight,
                                                                            borderRadius: circleSize / 2,
                                                                            backgroundColor: chainBg,
                                                                            borderWidth: 2,
                                                                            borderColor: theme.colors.background,
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            overflow: 'hidden',
                                                                        },
                                                                        pressed && { opacity: 0.82, transform: [{ scale: 0.94 }] },
                                                                        Platform.select({
                                                                            ios: {
                                                                                shadowColor: '#000000',
                                                                                shadowOffset: { width: 0, height: 2 },
                                                                                shadowOpacity: isDarkMode ? 0.35 : 0.15,
                                                                                shadowRadius: 4,
                                                                            },
                                                                            android: { elevation: 3 },
                                                                        }),
                                                                    ]}
                                                                >
                                                                    <Ionicons
                                                                        name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                                                                        size={iconSize}
                                                                        color={iconColor}
                                                                    />
                                                                </Pressable>
                                                            </View>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </View>
                    );
                })}
                {/* Right spacer for symmetry */}
                <View style={{ width: TIME_AXIS_WIDTH }} />
            </View>
                </ScrollView>
            </Animated.View>
        </View>
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
    isTaskModalOpen = false,
    onPressTask,
}) => {
    const { theme, isDarkMode } = useTheme();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [viewMode, setViewMode] = React.useState<'week' | 'month'>('week');
    const [todayTrigger, setTodayTrigger] = React.useState(0);
    const COL_WIDTH = getColWidth(SCREEN_WIDTH);

    React.useEffect(() => {
        if (isTaskModalOpen && viewMode === 'month') {
            setViewMode('week');
        }
    }, [isTaskModalOpen, viewMode]);

    const circleSel = CIRCLE_SEL;
    const circleOther = CIRCLE_OTHER;

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
        if (!selectedDate) return [];
        return getRoutineItemsForDate(routineItems, selectedDate)
            .sort((a, b) => getTimelineMinute(a.time, startHour) - getTimelineMinute(b.time, startHour));
    }, [routineItems, selectedDate, startHour]);
    const firstItem = currentDayItems[0] ?? null;

    /* ── Date helpers ── */
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const selectedKey = selectedDate ? formatDateKey(selectedDate) : '';
    const todayKey = formatDateKey(today);

    // Number of pages around today (e.g. 260 weeks = 5 years)
    const RANGE_PAGES = 260;

    // Compute the pages and initial index
    const { pages, initialPageIndex } = useMemo(() => {
        const p: Date[][] = [];
        let todayIdx = 0;

        for (let i = -RANGE_PAGES; i <= RANGE_PAGES; i++) {
            const anchor = new Date(today);
            anchor.setDate(anchor.getDate() + (i * 7));
            p.push(getWeekDates(anchor));
            if (i === 0) todayIdx = p.length - 1;
        }
        return { pages: p, initialPageIndex: todayIdx };
    }, [today]);

    const initialTargetIndex = useMemo(() => {
        const dateStr = selectedDate ? formatDateKey(selectedDate) : '';
        const idx = dateStr ? pages.findIndex(page => page.some(d => formatDateKey(d) === dateStr)) : -1;
        return idx !== -1 ? idx : initialPageIndex;
    }, [pages, selectedDate, initialPageIndex]);

    const [visiblePageIndex, setVisiblePageIndex] = React.useState<number>(initialTargetIndex);

    const flatListRef = useRef<FlatList>(null);
    const scrollSnapTimer = useRef<any>(null);
    const hasInitialScrolled = useRef(false);

    // Web: JS-based scroll snapping (CSS scroll-snap blocks virtualized scrolling)
    const handleWebScrollSnap = useCallback((e: any) => {
        if (Platform.OS !== 'web') return;
        const offsetX = e.nativeEvent.contentOffset.x;
        if (scrollSnapTimer.current) clearTimeout(scrollSnapTimer.current);
        scrollSnapTimer.current = setTimeout(() => {
            const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
            setVisiblePageIndex(pageIndex);
            flatListRef.current?.scrollToOffset({
                offset: pageIndex * SCREEN_WIDTH,
                animated: true,
            });
            const page = pages[pageIndex];
            if (page && page.length > 0) {
                const selectedStr = selectedDate ? formatDateKey(selectedDate) : '';
                const isInWeek = page.some(d => formatDateKey(d) === selectedStr);
                if (!isInWeek) {
                    const todayStr = formatDateKey(today);
                    const todayInPage = page.find(d => formatDateKey(d) === todayStr);
                    if (todayInPage) {
                        onSelectDate(todayInPage);
                    } else {
                        onSelectDate(null);
                    }
                }
            }
        }, 150);
    }, [SCREEN_WIDTH, pages, selectedDate, today, onSelectDate]);

    // Handle horizontal page swiping to keep week dates aligned
    const handleMomentumScrollEnd = useCallback((e: any) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
        setVisiblePageIndex(pageIndex);
        const page = pages[pageIndex];
        if (page && page.length > 0) {
            const selectedStr = selectedDate ? formatDateKey(selectedDate) : '';
            const isInWeek = page.some(d => formatDateKey(d) === selectedStr);
            if (!isInWeek) {
                const todayStr = formatDateKey(today);
                const todayInPage = page.find(d => formatDateKey(d) === todayStr);
                if (todayInPage) {
                    onSelectDate(todayInPage);
                } else {
                    onSelectDate(null);
                }
            }
        }
    }, [SCREEN_WIDTH, pages, selectedDate, today, onSelectDate]);

    // Sync scroll when viewMode changes and guarantee positioning on mount / navigation transition
    React.useEffect(() => {
        if (viewMode === 'month') return;
        if (!selectedDate) return;

        const dateStr = formatDateKey(selectedDate);
        const targetIndex = pages.findIndex(page => page.some(d => formatDateKey(d) === dateStr));
        const indexToScroll = targetIndex !== -1 ? targetIndex : initialPageIndex;

        if (indexToScroll === visiblePageIndex) return;
        setVisiblePageIndex(indexToScroll);

        const scrollToTarget = (animated = false) => {
            if (flatListRef.current && SCREEN_WIDTH > 0) {
                flatListRef.current.scrollToOffset({
                    offset: indexToScroll * SCREEN_WIDTH,
                    animated,
                });
            }
        };

        // 1. Immediate positioning
        scrollToTarget(false);

        // 2. Next animation frame
        const raf = requestAnimationFrame(() => {
            scrollToTarget(false);
        });

        // 3. Short layout timeout
        const t1 = setTimeout(() => {
            scrollToTarget(false);
        }, 60);

        // 4. Post-navigation transition timeout (Expo Router stack push finishes at ~300ms)
        const t2 = setTimeout(() => {
            scrollToTarget(false);
        }, 320);

        // 5. InteractionManager guarantee
        let interaction: any;
        if (InteractionManager?.runAfterInteractions) {
            interaction = InteractionManager.runAfterInteractions(() => {
                scrollToTarget(false);
            });
        }

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(t1);
            clearTimeout(t2);
            interaction?.cancel?.();
        };
    }, [viewMode, selectedDate, SCREEN_WIDTH, pages, initialPageIndex]);

    const renderPage = useCallback(({ item: pageDates }: { item: Date[] }) => (
        <TimelinePage
            pageDates={pageDates}
            allRoutines={routineItems}
            selectedKey={selectedKey}
            todayKey={todayKey}
            circleSel={circleSel}
            circleOther={circleOther}
            COL_WIDTH={COL_WIDTH}
            screenWidth={SCREEN_WIDTH}
            theme={theme}
            isDarkMode={isDarkMode}
            styles={styles}
            handleSelectDate={handleSelectDate}
            startHour={startHour}
            totalMinutes={totalMinutes}
            timeLabels={timeLabels}
            onPressTask={onPressTask}
            listAnim={listAnim}
        />
    ), [routineItems, selectedKey, todayKey, circleSel, circleOther, COL_WIDTH, SCREEN_WIDTH, theme, isDarkMode, styles, handleSelectDate, startHour, totalMinutes, timeLabels, onPressTask, listAnim]);

    const router = useRouter();

    return (
        <View style={styles.outer} testID="day-timeline-view">

            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={styles.backButton}
                    testID="back-button"
                >
                    {({ pressed }) => (
                        <View style={[styles.backIconCircle, pressed && { opacity: 0.6, transform: [{ scale: 0.93 }] }]}>
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </View>
                    )}
                </Pressable>

                <Pressable
                    style={styles.headerDateBlock}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleSelectDate(today);
                        setTodayTrigger(Date.now());
                        if (viewMode !== 'month' && flatListRef.current) {
                            const dateStr = formatDateKey(today);
                            const targetIndex = pages.findIndex(page => page.some(d => formatDateKey(d) === dateStr));
                            const indexToScroll = targetIndex !== -1 ? targetIndex : initialPageIndex;
                            setVisiblePageIndex(indexToScroll);
                            flatListRef.current.scrollToOffset({
                                offset: indexToScroll * SCREEN_WIDTH,
                                animated: true,
                            });
                        }
                    }}
                >
                    {({ pressed }) => {
                        const currentVisiblePage = pages[visiblePageIndex] || pages[initialPageIndex];
                        const currentMonthDate = currentVisiblePage?.[3] || today;
                        const isSelectedInVisibleWeek = Boolean(selectedDate && currentVisiblePage?.some(d => formatDateKey(d) === selectedKey));
                        return (
                            <View style={[styles.headerDateRow, pressed && { opacity: 0.6 }]}>
                                {selectedDate && isSelectedInVisibleWeek ? (
                                    <>
                                        <Text style={styles.headerDayMonthText}>
                                            {selectedDate.getDate()} {selectedDate.toLocaleDateString('en-US', { month: 'long' })}{' '}
                                        </Text>
                                        <Text style={styles.headerYearText}>
                                            {selectedDate.getFullYear()}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.headerDayMonthText}>
                                            {currentMonthDate.toLocaleDateString('en-US', { month: 'long' })}{' '}
                                        </Text>
                                        <Text style={styles.headerYearText}>
                                            {currentMonthDate.getFullYear()}
                                        </Text>
                                    </>
                                )}
                                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={{ marginLeft: 2 }} />
                            </View>
                        );
                    }}
                </Pressable>

                {/* ── View-mode toggle (calendar-outline = week, calendar = month) ── */}
                <Pressable
                    onPress={() => {
                        if (isTaskModalOpen) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setViewMode(prev => prev === 'week' ? 'month' : 'week');
                    }}
                    disabled={isTaskModalOpen}
                    style={({ pressed }) => [
                        styles.viewToggleBtn,
                        isTaskModalOpen && { opacity: 0.35, borderColor: 'transparent' },
                        pressed && !isTaskModalOpen && { opacity: 0.6, transform: [{ scale: 0.94 }] },
                    ]}
                    testID="view-toggle-btn"
                    accessibilityLabel={viewMode === 'week' ? 'Switch to month calendar' : 'Switch to week timeline'}
                    accessibilityState={{ disabled: isTaskModalOpen }}
                >
                    <Ionicons
                        name={viewMode === 'week' ? 'calendar-outline' : 'calendar'}
                        size={20}
                        color={isTaskModalOpen ? theme.colors.textSecondary : theme.colors.primary}
                    />
                </Pressable>
            </View>

            {viewMode === 'month' ? (
                <MonthCalendarView
                    currentDate={selectedDate || today}
                    routineItems={routineItems}
                    todayTrigger={todayTrigger}
                    onSelectDate={(date) => {
                        handleSelectDate(date);
                        setViewMode('week');
                    }}
                    theme={theme}
                />
            ) : (
                <>
                    {/* ── Timeline (virtualized FlatList for multi-year calendar) ── */}
                    <View style={styles.timelineWrapper}>
                        <FlatList
                            ref={flatListRef}
                            data={pages}
                            renderItem={renderPage}
                            keyExtractor={(_, index) => `page-${index}`}
                            horizontal
                            pagingEnabled={Platform.OS !== 'web'}
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={initialTargetIndex}
                            onLayout={(e) => {
                                const layoutW = e.nativeEvent.layout.width || SCREEN_WIDTH;
                                if (layoutW > 0 && !hasInitialScrolled.current) {
                                    hasInitialScrolled.current = true;
                                    flatListRef.current?.scrollToOffset({
                                        offset: initialTargetIndex * layoutW,
                                        animated: false,
                                    });
                                }
                            }}
                            getItemLayout={(_, idx) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * idx,
                                index: idx,
                            })}
                            // Performance optimizations
                            windowSize={Platform.OS === 'web' ? 7 : 3}
                            maxToRenderPerBatch={2}
                            updateCellsBatchingPeriod={50}
                            removeClippedSubviews={Platform.OS === 'android'}
                            onScrollToIndexFailed={info => {
                                const targetOffset = info.index * SCREEN_WIDTH;
                                setTimeout(() => {
                                    flatListRef.current?.scrollToOffset({
                                        offset: targetOffset,
                                        animated: false,
                                    });
                                }, 60);
                            }}
                            onMomentumScrollEnd={handleMomentumScrollEnd}
                            {...(Platform.OS === 'web' ? {
                                onScroll: handleWebScrollSnap,
                                scrollEventThrottle: 16,
                            } : {})}
                        />
                    </View>
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
            paddingHorizontal: 20,
            height: 56,
            backgroundColor: theme.colors.background,
            zIndex: 100,
        },
        backButton: {
            marginRight: 10,
        },
        backIconCircle: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${theme.colors.text}08`,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: `${theme.colors.text}10`,
        },
        headerDateBlock: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 4,
        },
        headerDateRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerDayMonthText: {
            fontSize: 22,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            letterSpacing: -0.4,
        },
        headerYearText: {
            fontSize: 22,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            letterSpacing: -0.4,
        },
        headerDateInner: {
            alignItems: 'flex-start',
            gap: 1,
        },
        headerWeekday: {
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 34,
            letterSpacing: -0.4,
        },
        headerRest: {
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            letterSpacing: 0.1,
            marginTop: 1,
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
            backgroundColor: `${theme.colors.text}08`,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
            borderWidth: 1,
            borderColor: `${theme.colors.text}10`,
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
            paddingBottom: 4,
            paddingTop: 4,
        },
        dayHeaderCell: {
            alignItems: 'center',
            gap: 3,
        },
        dayLabel: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            letterSpacing: -0.2,
        },
        dayLabelSelected: {
            color: theme.colors.textSecondary,
        },
        dateBadgeWrapper: {
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 38,
        },
        dateBadge: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        dateBadgeSelected: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.primary,
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 5,
                },
                android: { elevation: 3 },
            }),
        },
        dateBadgeGradient: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateBadgeToday: {
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}60`,
            backgroundColor: `${theme.colors.primary}10`,
        },
        dateNum: {
            fontSize: 18,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            letterSpacing: -0.2,
        },
        dateNumToday: {
            color: theme.colors.primary,
        },
        dateNumSelected: {
            fontSize: 18,
            fontFamily: theme.fonts.bold,
            color: '#FFFFFF',
            letterSpacing: -0.2,
        },
        taskBadgesRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 3,
        },
        taskBadgesPlaceholder: {
            marginTop: 3,
        },
        taskBadgeDot: {
            width: 13,
            height: 13,
            borderRadius: 6.5,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.background,
        },
        todayIndicatorDot: {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.primary,
            marginTop: 2,
        },

        /* Body row = time axis + columns */
        bodyRow: {
            flexDirection: 'row',
            paddingRight: 0,
            paddingBottom: CIRCLE_SEL / 2,
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
            paddingBottom: 20,
            paddingHorizontal: 16,
        },
        peekDivider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: `${theme.colors.text}10`,
            marginBottom: 12,
            marginHorizontal: 4,
        },
        peekCard: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: `${theme.colors.text}0E`,
            overflow: 'hidden',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                },
                android: { elevation: 3 },
            }),
        },
        peekAccentBar: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3.5,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
        },
        peekCircle: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            marginRight: 13,
        },
        peekText: { flex: 1 },
        peekTimeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 3,
            gap: 4,
        },
        peekTime: {
            fontSize: 11.5,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            letterSpacing: 0.2,
        },
        peekBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            borderRadius: 6,
            marginLeft: 4,
        },
        peekBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.bold,
            letterSpacing: 0.2,
        },
        peekTitle: {
            fontSize: 16,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            letterSpacing: -0.2,
        },
        peekChevronCircle: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: `${theme.colors.text}08`,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
        },
    });
