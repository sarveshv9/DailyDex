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

const CrossPlatformSegmentedControl: React.FC<CrossPlatformSegmentedControlProps> = (props) => {
  if (Platform.OS !== "web") {
    // On iOS/Android, use the native component
    const NativeSegmentedControl = require("@react-native-segmented-control/segmented-control").default;
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
                fontStyle && { fontFamily: fontStyle.fontFamily, color: fontStyle.color },
                isSelected && styles.segmentTextActive,
                isSelected && activeFontStyle && {
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
      backgroundColor: `${theme.colors.secondary}20`,
      borderRadius: 10,
      padding: 3,
      overflow: "hidden",
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: tintColor || theme.colors.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: theme.colors.secondary,
    },
    segmentTextActive: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
  });

export default CrossPlatformSegmentedControl;
