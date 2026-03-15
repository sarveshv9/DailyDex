import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

export type StatCardProps = {
  label: string;
  value: string | number;
  theme: Theme;
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, theme }) => {
  const { isDarkMode } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        marginHorizontal: 6,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.glass.borderColor,
        alignItems: "center",
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: theme.glass.shadowOpacity,
        shadowRadius: 8,
      }}
    >
      <BlurView
        intensity={50}
        tint={isDarkMode ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.glass.cardBg },
        ]}
      />
      <View style={{ padding: theme.spacing.md, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
          }}
        >
          {String(value)}
        </Text>

        <Text
          style={{
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.sm,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};