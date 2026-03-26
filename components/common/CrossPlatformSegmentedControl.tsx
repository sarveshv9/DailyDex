import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../constants/shared";

interface CrossPlatformSegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (event: { nativeEvent: { selectedSegmentIndex: number } }) => void;
  tintColor?: string;
  fontStyle?: { fontFamily?: string; color?: string };
  activeFontStyle?: { fontFamily?: string; color?: string };
}

const CrossPlatformSegmentedControl: React.FC<
  CrossPlatformSegmentedControlProps
> = (props) => {
  if (Platform.OS !== "web") {
    // On iOS/Android, use the native component
    const NativeSegmentedControl =
      require("@react-native-segmented-control/segmented-control").default;
    return <NativeSegmentedControl {...props} />;
  }

  return <WebSegmentedControl {...props} />;
};

const WebSegmentedControl: React.FC<CrossPlatformSegmentedControlProps> = ({
  values,
  selectedIndex,
  onChange,
  tintColor,
  fontStyle,
  activeFontStyle,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, tintColor), [theme, tintColor]);

  return (
    <View style={styles.container}>
      {values.map((value, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={value}
            style={[styles.segment, isSelected && styles.segmentActive]}
            onPress={() =>
              onChange({ nativeEvent: { selectedSegmentIndex: index } })
            }
          >
            <Text
              style={[
                styles.segmentText,
                fontStyle && {
                  fontFamily: fontStyle.fontFamily,
                  color: fontStyle.color,
                },
                isSelected && styles.segmentTextActive,
                isSelected &&
                  activeFontStyle && {
                    fontFamily: activeFontStyle.fontFamily,
                    color: activeFontStyle.color,
                  },
              ]}
            >
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const getStyles = (theme: Theme, tintColor?: string) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: theme.glass.cardBg,
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      borderRadius: theme.borderRadius.lg,
      padding: 4,
      ...(Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.glass.shadowOpacity,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
        web: {
          boxShadow: `0 4px 12px rgba(0,0,0,${theme.glass.shadowOpacity})`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        },
      }) as any),
    },
    segment: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.borderRadius.md,
      marginHorizontal: 2,
    },
    segmentActive: {
      backgroundColor: tintColor || theme.colors.primary,
      ...(Platform.select({
        ios: {
          shadowColor: tintColor || theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
        web: {
          boxShadow: `0 4px 8px ${tintColor || theme.colors.primary}40`,
        },
      }) as any),
    },
    segmentText: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textSecondary,
      letterSpacing: 0.3,
    },
    segmentTextActive: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
  });

export default CrossPlatformSegmentedControl;
