import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Theme, getSharedStyles } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import type { LucideIcon } from "lucide-react-native";

export interface CrossPlatformSegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (event: { nativeEvent: { selectedSegmentIndex: number } }) => void;
  tintColor?: string;
  fontStyle?: { fontFamily?: string; color?: string; fontSize?: number };
  activeFontStyle?: { fontFamily?: string; color?: string; fontSize?: number };
  icons?: LucideIcon[];
  disabled?: boolean;
}

export const CrossPlatformSegmentedControl: React.FC<
  CrossPlatformSegmentedControlProps
> = ({
  values,
  selectedIndex,
  onChange,
  tintColor,
  fontStyle,
  activeFontStyle,
  icons,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const activeColor = tintColor || theme.colors.primary;
  const [slideAnim] = useState(() => new Animated.Value(selectedIndex));
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [selectedIndex, slideAnim]);

  const handlePress = (index: number) => {
    if (disabled || index === selectedIndex) return;
    Haptics.selectionAsync();
    onChange({ nativeEvent: { selectedSegmentIndex: index } });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const count = Math.max(1, values.length);
  const padding = 4;
  const availableWidth = Math.max(0, containerWidth - padding * 2);
  const segmentWidth = availableWidth / count;

  const translateX = slideAnim.interpolate({
    inputRange: values.map((_, i) => i),
    outputRange: values.map((_, i) => i * segmentWidth),
    extrapolate: "clamp",
  });

  return (
    <View
      style={[styles.container, disabled && { opacity: 0.55 }]}
      onLayout={onLayout}
      accessibilityRole="tablist"
    >
      {/* Animated Sliding Pill */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.activeSlider,
            {
              width: segmentWidth,
              backgroundColor: activeColor,
              transform: [{ translateX }],
              ...Platform.select({
                ios: {
                  shadowColor: activeColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 4,
                },
                web: {
                  boxShadow: `0 4px 14px ${activeColor}55`,
                },
              }),
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Segments */}
      {values.map((value, index) => {
        const isSelected = index === selectedIndex;
        const Icon = icons?.[index];

        return (
          <Pressable
            key={`${value}-${index}`}
            style={styles.segment}
            onPress={() => handlePress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={value}
          >
            <View style={styles.contentRow}>
              {Icon && (
                <Icon
                  size={16}
                  strokeWidth={theme.icons.stroke}
                  color={
                    isSelected
                      ? activeFontStyle?.color || theme.colors.white
                      : fontStyle?.color || theme.colors.textSecondary
                  }
                />
              )}
              <Text
                style={[
                  styles.segmentText,
                  fontStyle && {
                    fontFamily: fontStyle.fontFamily,
                    color: fontStyle.color,
                    fontSize: fontStyle.fontSize,
                  },
                  isSelected && styles.segmentTextActive,
                  isSelected &&
                    activeFontStyle && {
                      fontFamily: activeFontStyle.fontFamily,
                      color: activeFontStyle.color,
                      fontSize: activeFontStyle.fontSize,
                    },
                ]}
                numberOfLines={1}
              >
                {value}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const getStyles = (theme: Theme) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    container: {
      ...shared.glassCard,
      flexDirection: "row",
      position: "relative",
      padding: 4,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: `0 4px 12px rgba(0,0,0,${theme.glass.shadowOpacity})`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        },
      }),
    },
    activeSlider: {
      position: "absolute",
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: theme.borderRadius.md,
      zIndex: 1,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.borderRadius.md,
      zIndex: 2,
    },
    contentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      letterSpacing: 0.2,
      textAlign: "center",
    },
    segmentTextActive: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
  });
};

export default CrossPlatformSegmentedControl;
