import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { Platform, View, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Theme } from '../../constants/shared';
import { RoutineItem, timeToMinutes, ICON_MAP } from '../../utils/utils';

export const getTimelineMinute = (timeStr: string, startHour: number) => {
    let m = timeToMinutes(timeStr);
    if (m < startHour * 60) m += 24 * 60;
    return m - startHour * 60;
};

const DURATION_DEFAULT = 30;

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



/* ─────────────────────────── Single Pill ─────────────────────────── */

export const TaskPill = memo<{
    item: RoutineItem;
    size: number;
    pillHeight: number;
    isSelected: boolean;
    theme: Theme;
    onPressTask?: (item: RoutineItem) => void;
}>(({ item, size, pillHeight, isSelected, theme, onPressTask }) => {
    const borderRadius = size / 2;
    const iconSize = Math.round(size * 0.42);
    const taskColor = TASK_COLORS[item.imageKey ?? ''] ?? theme.colors.primary;
    const accentBarHeight = Math.min(pillHeight * 0.28, size * 0.6);

    return (
        <Pressable
            onPress={() => onPressTask?.(item)}
            style={[
                {
                    width: size,
                    height: pillHeight,
                    borderRadius,
                    overflow: 'hidden',
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? `${taskColor}CC` : `${theme.colors.text}22`,
                },
                isSelected
                    ? Platform.select({
                        ios: { shadowColor: taskColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10 },
                        android: { elevation: 8 },
                    })
                    : Platform.select({
                        ios: {
                            shadowColor: theme.glows.card.shadowColor,
                            shadowOffset: theme.glows.card.shadowOffset,
                            shadowOpacity: theme.glows.card.shadowOpacity,
                            shadowRadius: theme.glows.card.shadowRadius,
                        },
                        android: { elevation: theme.glows.card.elevation },
                    }),
            ]}
        >
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isSelected ? taskColor : theme.colors.background
            }} />
            {!isSelected && (
                <LinearGradient
                    colors={[`${theme.colors.text}18`, `${theme.colors.text}08`]}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
            )}
            {isSelected && (
              <LinearGradient
                  colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: accentBarHeight }}
              />
            )}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                    name={ICON_MAP[item.imageKey ?? ''] ?? 'ellipse-outline'}
                    size={iconSize}
                    color={isSelected ? theme.colors.white : `${theme.colors.textSecondary}88`}
                />
            </View>
        </Pressable>
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
    startHour: number;
    onPressTask?: (item: RoutineItem) => void;
}>(({ cluster, size, isSelected, theme, cumY, TOTAL_MINUTES, startHour, onPressTask }) => {

    const clampSingle = (m: number) => Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m)));

    const durationToHeight = (timeStr: string, durationMins: number): number => {
        const m1 = getTimelineMinute(timeStr, startHour);
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
            <TaskPill item={item} size={size} pillHeight={pillHeight} isSelected={isSelected} theme={theme} onPressTask={onPressTask} />
        );
    }

    const clamp = (m: number) => Math.max(0, Math.min(TOTAL_MINUTES, Math.floor(m)));
    const itemMinute = (item: RoutineItem) => getTimelineMinute(item.time, startHour);
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
                        ios: { shadowColor: chainColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12 },
                        android: { elevation: 10 },
                    })
                    : Platform.select({
                        ios: {
                            shadowColor: theme.glows.card.shadowColor,
                            shadowOffset: theme.glows.card.shadowOffset,
                            shadowOpacity: theme.glows.card.shadowOpacity,
                            shadowRadius: theme.glows.card.shadowRadius,
                        },
                        android: { elevation: theme.glows.card.elevation },
                    }),
            ]}
        >
            {/* Equal-height pills stacked sequentially */}
            {pillData.map(({ item, top, height }, i) => (
                <View
                    key={item.id}
                    style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center', zIndex: i + 1 }}
                >
                    <TaskPill item={item} size={size} pillHeight={height} isSelected={isSelected} theme={theme} onPressTask={onPressTask} />
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