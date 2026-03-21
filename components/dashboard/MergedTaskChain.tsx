import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Theme } from '../../constants/shared';
import { RoutineItem, timeToMinutes } from '../../utils/utils';

const START_HOUR = 6;

const getTimelineMinute = (timeStr: string) => {
    let m = timeToMinutes(timeStr);
    if (m < START_HOUR * 60) m += 24 * 60;
    return m - START_HOUR * 60;
};

const DURATION_DEFAULT = 30;

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

/* ─────────────────────────── Single Pill ─────────────────────────── */

export const TaskPill = memo<{
    item: RoutineItem;
    size: number;
    pillHeight: number;
    isSelected: boolean;
    theme: Theme;
}>(({ item, size, pillHeight, isSelected, theme }) => {
    const borderRadius = size / 2;
    const iconSize = Math.round(size * 0.42);
    const taskColor = TASK_COLORS[item.imageKey ?? ''] ?? theme.colors.primary;
    const accentBarHeight = Math.min(pillHeight * 0.28, size * 0.6);

    return (
        <View
            style={[
                {
                    width: size,
                    height: pillHeight,
                    borderRadius,
                    overflow: 'hidden',
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? `${taskColor}90` : `${theme.colors.text}22`,
                },
                isSelected
                    ? Platform.select({
                        ios: { shadowColor: taskColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10 },
                        android: { elevation: 8 },
                    })
                    : Platform.select({
                        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
                        android: { elevation: 2 },
                    }),
            ]}
        >
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.background }} />
            <LinearGradient
                colors={isSelected ? [`${taskColor}55`, `${taskColor}28`, `${taskColor}10`] : [`${theme.colors.text}18`, `${theme.colors.text}08`]}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <LinearGradient
                colors={isSelected ? [taskColor, `${taskColor}00`] : [`${theme.colors.text}28`, `${theme.colors.text}00`]}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: accentBarHeight, opacity: isSelected ? 0.55 : 0.4 }}
            />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                    name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                    size={iconSize}
                    color={isSelected ? taskColor : `${theme.colors.textSecondary}88`}
                />
            </View>
        </View>
    );
});

/* ─────────────────────────── MergedTaskChain ─────────────────────────── */
/*
 * 3-layer sandwich approach (matching the pink reference):
 *
 *   Layer 0 (back)  : Top pill
 *   Layer 1 (middle): Background-coloured ellipse (creates the "eye")
 *   Layer 2 (front) : Bottom pill
 *
 * The ellipse covers the bottom of the top pill.
 * The bottom pill covers the bottom of the ellipse.
 * What remains visible of the ellipse IS the eye/lens shape.
 */

export const MergedTaskChain = memo<{
    cluster: RoutineItem[];
    size: number;
    isSelected: boolean;
    theme: Theme;
    cumY: number[];
    TOTAL_MINUTES: number;
}>(({ cluster, size, isSelected, theme, cumY, TOTAL_MINUTES }) => {

    const clampSingle = (m: number) => Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m)));

    const durationToHeight = (timeStr: string, durationMins: number): number => {
        const m1 = getTimelineMinute(timeStr);
        const m2 = m1 + durationMins;
        const y1 = cumY[clampSingle(m1)] || 0;
        const y2 = cumY[clampSingle(m2)] || 0;
        return Math.max(size, y2 - y1);
    };

    // Single item — no chain needed
    if (cluster.length === 1) {
        const item = cluster[0];
        const pillHeight = durationToHeight(item.time, item.duration ?? DURATION_DEFAULT);
        return (
            <TaskPill item={item} size={size} pillHeight={pillHeight} isSelected={isSelected} theme={theme} />
        );
    }

    const clamp = (m: number) => Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m)));
    const itemMinute = (item: RoutineItem) => getTimelineMinute(item.time);
    const itemEndMinute = (item: RoutineItem) => itemMinute(item) + (item.duration ?? DURATION_DEFAULT);

    // Cluster's real timeline slot: first start → last end
    const clusterStartMin = Math.min(...cluster.map(itemMinute));
    const clusterEndMin = Math.max(...cluster.map(itemEndMinute));
    const clusterY0 = cumY[clamp(clusterStartMin)] ?? 0;
    const clusterY1 = cumY[clamp(clusterEndMin)] ?? 0;
    const totalHeight = Math.max(size, clusterY1 - clusterY0);

    // Sort by start time
    const sorted = [...cluster].sort((a, b) => itemMinute(a) - itemMinute(b));

    // Every pill gets an equal share of the total slot height.
    // This guarantees: sum of heights = totalHeight (never overflows),
    // and every pill is the same size regardless of individual durations.
    const pillHeight = totalHeight / sorted.length;

    const pillData = sorted.map((item, i) => ({
        item,
        top: i * pillHeight,
        height: pillHeight,
    }));

    // ── Eye lens (vesica piscis via SVG) ───────────────────────────────
    const eyeHalf = Math.round(size * 0.22);
    const W = size;
    const H = eyeHalf;
    const Rv = (W * W / 4 + H * H) / (2 * H);
    const eyePath =
        `M 0 ${H} A ${Rv} ${Rv} 0 0 0 ${W} ${H} A ${Rv} ${Rv} 0 0 1 0 ${H} Z`;

    const chainColor = TASK_COLORS[sorted[0].imageKey ?? ''] ?? theme.colors.primary;

    return (
        <View
            style={[
                {
                    width: size,
                    height: totalHeight,
                    borderRadius: size / 2,
                    borderWidth: isSelected ? 2 : 1.5,
                    borderColor: isSelected ? `${chainColor}70` : `${theme.colors.text}28`,
                    overflow: 'visible',
                },
                isSelected
                    ? Platform.select({
                        ios: { shadowColor: chainColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
                        android: { elevation: 10 },
                    })
                    : Platform.select({
                        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
                        android: { elevation: 3 },
                    }),
            ]}
        >
            {/* Equal-height pills stacked sequentially */}
            {pillData.map(({ item, top, height }, i) => (
                <View
                    key={item.id}
                    style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center', zIndex: i + 1 }}
                >
                    <TaskPill item={item} size={size} pillHeight={height} isSelected={isSelected} theme={theme} />
                </View>
            ))}

            {/* SVG vesica-piscis eye at every junction seam */}
            {pillData.slice(1).map(({ item, top }) => (
                <View
                    key={`eye-${item.id}`}
                    style={{ position: 'absolute', top: top - H, left: 0, width: W, height: H * 2, zIndex: 100 }}
                >
                    <Svg width={W} height={H * 2}>
                        <Path d={eyePath} fill={theme.colors.background} />
                    </Svg>
                </View>
            ))}
        </View>
    );
});