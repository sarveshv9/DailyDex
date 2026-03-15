import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
    Animated,
    Dimensions,
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
const END_HOUR = 22;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

/** Width reserved for the time-label column on the left */
const TIME_AXIS_WIDTH = 44;

/** Each of the 3 day columns gets equal width from the remaining space */
const COLUMN_AREA_WIDTH = SCREEN_WIDTH - TIME_AXIS_WIDTH - 16; // 16 = right padding
const COL_WIDTH = COLUMN_AREA_WIDTH / 3;

/** Circle sizes — selected day is larger */
const CIRCLE_SEL = 48;
const CIRCLE_OTHER = 32;

const DEFAULT_BODY_HEIGHT = 600;

/** Hour marks to render in the time axis */
const TIME_LABELS: { hour: number; label: string }[] = [
    { hour: 6, label: '6AM' },
    { hour: 8, label: '8AM' },
    { hour: 10, label: '10AM' },
    { hour: 12, label: '12PM' },
    { hour: 14, label: '2PM' },
    { hour: 16, label: '4PM' },
    { hour: 18, label: '6PM' },
    { hour: 20, label: '8PM' },
    { hour: 22, label: '10PM' },
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

/**
 * Converts a time string (e.g. "14:30") to a Y pixel position
 * within the column body. Pure time → position, no collision avoidance.
 */
const timeToY = (timeStr: string, bodyHeight: number): number => {
    const startMin = START_HOUR * 60;
    const ratio = (timeToMinutes(timeStr) - startMin) / TOTAL_MINUTES;
    return Math.max(0, Math.min(bodyHeight, ratio * bodyHeight));
};

/** Default task duration in minutes when item.duration is absent */
const DEFAULT_DURATION = 30;

/**
 * Converts a duration in minutes to a pill height in pixels.
 * The result is always >= circleSize so a zero-duration task stays circular.
 */
const durationToPillHeight = (
    durationMinutes: number,
    bodyHeight: number,
    circleSize: number,
): number => {
    const raw = (durationMinutes / TOTAL_MINUTES) * bodyHeight;
    return Math.max(circleSize, raw);
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
    label: string;
    topY: number;
    circleHalf: number;
    theme: Theme;
}>(({ label, topY, circleHalf, theme }) => (
    <View
        style={{
            position: 'absolute',
            top: topY + circleHalf - 7,   // vertically align text mid-circle
            right: 6,
            width: TIME_AXIS_WIDTH - 6,
            alignItems: 'flex-end',
        }}
    >
        <Text
            style={{
                fontSize: 10,
                fontFamily: theme.fonts.medium,
                color: theme.colors.textSecondary,
                opacity: 0.5,
                letterSpacing: 0.2,
            }}
        >
            {label}
        </Text>
    </View>
));
TimeAxisItem.displayName = 'TimeAxisItem';

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
    const iconSize = isSelected ? Math.round(size * 0.44) : Math.round(size * 0.42);

    return (
        <View
            style={[
                {
                    width: size,
                    height: pillHeight,
                    borderRadius,
                    backgroundColor: isSelected
                        ? theme.colors.primary
                        : `${theme.colors.primary}45`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 2.5 : 0,
                    borderColor: isSelected ? `${theme.colors.primary}60` : 'transparent',
                    overflow: 'hidden',
                },
                isSelected && Platform.select({
                    ios: {
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.45,
                        shadowRadius: 8,
                    },
                    android: { elevation: 6 },
                }),
            ]}
        >
            <Ionicons
                name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                size={iconSize}
                color={isSelected ? theme.colors.white : `${theme.colors.primary}BB`}
            />
        </View>
    );
});
TaskPill.displayName = 'TaskPill';

/* ─────────────────────────────── Component ──────────────────────────── */

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
    selectedDate,
    onSelectDate,
    routineItems,
    onPressPeek,
    scrollY,
    listAnim,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    // We always show exactly 3 days centered on selectedDate
    const [bodyHeight, setBodyHeight] = React.useState(DEFAULT_BODY_HEIGHT);

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

    /* ── Date helpers ── */
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const selectedKey = formatDateKey(selectedDate);
    const todayKey = formatDateKey(today);

    // 5 pages of 3-day windows so user can swipe left/right
    const scrollRef = useRef<ScrollView>(null);
    const pages = useMemo(() =>
        Array.from({ length: 5 }, (_, pi) => {
            const anchor = new Date(today);
            anchor.setDate(anchor.getDate() + (pi - 2) * 3);
            return get3DayDates(anchor);
        }),
        [today]
    );

    React.useEffect(() => {
        // Always start centered on today's page
        setTimeout(() => {
            scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * 2, animated: false });
        }, 50);
    }, []);

    // Split header date into weekday + rest
    const dateHeader = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });
    const [weekdayStr, ...restParts] = dateHeader.split(', ');
    const restStr = restParts.join(', ');

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

    const handleSelectDate = useCallback((date: Date) => {
        Haptics.selectionAsync();
        onSelectDate(date);
    }, [onSelectDate]);

    const router = useRouter();

    /* ── Time axis Y positions (shared across all columns) ── */
    const timeAxisPositions = useMemo(() =>
        TIME_LABELS.map(tl => ({
            ...tl,
            topY: timeToY(`${tl.hour}:00`, bodyHeight),
        })),
        [bodyHeight]
    );

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
                    <View style={styles.headerArrowContainer}>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                    </View>
                </Pressable>
            </Animated.View>

            {/* ── Timeline (scrollable vertically + swipeable horizontally for pages) ── */}
            <Animated.View style={[styles.timelineWrapper, { opacity: collapseOpacity }]}>
                {/*
                 * Outer ScrollView = horizontal page swipe between 3-day windows.
                 * Inner ScrollView = vertical scroll through the full day.
                 */}
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews
                >
                    {pages.map((pageDates, wi) => (
                        <ScrollView
                            key={wi}
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
                                            style={[styles.dayHeaderCell, { width: COL_WIDTH }]}
                                            onPress={() => handleSelectDate(date)}
                                        >
                                            <Text style={[
                                                styles.dayLabel,
                                                isSelected && { color: theme.colors.primary, opacity: 1 },
                                                isToday && !isSelected && { color: theme.colors.primary, opacity: 0.7 },
                                            ]}>
                                                {DAY_LABELS[dayIndex]}
                                            </Text>
                                            {/* Date badge */}
                                            <View style={[
                                                styles.dateBadge,
                                                isSelected && styles.dateBadgeSelected,
                                                isToday && !isSelected && styles.dateBadgeToday,
                                            ]}>
                                                {isSelected ? (
                                                    <LinearGradient
                                                        colors={[theme.colors.primary, `${theme.colors.primary}BB`]}
                                                        style={styles.dateBadgeGradient}
                                                        start={{ x: 0.2, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    >
                                                        <Text style={[styles.dateNum, { color: theme.colors.white }]}>
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
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Body row — time axis + 3 columns */}
                            <View style={styles.bodyRow}>

                                {/* ── Left time axis ── */}
                                <View style={[styles.timeAxis, { height: bodyHeight }]}>
                                    {timeAxisPositions.map(tl => (
                                        <TimeAxisItem
                                            key={tl.hour}
                                            label={tl.label}
                                            topY={tl.topY}
                                            circleHalf={CIRCLE_SEL / 2}
                                            theme={theme}
                                        />
                                    ))}
                                </View>

                                {/* ── 3 day columns ── */}
                                {pageDates.map(date => {
                                    const key = formatDateKey(date);
                                    const dayIndex = date.getDay();
                                    const isSelected = key === selectedKey;
                                    const dayItems = itemsByDayOfWeek[dayIndex] ?? [];
                                    const circleSize = isSelected ? CIRCLE_SEL : CIRCLE_OTHER;
                                    const lineColor = isSelected
                                        ? `${theme.colors.primary}60`
                                        : `${theme.colors.primary}25`;

                                    return (
                                        <View
                                            key={key}
                                            style={[styles.column, { width: COL_WIDTH }]}
                                            onLayout={e => {
                                                const h = e.nativeEvent.layout.height;
                                                if (h > 0 && Math.abs(h - bodyHeight) > 5) {
                                                    setBodyHeight(h);
                                                }
                                            }}
                                        >
                                            {/* Vertical line */}
                                            <View style={[
                                                styles.centerLine,
                                                { backgroundColor: lineColor },
                                            ]} />

                                            {/* Pills — width = circleSize, height grows with duration, overlap is natural */}
                                            {dayItems.map(item => {
                                                const topY = timeToY(item.time, bodyHeight);
                                                const duration = (item as any).duration ?? DEFAULT_DURATION;
                                                const pillHeight = durationToPillHeight(duration, bodyHeight, circleSize);
                                                const leftOffset = (COL_WIDTH - circleSize) / 2;

                                                return (
                                                    <View
                                                        key={item.id}
                                                        style={{
                                                            position: 'absolute',
                                                            top: topY,
                                                            left: leftOffset,
                                                        }}
                                                    >
                                                        <TaskPill
                                                            item={item}
                                                            size={circleSize}
                                                            pillHeight={pillHeight}
                                                            isSelected={isSelected}
                                                            theme={theme}
                                                        />
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    ))}
                </ScrollView>
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
            paddingHorizontal: 16,
            paddingBottom: 8,
        },
        backButton: {
            marginRight: 10,
            zIndex: 10,
        },
        backIconCircle: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: theme.colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: `${theme.colors.text}08`,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                },
                android: { elevation: 2 },
            }),
        },
        headerDateBlock: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        headerDateInner: { flex: 1 },
        headerWeekday: {
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 28,
            letterSpacing: -0.3,
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

        /* ── Timeline layout ── */
        timelineWrapper: {
            flex: 1,
        },

        /* Day header row (day labels + date badges) */
        dayHeaderRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingRight: 8,
            paddingBottom: 10,
            paddingTop: 4,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: `${theme.colors.text}0A`,
        },
        dayHeaderCell: {
            alignItems: 'center',
            gap: 4,
        },
        dayLabel: {
            fontSize: 10,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            opacity: 0.55,
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
            ...Platform.select({
                ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                },
                android: { elevation: 4 },
            }),
        },
        dateBadgeGradient: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateBadgeToday: {
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
        },
        dateNum: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },

        /* Body row = time axis + columns */
        bodyRow: {
            flexDirection: 'row',
            paddingRight: 8,
        },

        /* Left time axis */
        timeAxis: {
            width: TIME_AXIS_WIDTH,
            position: 'relative',
        },

        /* Day column */
        column: {
            flex: 1,
            position: 'relative',
            minHeight: DEFAULT_BODY_HEIGHT,
        },
        centerLine: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 1.5,
            left: '50%' as unknown as number,
            marginLeft: -0.75,
            borderRadius: 1,
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