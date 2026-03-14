import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Theme } from '../constants/shared';
import { useTheme } from '../context/ThemeContext';
import { RoutineItem, timeToMinutes } from '../utils/utils';

/* ─────────────────────────────── Config ─────────────────────────────── */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Visible time window (6 AM – 10 PM) */
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

/** Column dimensions */
// Column count and width are now calculated dynamically based on viewMode

/** Icon circle sizes */
const CIRCLE_SEL = 34;         // selected day – larger, fully opaque
const CIRCLE_OTHER = 26;       // other days – smaller, muted

/** Height of the column body will be measured dynamically */
const DEFAULT_BODY_HEIGHT = 320;

/** Minimum gap (px) between top edges of consecutive circles to prevent overlap */
const MIN_GAP_SEL = CIRCLE_SEL + 4;
const MIN_GAP_OTHER = CIRCLE_OTHER + 4;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─────────────────────────────── Helpers ────────────────────────────── */

const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getWeekStart = (date: Date) => {
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

const get3DayDates = (centerDate: Date): Date[] => {
    return Array.from({ length: 3 }, (_, i) => {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() + (i - 1));
        return d;
    });
};

/**
 * Given a list of RoutineItems (pre-sorted by time), compute the Y top-positions
 * for their circles, ensuring no two circles overlap.
 */
const computePositions = (items: RoutineItem[], circleSize: number, bodyHeight: number): number[] => {
    if (items.length === 0) return [];
    const maxTop = Math.max(0, bodyHeight - circleSize);
    const minGap = circleSize + 4;
    const startMin = START_HOUR * 60;

    // 1. Ideal positions
    const positions = items.map((item) => {
        const ratio = (timeToMinutes(item.time) - startMin) / TOTAL_MINUTES;
        return Math.max(0, Math.min(maxTop, ratio * maxTop));
    });

    // 2. Forward collision pass
    for (let i = 1; i < positions.length; i++) {
        if (positions[i] < positions[i - 1] + minGap) {
            positions[i] = positions[i - 1] + minGap;
        }
    }

    // 3. Clamp (in case the last item was pushed past the bottom)
    for (let i = positions.length - 1; i >= 0; i--) {
        if (positions[i] > maxTop) {
            positions[i] = maxTop;
            if (i > 0 && positions[i] - positions[i - 1] < minGap) {
                positions[i - 1] = positions[i] - minGap;
            }
        }
    }

    return positions;
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

/* ─────────────────────────────── Component ──────────────────────────── */

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
    selectedDate,
    onSelectDate,
    routineItems, // This is still used for the "selected day" highlights/peek card if we want, but let's call it allRoutines for clarity if we change it in the parent.
    onPressPeek,
    scrollY,
    listAnim,
}) => {
    // For clarity in migration, let's treat routineItems prop as all routines if passed that way.
    // However, the parent currently passes only the selected day's items. 
    // I will change the parent to pass all items.
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const scrollRef = useRef<ScrollView>(null);
    const [viewMode, setViewMode] = React.useState<'3-day' | '7-day'>('3-day');
    const columnCount = viewMode === '7-day' ? 7 : 3;
    const colWidth = (SCREEN_WIDTH - 32) / columnCount;

    const [bodyHeight, setBodyHeight] = React.useState(DEFAULT_BODY_HEIGHT);

    const circleSel = viewMode === '7-day' ? 34 : 72;
    const circleOther = viewMode === '7-day' ? 26 : 56;

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ x: SCREEN_WIDTH * 2, animated: false });
        }
    }, [viewMode]);

    // Fade out everything except the date header when the list is expanded (listAnim -> 1) 
    // OR when the user scrolls inside the list (scrollY -> 90)
    // Inverse of collapseOpacity: 0 when timeline is visible, 1 when hidden
    const headerCollapseAnim = useMemo(() => {
        if (!scrollY && !listAnim) return new Animated.Value(0);
        const anims = [];
        if (listAnim) anims.push(listAnim);
        if (scrollY) {
            anims.push(scrollY.interpolate({
                inputRange: [0, 90],
                outputRange: [0, 1],
                extrapolate: 'clamp',
            }));
        }
        if (anims.length === 2) {
            return Animated.add(anims[0], anims[1]).interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
            });
        }
        return anims[0] || new Animated.Value(0);
    }, [scrollY, listAnim]);

    const headerPaddingTop = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [14, 30],
    });

    const headerFontSize = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 32],
    });

    const collapseOpacity = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    // We show 5 pages total (prev 2 + current + next 2) centered on today
    const pages = useMemo(() => {
        return Array.from({ length: 5 }, (_, pi) => {
            const anchor = new Date(today);
            if (viewMode === '7-day') {
                anchor.setDate(anchor.getDate() + (pi - 2) * 7);
                return getWeekDates(anchor);
            } else {
                anchor.setDate(anchor.getDate() + (pi - 2) * 3);
                return get3DayDates(anchor);
            }
        });
    }, [today, viewMode]);

    const selectedKey = formatDateKey(selectedDate);
    const todayKey = formatDateKey(today);

    // Date text from selected date
    const dateHeader = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    // Map of day index (0-6) -> sorted items for that day of week
    const itemsByDayOfWeek = useMemo(() => {
        const map: Record<number, RoutineItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        routineItems.forEach(item => {
            if (item.daysOfWeek) {
                item.daysOfWeek.forEach(dayIndex => {
                    if (map[dayIndex]) {
                        map[dayIndex].push(item);
                    }
                });
            }
        });
        // Sort each array
        Object.keys(map).forEach(day => {
            map[Number(day)].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        });
        return map;
    }, [routineItems]);

    const positionsByDayOfWeekSelected = useMemo(() => {
        const map: Record<number, number[]> = {};
        Object.keys(itemsByDayOfWeek).forEach(day => {
            map[Number(day)] = computePositions(itemsByDayOfWeek[Number(day)], circleSel, bodyHeight);
        });
        return map;
    }, [itemsByDayOfWeek, circleSel, bodyHeight]);

    const positionsByDayOfWeekOther = useMemo(() => {
        const map: Record<number, number[]> = {};
        Object.keys(itemsByDayOfWeek).forEach(day => {
            map[Number(day)] = computePositions(itemsByDayOfWeek[Number(day)], circleOther, bodyHeight);
        });
        return map;
    }, [itemsByDayOfWeek, circleOther, bodyHeight]);

    const currentDayOfWeek = selectedDate.getDay();
    const currentDayItems = useMemo(() => itemsByDayOfWeek[currentDayOfWeek] || [], [itemsByDayOfWeek, currentDayOfWeek]);
    const firstItem = currentDayItems[0] ?? null;

    const handleSelectDate = useCallback((date: Date) => {
        Haptics.selectionAsync();
        onSelectDate(date);
    }, [onSelectDate]);

    const router = useRouter();

    return (
        <View style={styles.outer} testID="day-timeline-view">
            {/* ──────── Header (Integrated from WeeklyCalendar) ──────── */}
            <Animated.View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    testID="back-button"
                >
                    <View style={styles.backIconCircle}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </View>
                </Pressable>

                <Pressable
                    style={styles.headerDateBlock}
                    onPress={() => handleSelectDate(today)}
                >
                    <Animated.Text style={[styles.headerText, { fontSize: headerFontSize }]}>{dateHeader}</Animated.Text>
                    <Animated.Text style={[styles.headerArrow, { fontSize: headerFontSize }]}> ›</Animated.Text>
                </Pressable>
                
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

            {/* ────────────────────── Columns ScrollView ────────────────────── */}
            <Animated.View style={[styles.columnsWrapper, { opacity: collapseOpacity }]}>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.columnsContent}
                    onLayout={() => {
                        // Scroll to the current week center page on mount
                        if (scrollRef.current) {
                            setTimeout(() => {
                                scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * 2, animated: false });
                            }, 50);
                        }
                    }}
                >
                    {pages.map((pageDates, wi) => (
                        <View key={wi} style={styles.weekPage}>
                            {pageDates.map((date, di) => {
                                const key = formatDateKey(date);
                                const dayIndex = date.getDay();
                                const isSelected = key === selectedKey;
                                const isToday = key === todayKey;
                                const circleSize = isSelected ? circleSel : circleOther;
                                const positions = isSelected ? positionsByDayOfWeekSelected[dayIndex] || [] : positionsByDayOfWeekOther[dayIndex] || [];

                                const lineColor = isSelected
                                    ? `${theme.colors.primary}60`
                                    : `${theme.colors.textSecondary}25`;
                                const circleColor = isSelected
                                    ? theme.colors.primary
                                    : `${theme.colors.textSecondary}40`;
                                const iconColor = isSelected
                                    ? theme.colors.white
                                    : `${theme.colors.textSecondary}80`;
                                const iconSize = isSelected ? (viewMode === '7-day' ? 15 : 34) : (viewMode === '7-day' ? 11 : 24);

                                return (
                                    <View
                                        key={key}
                                        style={[styles.dayColumn, { width: colWidth }]}
                                    >
                                        {/* ── Day label ── */}
                                        <Text
                                            style={[
                                                styles.dayLabel,
                                                isSelected && styles.dayLabelSelected,
                                                isToday && !isSelected && styles.dayLabelToday,
                                            ]}
                                        >
                                            {DAY_LABELS[dayIndex]}
                                        </Text>

                                        {/* ── Date badge ── */}
                                        <Pressable
                                            onPress={() => handleSelectDate(date)}
                                            style={[
                                                styles.dateBadge,
                                                isSelected && { backgroundColor: theme.colors.primary },
                                                isToday && !isSelected && styles.dateBadgeToday,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dateNum,
                                                    isSelected && { color: theme.colors.white },
                                                    isToday && !isSelected && { color: theme.colors.primary },
                                                ]}
                                            >
                                                {date.getDate()}
                                            </Text>
                                        </Pressable>

                                        {/* ── Column body: line + circles ── */}
                                        <View 
                                            style={[styles.columnBody, { width: colWidth }]}
                                            onLayout={(e) => {
                                                const h = e.nativeEvent.layout.height;
                                                if (h > 0 && Math.abs(h - bodyHeight) > 5) {
                                                    setBodyHeight(h);
                                                }
                                            }}
                                        >
                                            <View style={[styles.centreLine, { backgroundColor: lineColor, left: (colWidth - 2) / 2 }]} />
                                            {(itemsByDayOfWeek[dayIndex] || []).map((item, idx) => {
                                                const top = (positions || [])[idx] ?? 0;
                                                const leftOffset = (colWidth - circleSize) / 2;
                                                return (
                                                    <View
                                                        key={item.id}
                                                        style={[
                                                            styles.circle,
                                                            {
                                                                top,
                                                                left: leftOffset,
                                                                width: circleSize,
                                                                height: circleSize,
                                                                borderRadius: circleSize / 2,
                                                                backgroundColor: circleColor,
                                                            },
                                                            isSelected && styles.circleShadow,
                                                        ]}
                                                    >
                                                        <Ionicons
                                                            name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                                                            size={iconSize}
                                                            color={iconColor}
                                                        />
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* ────────────────────────── Peek Card ─────────────────────────── */}
            {firstItem && (
                <Animated.View style={[styles.peekWrapper, { opacity: collapseOpacity }]}>
                    <View style={styles.peekDivider} />
                    <Pressable
                        style={({ pressed }) => [
                            styles.peekCard,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={onPressPeek}
                        testID="peek-card"
                    >
                        <View style={[styles.peekCircle, { backgroundColor: theme.colors.primary }]}>
                            <Ionicons
                                name={ICON_MAP[firstItem.imageKey ?? ''] ?? 'ellipse-outline'}
                                size={22}
                                color={theme.colors.white}
                            />
                        </View>
                        <View style={styles.peekText}>
                            <Text style={styles.peekTime}>{firstItem.time} {'↺'}</Text>
                            <Text style={styles.peekTitle} numberOfLines={1} testID="peek-title">{firstItem.task}</Text>
                        </View>
                        <View style={[styles.peekRing, { borderColor: `${theme.colors.primary}70` }]} />
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
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingBottom: 10,
        },
        backButton: {
            padding: 8,
            marginRight: 4,
            zIndex: 10,
        },
        backIconCircle: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        headerDateBlock: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            flex: 1,
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
        viewToggleBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${theme.colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
        },

        /* ── Columns ── */
        columnsWrapper: {
            flex: 1,
        },
        columnsContent: {
            flexGrow: 1,
        },
        weekPage: {
            width: SCREEN_WIDTH,
            flexDirection: 'row',
            paddingHorizontal: 16,
            flex: 1,
        },
        dayColumn: {
            alignItems: 'center',
            flex: 1,
        },
        dayLabel: {
            fontSize: 10,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            marginBottom: 6,
        },
        dayLabelSelected: {
            color: theme.colors.primary,
        },
        dayLabelToday: {
            color: theme.colors.primary,
            opacity: 0.6,
        },
        dateBadge: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
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

        /* ── Column body ── */
        columnBody: {
            flex: 1,
            position: 'relative',
            minHeight: 150,
        },
        centreLine: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 2,
            borderRadius: 1,
        },
        circle: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleShadow: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
        },

        /* ── Peek card ── */
        peekWrapper: {
            paddingBottom: 20,
        },
        peekDivider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: `${theme.colors.text}14`,
            marginBottom: 12,
            marginHorizontal: 16,
        },
        peekCard: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: theme.colors.card,
            marginHorizontal: 12,
            borderRadius: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 4,
        },
        peekCircle: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 3,
        },
        peekText: {
            flex: 1,
        },
        peekTime: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            marginBottom: 3,
        },
        peekTitle: {
            fontSize: 20,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        peekRing: {
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2,
            backgroundColor: 'transparent',
        },
    });
