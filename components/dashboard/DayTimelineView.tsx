import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
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

/* ─────────────────────────────── Config ─────────────────────────────── */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Visible time window shown in the timeline */
const START_HOUR = 6;
const END_HOUR = 26; // up to 2AM
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

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

/** Hour marks to render in the time axis */
const TIME_LABELS: { hour: number; num: string; ampm: string }[] = [
    { hour: 6, num: '6', ampm: 'AM' },
    { hour: 7, num: '7', ampm: 'AM' },
    { hour: 8, num: '8', ampm: 'AM' },
    { hour: 9, num: '9', ampm: 'AM' },
    { hour: 10, num: '10', ampm: 'AM' },
    { hour: 11, num: '11', ampm: 'AM' },
    { hour: 12, num: '12', ampm: 'PM' },
    { hour: 13, num: '1', ampm: 'PM' },
    { hour: 14, num: '2', ampm: 'PM' },
    { hour: 15, num: '3', ampm: 'PM' },
    { hour: 16, num: '4', ampm: 'PM' },
    { hour: 17, num: '5', ampm: 'PM' },
    { hour: 18, num: '6', ampm: 'PM' },
    { hour: 19, num: '7', ampm: 'PM' },
    { hour: 20, num: '8', ampm: 'PM' },
    { hour: 21, num: '9', ampm: 'PM' },
    { hour: 22, num: '10', ampm: 'PM' },
    { hour: 23, num: '11', ampm: 'PM' },
    { hour: 24, num: '12', ampm: 'AM' },
    { hour: 25, num: '1', ampm: 'AM' },
    { hour: 26, num: '2', ampm: 'AM' },
];

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

const getTimelineMinute = (timeStr: string) => {
    let m = timeToMinutes(timeStr);
    if (m < START_HOUR * 60) m += 24 * 60;
    return m - (START_HOUR * 60);
};

const timeToY = (timeStr: string, cumulativeY: number[]): number => {
    const m = getTimelineMinute(timeStr);
    if (m <= 0) return cumulativeY[0];
    if (m >= TOTAL_MINUTES) return cumulativeY[TOTAL_MINUTES];
    return cumulativeY[Math.floor(m)] || 0;
};

const durationToPillHeight = (
    timeStr: string,
    durationMinutes: number,
    cumulativeY: number[],
    circleSize: number,
): number => {
    const m1 = getTimelineMinute(timeStr);
    const m2 = m1 + durationMinutes;

    const idx1 = Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m1)));
    const idx2 = Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m2)));

    const y1 = cumulativeY[idx1] || 0;
    const y2 = cumulativeY[idx2] || 0;

    return Math.max(circleSize, y2 - y1);
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

/* ─────────────────────────── TaskPill ──────────────────────────────── */
/*
 * Width  = circleSize (fixed, same as the original circle diameter).
 * Height = max(circleSize, durationPx) — short task → circle, long → pill.
 * borderRadius is always circleSize/2, so the caps are always perfect
 * half-circles regardless of how tall the pill grows.
 * Overlapping tasks simply overlap on the Z axis (no collision avoidance).
 */

const TaskPill = memo<{
    item: RoutineItem;
    size: number;      // circle diameter == pill width
    pillHeight: number;      // computed from duration; >= size
    isSelected: boolean;
    theme: Theme;
}>(({ item, size, pillHeight, isSelected, theme }) => {
    const borderRadius = size / 2;                           // always half-width → rounded caps
    const iconSize = isSelected ? Math.round(size * 0.46) : Math.round(size * 0.44);
    const taskColor = TASK_COLORS[item.imageKey ?? ''] ?? theme.colors.primary;

    return (
        <View
            style={[
                {
                    width: size,
                    height: pillHeight,
                    borderRadius,
                    backgroundColor: isSelected
                        ? `${taskColor}22`
                        : `${theme.colors.text}0A`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 2 : 1.5,
                    borderColor: isSelected ? `${taskColor}55` : `${theme.colors.text}15`,
                    overflow: 'hidden',
                },
                isSelected && Platform.select({
                    ios: {
                        shadowColor: taskColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                    },
                    android: { elevation: 8 },
                }),
            ]}
        >
            <Ionicons
                name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                size={iconSize}
                color={isSelected ? taskColor : `${theme.colors.textSecondary}55`}
            />
        </View>
    );
});

/* ───────────────────────────── TimelinePage ─────────────────────────── */

const TimelinePage = memo<{
    pageDates: Date[];
    itemsByDayOfWeek: Record<number, RoutineItem[]>;
    selectedKey: string;
    todayKey: string;
    circleSel: number;
    circleOther: number;
    is7Day: boolean;
    COL_WIDTH: number;
    theme: Theme;
    styles: any;
    handleSelectDate: (date: Date) => void;
}>(({ 
    pageDates, itemsByDayOfWeek, selectedKey, todayKey, 
    circleSel, circleOther, is7Day, COL_WIDTH, theme, styles, handleSelectDate 
}) => {
    const { cumY, dynamicBodyHeight, timeAxisPositions } = useMemo(() => {
        const isOccupied = new Array(TOTAL_MINUTES).fill(false);
        pageDates.forEach(date => {
            const di = date.getDay();
            const items = itemsByDayOfWeek[di] ?? [];
            items.forEach(item => {
                const itemStart = getTimelineMinute(item.time);
                const duration = item.duration ?? DEFAULT_DURATION;
                const itemEnd = itemStart + duration;
                for (let m = itemStart; m < itemEnd; m++) {
                    if (m >= 0 && m < TOTAL_MINUTES) {
                        isOccupied[m] = true;
                    }
                }
            });
        });

        const cY = new Array(TOTAL_MINUTES + 1).fill(0);
        let currentY = 0;
        const expandedMult = is7Day ? 0.9 : 1.5;
        const compactMult = is7Day ? 0.35 : 0.5;

        for (let i = 0; i < TOTAL_MINUTES; i++) {
            cY[i] = currentY;
            currentY += isOccupied[i] ? expandedMult : compactMult;
        }
        cY[TOTAL_MINUTES] = currentY;

        const positions = TIME_LABELS.map(tl => {
            const m = (tl.hour - START_HOUR) * 60;
            const topY = cY[Math.max(0, Math.min(TOTAL_MINUTES, m))] || 0;
            return { ...tl, topY };
        });

        return { cumY: cY, dynamicBodyHeight: currentY, timeAxisPositions: positions };
    }, [pageDates, itemsByDayOfWeek, is7Day]);

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
                    const isSelected = key === selectedKey;
                    const dayItems = itemsByDayOfWeek[dayIndex] ?? [];
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

                            {/* Pills — width = circleSize, height grows with duration, overlap is natural */}
                            {dayItems.map(item => {
                                const topY = timeToY(item.time, cumY);
                                const duration = item.duration ?? DEFAULT_DURATION;
                                const pillHeight = durationToPillHeight(item.time, duration, cumY, circleSize);
                                const taskColor = TASK_COLORS[item.imageKey ?? ''] ?? theme.colors.primary;

                                return (
                                    <View
                                        key={item.id}
                                        style={{
                                            position: 'absolute',
                                            top: topY,
                                            left: 0,
                                            right: 0,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <TaskPill
                                            item={item}
                                            size={circleSize}
                                            pillHeight={pillHeight}
                                            isSelected={isSelected}
                                            theme={theme}
                                        />
                                        {/* Time label below icon on selected column */}
                                        {isSelected && (
                                            <Text style={{
                                                fontSize: 9,
                                                fontFamily: theme.fonts.medium,
                                                color: `${taskColor}AA`,
                                                marginTop: 3,
                                                letterSpacing: 0.3,
                                                textAlign: 'center',
                                            }}>
                                                {item.time}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
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
}) => {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [viewMode, setViewMode] = React.useState<'3-day' | '7-day'>('3-day');
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

    /* ── Items grouped by day-of-week ── */
    const itemsByDayOfWeek = useMemo(() => {
        const map: Record<number, RoutineItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        routineItems.forEach(item => {
            (item.daysOfWeek ?? []).forEach(di => {
                if (map[di]) map[di].push(item);
            });
        });
        // Sort by time so z-order is chronological
        Object.values(map).forEach(arr =>
            arr.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
        );
        return map;
    }, [routineItems]);

    const currentDayItems = useMemo(
        () => itemsByDayOfWeek[selectedDate.getDay()] ?? [],
        [itemsByDayOfWeek, selectedDate]
    );
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

    const flatListRef = useRef<FlatList>(null);

    // Sync scroll when viewMode changes
    React.useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: initialPageIndex, animated: false });
        }, 50);
    }, [viewMode, initialPageIndex]);

    const renderPage = useCallback(({ item: pageDates }: { item: Date[] }) => (
        <TimelinePage
            pageDates={pageDates}
            itemsByDayOfWeek={itemsByDayOfWeek}
            selectedKey={selectedKey}
            todayKey={todayKey}
            circleSel={circleSel}
            circleOther={circleOther}
            is7Day={is7Day}
            COL_WIDTH={COL_WIDTH}
            theme={theme}
            styles={styles}
            handleSelectDate={handleSelectDate}
        />
    ), [itemsByDayOfWeek, selectedKey, todayKey, circleSel, circleOther, is7Day, COL_WIDTH, theme, styles, handleSelectDate]);

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

                {/* ── View-mode toggle (calendar-outline = 3-day, calendar = 7-day) ── */}
                <Animated.View style={{ opacity: collapseOpacity }}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setViewMode(prev => prev === '3-day' ? '7-day' : '3-day');
                        }}
                        style={styles.viewToggleBtn}
                        testID="view-toggle-btn"
                    >
                        <Ionicons
                            name={viewMode === '3-day' ? 'calendar-outline' : 'calendar'}
                            size={22}
                            color={theme.colors.primary}
                        />
                    </Pressable>
                </Animated.View>
            </Animated.View>

            {/* ── Timeline (virtualized FlatList for multi-year calendar) ── */}
            <Animated.View style={[styles.timelineWrapper, { opacity: collapseOpacity }]}>
                <FlatList
                    ref={flatListRef}
                    data={pages}
                    renderItem={renderPage}
                    keyExtractor={(_, index) => `page-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialPageIndex}
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
                                    <Text style={[styles.peekBadgeText, { color: theme.colors.primary }]}>↺ Daily</Text>
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