import React from "react";
import { Text, View } from "react-native";
import { Theme } from "../../constants/shared";

export type StatCardProps = {
  label: string;
  value: string | number; // ✅ FIXED: allow both number and string
  theme: Theme;
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, theme }) => {
  return (
    <View
      style={{
        flex: 1,
        marginHorizontal: 6,
        backgroundColor: theme.colors.card,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontFamily: theme.fonts.bold,
          color: theme.colors.text,
        }}
      >
        {String(value)} {/* ✅ Always converted to text safely */}
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
  );
};