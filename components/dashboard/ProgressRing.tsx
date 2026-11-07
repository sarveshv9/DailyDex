import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}

const ProgressRingComponent: React.FC<ProgressRingProps> = ({
  progress,
  size = 52,
  strokeWidth = 4.5,
  color,
  trackColor,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const targetOffset = circumference * (1 - clampedProgress);

  // Smooth fluid spring stroke fill
  const animatedOffset = useSharedValue(circumference);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    animatedOffset.value = withSpring(targetOffset, {
      damping: 18,
      stiffness: 90,
      mass: 0.8,
    });
  }, [targetOffset, animatedOffset]);

  // Subtle celebration pop when reaching 100% completion
  useEffect(() => {
    if (clampedProgress >= 1) {
      ringScale.value = withSequence(
        withSpring(1.08, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 160 })
      );
    }
  }, [clampedProgress, ringScale]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        animatedContainerStyle,
      ]}
    >
      <Svg
        width={size}
        height={size}
        style={[StyleSheet.absoluteFill, styles.svgRotate]}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </Animated.View>
  );
};

export const ProgressRing = React.memo(ProgressRingComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svgRotate: {
    transform: [{ rotate: "-90deg" }],
  },
});
