import React, { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import * as Haptics from "../../utils/haptics";

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColor?: {
    false: string;
    true: string;
  };
  thumbColor?: string;
  ios_backgroundColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const AppSwitch: React.FC<AppSwitchProps> = ({
  value,
  onValueChange,
  trackColor,
  thumbColor = "#FFFFFF",
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const [animatedValue] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [value, animatedValue]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onValueChange(!value);
  };

  const offTrack = trackColor?.false ?? "#D4D4D8";
  const onTrack = trackColor?.true ?? "#000000";

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [offTrack, onTrack],
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.trackContainer, style]}
    >
      <Animated.View style={[styles.trackBackground, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  trackContainer: {
    width: 48,
    height: 28,
    justifyContent: "center",
  },
  trackBackground: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 3,
  },
});

export default AppSwitch;
