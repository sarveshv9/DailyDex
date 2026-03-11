/**
 * TimelineEventCard
 *
 * Matches the Structured app day-view layout exactly:
 *
 *  [time label]  [dashed line + icon circle]  [subtitle / title]      [○ ring]
 *
 * Layout columns:
 *   - Col A (56px): time label, right-aligned
 *   - Col B (56px): vertical dashed line with a filled icon circle centered on it
 *   - Col C (flex): subtitle + bold title text
 *   - Col D (36px): hollow completion ring
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../constants/shared';
import { useTheme } from '../context/ThemeContext';
import { CalendarEvent } from '../utils/calendar';
import { RoutineItem } from '../utils/utils';

export interface TimelineEventCardProps {
    item: RoutineItem | CalendarEvent;
    type: 'routine' | 'calendar';
    onPress?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
    /** Whether to show a "break" gap indicator BEFORE this event */
    showBreakBefore?: boolean;
}

// Maps imageKey -> Ionicons icon name
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
};

const ICON_SIZE = 44; // diameter of the icon circle
const TIME_COL_W = 52;
const NODE_COL_W = 60;

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
    item,
    type,
    onPress,
    isFirst,
    isLast,
    showBreakBefore,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const isRoutine = type === 'routine';
    const routineData = item as RoutineItem;
    const calendarData = item as CalendarEvent;

    const timeLabel = isRoutine
        ? routineData.time.replace(' ', '\n') // break "6:00 AM" into two lines
        : calendarData.startTime.replace(' ', '\n');

    const subtitle = isRoutine
        ? `${routineData.time}`
        : `${calendarData.startTime} – ${calendarData.endTime}`;

    const title = isRoutine ? routineData.task : calendarData.title;
    const description = isRoutine ? routineData.description : '';

    const icon: keyof typeof Ionicons.glyphMap = isRoutine
        ? ICON_MAP[routineData.imageKey ?? ''] ?? 'checkmark-circle-outline'
        : 'calendar-outline';


    const nodeColor = isRoutine ? theme.colors.primary : theme.colors.secondary;
    const lineColor = `${theme.colors.primary}35`;

    return (
        <View>
            {/* Optional break gap indicator before this event */}
            {showBreakBefore && (
                <View style={styles.breakRow}>
                    {/* Left and center dashed line segment */}
                    <View style={[styles.timeCol, { alignItems: 'flex-end', paddingRight: 0 }]} />
                    <View style={styles.nodeCol}>
                        <View style={[styles.dashedSegment, { backgroundColor: lineColor, height: 36 }]} />
                    </View>
                    <View style={styles.breakTextCol}>
                        <Text style={styles.breakText}>ᶻz</Text>
                    </View>
                </View>
            )}

            {/* Main Event Row */}
            <TouchableOpacity
                style={styles.eventRow}
                onPress={onPress}
                disabled={!onPress}
                activeOpacity={0.75}
                testID="timeline-event-card"
            >
                {/* Column A: Time label */}
                <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{timeLabel}</Text>
                </View>

                {/* Column B: Vertical dashed line + icon circle */}
                <View style={styles.nodeCol}>
                    {/* Top segment of the line (above the icon) */}
                    {!isFirst && (
                        <View style={[styles.dashedSegment, { backgroundColor: lineColor }]} />
                    )}

                    {/* The icon circle, sits on the line */}
                    <View style={[styles.iconCircle, { backgroundColor: nodeColor }]}>
                        <Ionicons name={icon} size={20} color={theme.colors.white} />
                    </View>

                    {/* Bottom segment of the line (below the icon), fills remaining space */}
                    {!isLast && (
                        <View style={[styles.dashedSegment, styles.dashedSegmentBottom, { backgroundColor: lineColor }]} />
                    )}
                </View>

                {/* Column C: Subtitle + title + description */}
                <View style={styles.textCol}>
                    <Text style={styles.subtitleText} numberOfLines={1}>
                        {subtitle}
                    </Text>
                    <Text style={styles.titleText} testID="event-title">{title}</Text>
                    {description ? (
                        <Text style={styles.descText} numberOfLines={2}>
                            {description}
                        </Text>
                    ) : null}
                </View>

                {/* Column D: Completion ring */}
                <View style={styles.ringCol}>
                    <View style={[styles.completionRing, { borderColor: nodeColor }]} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

/* ---------- Styles ---------- */
const getStyles = (theme: Theme) =>
    StyleSheet.create({
        /* Break gap row */
        breakRow: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 36,
        },
        breakTextCol: {
            flex: 1,
            paddingLeft: 12,
        },
        breakText: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
            opacity: 0.6,
        },

        /* Main event row */
        eventRow: {
            flexDirection: 'row',
            alignItems: 'stretch',
            minHeight: 90,
        },

        /* Column A – time */
        timeCol: {
            width: TIME_COL_W,
            alignItems: 'flex-end',
            paddingRight: 10,
            paddingTop: 6,
        },
        timeText: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            textAlign: 'right',
            lineHeight: 16,
        },

        /* Column B – node / dashed line */
        nodeCol: {
            width: NODE_COL_W,
            alignItems: 'center',
        },
        dashedSegment: {
            width: 3,
            // height set per-instance (top = 12, bottom = flex)
            height: 12,
            borderRadius: 2,
        },
        dashedSegmentBottom: {
            flex: 1, // takes remaining space below the circle
        },
        iconCircle: {
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: ICON_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 4,
        },

        /* Column C – text */
        textCol: {
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 14,
            justifyContent: 'center',
        },
        subtitleText: {
            fontSize: 11,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
            marginBottom: 3,
        },
        titleText: {
            fontSize: 18,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 22,
        },
        descText: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            marginTop: 4,
            lineHeight: 18,
        },

        /* Column D – ring */
        ringCol: {
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
        completionRing: {
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2,
            backgroundColor: 'transparent',
        },
    });
