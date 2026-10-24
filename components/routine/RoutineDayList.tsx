import React, { useCallback, useMemo } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../styles/shared";
import {
  isWakeupOrSleep,
  RoutineItem,
} from "../../utils/utils";
import {
  SkeletonTimelineEventCard,
  TimelineEventCard,
} from "../dashboard/TimelineEventCard";
import { EmptyState } from "../ui/EmptyState";

export interface RoutineTimelineEntry {
  minutes: number;
  type: "routine";
  data: RoutineItem;
}

export interface RoutineDayListProps {
  pageItems: RoutineTimelineEntry[];
  isLoading: boolean;
  isCenterPage: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onPressTask?: (item: RoutineItem) => void;
  onToggleComplete?: (item: RoutineItem) => void;
  onAddRitual?: () => void;
  width: number;
  height?: number;
}

const RoutineDayListComponent: React.FC<RoutineDayListProps> = ({
  pageItems,
  isLoading,
  isCenterPage,
  refreshing,
  onRefresh,
  onScroll,
  onPressTask,
  onToggleComplete,
  onAddRitual,
  width,
  height,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Compute chain positions for contiguous rituals
  const chainPositions = useMemo(() => {
    const positions: ("none" | "start" | "middle" | "end")[] = new Array(
      pageItems.length
    ).fill("none");

    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i].data;
      if (isWakeupOrSleep(item)) {
        positions[i] = "none";
        continue;
      }
      if (positions[i] !== "none") continue;

      const startMins = pageItems[i].minutes;
      const dur = item.duration ?? 30;
      let runEnd = startMins + dur;
      let j = i + 1;
      while (j < pageItems.length) {
        const nextItem = pageItems[j].data;
        if (isWakeupOrSleep(nextItem)) break;
        const nextStart = pageItems[j].minutes;
        if (nextStart < runEnd) {
          runEnd = Math.max(runEnd, nextStart + (nextItem.duration ?? 30));
          j++;
        } else {
          break;
        }
      }

      if (j - i >= 2) {
        positions[i] = "start";
        for (let k = i + 1; k < j - 1; k++) {
          positions[k] = "middle";
        }
        positions[j - 1] = "end";
        i = j - 1;
      }
    }

    return positions;
  }, [pageItems]);

  return (
    <ScrollView
      style={{ width, height: height || undefined }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={isCenterPage ? onScroll : undefined}
      scrollEventThrottle={16}
      bounces={false}
      refreshControl={
        isCenterPage && onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
    >
      <View style={styles.cardList}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, itemIdx) => (
            <SkeletonTimelineEventCard
              key={`skeleton-${itemIdx}`}
              isFirst={itemIdx === 0}
              isLast={itemIdx === 4}
            />
          ))
        ) : pageItems.length === 0 ? (
          <EmptyState
            title="No Rituals Scheduled"
            description="Tap the + below to add a ritual to your day."
            actionLabel={onAddRitual ? "Add Ritual" : undefined}
            onAction={onAddRitual}
            style={styles.emptyState}
          />
        ) : (
          pageItems.map((entry, itemIdx) => {
            const prevMins =
              itemIdx > 0 ? pageItems[itemIdx - 1].minutes : null;
            const breakMinutes =
              prevMins !== null ? entry.minutes - prevMins : 0;
            const showBreakBefore = prevMins !== null && breakMinutes > 45;
            const item = entry.data;

            return (
              <RoutineRow
                key={item.id}
                item={item}
                chainPosition={chainPositions[itemIdx]}
                isFirst={itemIdx === 0}
                isLast={itemIdx === pageItems.length - 1}
                showBreakBefore={showBreakBefore}
                breakDurationMinutes={
                  showBreakBefore ? breakMinutes : undefined
                }
                isCenterPage={isCenterPage}
                onPressTask={onPressTask}
                onToggleComplete={onToggleComplete}
              />
            );
          })
        )}
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

interface RoutineRowProps {
  item: RoutineItem;
  chainPosition: "none" | "start" | "middle" | "end";
  isFirst: boolean;
  isLast: boolean;
  showBreakBefore: boolean;
  breakDurationMinutes?: number;
  isCenterPage: boolean;
  onPressTask?: (item: RoutineItem) => void;
  onToggleComplete?: (item: RoutineItem) => void;
}

const RoutineRowComponent: React.FC<RoutineRowProps> = ({
  item,
  chainPosition,
  isFirst,
  isLast,
  showBreakBefore,
  breakDurationMinutes,
  isCenterPage,
  onPressTask,
  onToggleComplete,
}) => {
  const handlePress = useCallback(() => {
    if (isCenterPage && onPressTask) {
      onPressTask(item);
    }
  }, [isCenterPage, onPressTask, item]);

  const handleToggle = useCallback(
    (t: RoutineItem) => {
      if (isCenterPage && onToggleComplete) {
        onToggleComplete(t);
      }
    },
    [isCenterPage, onToggleComplete]
  );

  return (
    <TimelineEventCard
      item={item}
      chainPosition={chainPosition}
      isFirst={isFirst}
      isLast={isLast}
      showBreakBefore={showBreakBefore}
      breakDurationMinutes={breakDurationMinutes}
      onPress={isCenterPage && onPressTask ? handlePress : undefined}
      onToggleComplete={
        isCenterPage && onToggleComplete ? handleToggle : undefined
      }
    />
  );
};

const RoutineRow = React.memo(RoutineRowComponent);

export const RoutineDayList = React.memo(RoutineDayListComponent);

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingTop: themeTokens.spacing.sm + 2,
    },
    cardList: {
      gap: 0,
    },
    emptyState: {
      paddingVertical: themeTokens.spacing.xxl + 16,
    },
    bottomSpacer: {
      height: 100,
    },
  });
