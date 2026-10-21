import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

export type StatCardProps = {
  label: string;
  value: string | number;
  theme: Theme;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: string;
  onPress?: () => void;
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  theme,
  iconName,
  iconColor,
  trend,
  onPress,
}) => {
  const { isDarkMode } = useTheme();
  const resolvedIconColor = iconColor || theme.colors.primary;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const Content = (
    <View style={styles.cardOuter}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 80}
        tint={isDarkMode ? "dark" : "light"}
        style={styles.blurContainer}
      >
        <View style={styles.glassOverlay} />

        {iconName && (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${resolvedIconColor}16` },
            ]}
          >
            <Ionicons name={iconName} size={18} color={resolvedIconColor} />
          </View>
        )}

        <Text style={[styles.valueText, { color: theme.colors.text, fontFamily: theme.fonts.bold }]} numberOfLines={1}>
          {String(value)}
        </Text>

        <Text style={[styles.labelText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]} numberOfLines={1}>
          {label}
        </Text>

        {trend ? (
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={11} color={theme.colors.primary} />
            <Text style={[styles.trendText, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>{trend}</Text>
          </View>
        ) : null}
      </BlurView>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressableContainer,
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
      >
        {Content}
      </Pressable>
    );
  }

  return <View style={styles.pressableContainer}>{Content}</View>;
};

const styles = StyleSheet.create({
  pressableContainer: {
    flex: 1,
    minWidth: 96,
  },
  cardOuter: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(125, 125, 125, 0.15)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  blurContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(125, 125, 125, 0.05)",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  valueText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "600",
  },
});