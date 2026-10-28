/**
 * TimelineEventCard
 *
 * Minimalist, Decluttered Zen Day-View Timeline Card:
 *
 *  07:00    ( ⏰ )   Wake Up
 *   AM        │      30m • Start your day with a clear mind.
 *             │
 *
 * Architecture:
 *   - Col A (50px): Crisp time label (07:00 bold on top, AM/PM below)
 *   - Col B (54px): Segmented vertical spine (stops at icon edges, dashed during breaks) + 44px icon node
 *   - Col C (flex): Breathable title + subtitle (duration • subtasks • description)
 *   - Tick box completely removed
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { Theme } from '../../styles/shared';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from '../../utils/haptics';
import { RoutineItem, ICON_MAP, formatDuration, isWakeupOrSleep } from '../../utils/utils';
import { themeTokens } from '../../constants/themeTokens';

import { CATEGORY_COLORS } from '../../constants/categoryColors';

export const TASK_COLORS: Record<string, string> = CATEGORY_COLORS;

export interface TimelineEventCardProps {
  item: RoutineItem;
  onPress?: () => void;
  onToggleComplete?: (item: RoutineItem) => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Whether to show a "break" gap indicator BEFORE this event */
  showBreakBefore?: boolean;
  breakDurationMinutes?: number;
  /** Overlap chain state */
  chainPosition?: 'none' | 'start' | 'middle' | 'end';
}

const NODE_SIZE = 44;
const TIME_COL_W = 50;
const NODE_COL_W = 54;
const SPINE_WIDTH = 2;

const stylesCache = new Map<string, ReturnType<typeof getStyles>>();
const getCachedStyles = (theme: Theme, isDarkMode: boolean) => {
  const key = `${isDarkMode ? 'dark' : 'light'}-${theme.colors.primary}-${theme.colors.background}`;
  let styles = stylesCache.get(key);
  if (!styles) {
    styles = getStyles(theme, isDarkMode);
    stylesCache.set(key, styles);
  }
  return styles;
};

const TimelineEventCardComponent: React.FC<TimelineEventCardProps> = ({
  item,
  onPress,
  isFirst,
  isLast,
  showBreakBefore,
  breakDurationMinutes,
  chainPosition = 'none',
}) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getCachedStyles(theme, isDarkMode), [theme, isDarkMode]);

  const routineData = item;
  const isWakeupSleep = isWakeupOrSleep(routineData);
  // Wakeup and sleep NEVER overlap into a chain
  const effectiveChain = isWakeupSleep ? 'none' : chainPosition;

  // Time parsing (e.g. "07:00 AM" -> "07:00" & "AM")
  const [timeVal, ampm] = routineData.time.split(' ');
  const duration = routineData.duration || 30;
  const durationText = formatDuration(duration);

  const title = routineData.task;
  const description = routineData.description?.trim();

  // Icon lookup
  const icon: keyof typeof Ionicons.glyphMap =
    ICON_MAP[routineData.imageKey ?? ''] ?? 'checkmark-circle-outline';
  const primaryColor = theme.colors.primary;
  const spineColor = theme.colors.border;

  // Subtasks progress summary
  const subtasks = routineData.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  // Combined subtitle: "30m • 2/3 tasks • description"
  const subtitleParts = [durationText];
  if (totalSubtasks > 0) {
    subtitleParts.push(`${completedSubtasks}/${totalSubtasks} tasks`);
  }
  if (description) {
    subtitleParts.push(description);
  }
  const subtitleText = subtitleParts.join(' • ');

  return (
    <View style={styles.container}>
      {/* Optional rest break gap with dashed spine */}
      {showBreakBefore && (
        <View style={styles.breakRow}>
          <View style={styles.timeCol} />
          <View style={styles.nodeCol}>
            <View style={styles.breakDashedSpine}>
              <View style={[styles.breakDash, { backgroundColor: spineColor }]} />
              <View style={[styles.breakDash, { backgroundColor: spineColor }]} />
              <View style={[styles.breakDash, { backgroundColor: spineColor }]} />
            </View>
          </View>
          <View style={styles.breakTextCol}>
            <Text style={styles.breakText}>
              Rest break{breakDurationMinutes ? ` • ${formatDuration(breakDurationMinutes)}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Main Timeline Row */}
      <View style={styles.eventRow}>
        {/* Column A: Time label */}
        <View style={styles.timeCol}>
          <Text style={styles.timeValText}>{timeVal}</Text>
          {ampm ? <Text style={styles.ampmText}>{ampm}</Text> : null}
        </View>

        {/* Column B: Node & Vertical Spine */}
        <View style={styles.nodeCol}>
          {/* Top spine segment */}
          <View
            style={[
              styles.spineSegment,
              {
                backgroundColor: isFirst
                  ? 'transparent'
                  : effectiveChain === 'middle' || effectiveChain === 'end'
                  ? primaryColor
                  : spineColor,
                width: effectiveChain === 'middle' || effectiveChain === 'end' ? 3 : SPINE_WIDTH,
              },
            ]}
          />

          {/* Node Circle */}
          <View
            style={[
              styles.nodeCircle,
              isWakeupSleep || effectiveChain !== 'none'
                ? {
                    backgroundColor: primaryColor,
                    borderColor: theme.colors.background,
                    borderWidth: 2,
                  }
                : {
                    backgroundColor: theme.colors.primarySoft,
                    borderColor: theme.colors.border,
                    borderWidth: 1.5,
                  },
              (isWakeupSleep || effectiveChain !== 'none') && Platform.select({
                ios: {
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                },
                android: { elevation: 2 },
              }),
            ]}
          >
            <Ionicons
              name={icon}
              size={21}
              color={isWakeupSleep || effectiveChain !== 'none' ? theme.colors.onPrimary : theme.colors.primaryText}
            />
          </View>

          {/* Bottom spine segment */}
          <View
            style={[
              styles.spineSegment,
              styles.spineSegmentBottom,
              {
                backgroundColor: isLast
                  ? 'transparent'
                  : effectiveChain === 'start' || effectiveChain === 'middle'
                  ? primaryColor
                  : spineColor,
                width: effectiveChain === 'start' || effectiveChain === 'middle' ? 3 : SPINE_WIDTH,
              },
            ]}
          />
        </View>

        {/* Column C: Breathable content (title + subtitle, no tick box) */}
        <Pressable
          style={({ pressed }) => [
            styles.contentPressable,
            pressed && onPress && { opacity: 0.75 },
          ]}
          onPress={() => {
            if (onPress) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }
          }}
          disabled={!onPress}
          testID="timeline-event-card"
        >
          <Text style={styles.titleText} numberOfLines={1} testID="event-title">
            {title}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {subtitleText}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export const TimelineEventCard = React.memo(TimelineEventCardComponent);

/* ---------- Styles ---------- */
const getStyles = (theme: Theme, isDarkMode: boolean) => {
  return StyleSheet.create({
    container: {
      width: '100%',
    },

    /* Break gap row with dashed spine */
    breakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 36,
      paddingVertical: 2,
    },
    breakDashedSpine: {
      height: 30,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    breakDash: {
      width: SPINE_WIDTH,
      height: 6,
      borderRadius: 1,
    },
    breakTextCol: {
      flex: 1,
      paddingLeft: 14,
      paddingRight: 20,
      justifyContent: 'center',
    },
    breakText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      opacity: 0.7,
      letterSpacing: 0.2,
    },

    /* Main timeline row */
    eventRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 72,
    },

    /* Column A – Time */
    timeCol: {
      width: TIME_COL_W,
      alignItems: 'flex-end',
      paddingRight: 8,
      paddingTop: 14,
    },
    timeValText: {
      fontSize: themeTokens.fonts.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
      lineHeight: 16,
    },
    ampmText: {
      fontSize: themeTokens.fonts.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 2,
    },

    /* Column B – Spine & Node */
    nodeCol: {
      width: NODE_COL_W,
      alignItems: 'center',
    },
    spineSegment: {
      width: SPINE_WIDTH,
      height: 14,
    },
    spineSegmentBottom: {
      flex: 1,
      height: undefined,
    },
    nodeCircle: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },

    /* Column C – Content row (Takes full remaining width) */
    contentPressable: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 14,
      paddingRight: 20,
      paddingVertical: 12,
    },
    titleText: {
      fontSize: themeTokens.fonts.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.2,
      lineHeight: 22,
    },
    metaText: {
      fontSize: themeTokens.fonts.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginTop: 3,
      letterSpacing: -0.1,
    },

    /* Minimalist Skeleton Styles */
    skeletonBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 4,
    },
    skeletonCircle: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      backgroundColor: theme.colors.surfaceMuted,
    },
  });
};

const SkeletonTimelineEventCardComponent: React.FC<{ isFirst?: boolean; isLast?: boolean }> = ({ isFirst, isLast }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const [pulseAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const spineColor = isDarkMode ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.15)';

  return (
    <Animated.View style={[styles.eventRow, { opacity: pulseAnim }]}>
      {/* Column A */}
      <View style={styles.timeCol}>
        <View style={[styles.skeletonBox, { width: 34, height: 12, marginBottom: 4 }]} />
        <View style={[styles.skeletonBox, { width: 20, height: 10 }]} />
      </View>

      {/* Column B */}
      <View style={styles.nodeCol}>
        <View
          style={[
            styles.spineSegment,
            { backgroundColor: isFirst ? 'transparent' : spineColor },
          ]}
        />
        <View style={styles.skeletonCircle} />
        <View
          style={[
            styles.spineSegment,
            styles.spineSegmentBottom,
            { backgroundColor: isLast ? 'transparent' : spineColor },
          ]}
        />
      </View>

      {/* Column C */}
      <View style={styles.contentPressable}>
        <View style={[styles.skeletonBox, { width: 140, height: 16, marginBottom: 6 }]} />
        <View style={[styles.skeletonBox, { width: 190, height: 12 }]} />
      </View>
    </Animated.View>
  );
};

export const SkeletonTimelineEventCard = React.memo(SkeletonTimelineEventCardComponent);
