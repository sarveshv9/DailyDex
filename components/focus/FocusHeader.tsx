import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { Theme, getSharedStyles } from "../../styles/shared";

export interface FocusHeaderProps {
  onBack: () => void;
  onOpenAudioModal: () => void;
  isPlayingAudio: boolean;
  theme: Theme;
  isDarkMode: boolean;
}

const FocusHeaderComponent: React.FC<FocusHeaderProps> = ({
  onBack,
  onOpenAudioModal,
  isPlayingAudio,
  theme,
  isDarkMode,
}) => {
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <View style={styles.headerContainer}>
      {/* Standard Sheet Pull Handle */}
      <View style={styles.handle} />

      {/* Header Actions Row */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close focus session"
          style={({ pressed }) => [
            styles.headerIconButton,
            pressed && styles.pressedScale,
          ]}
        >
          <Ionicons name="chevron-down" size={24} color={theme.colors.primary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Ionicons name="leaf-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Focus Sanctuary</Text>
        </View>

        <Pressable
          onPress={onOpenAudioModal}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isPlayingAudio ? "Ambient sound playing" : "Select ambient sound"}
          style={({ pressed }) => [
            styles.headerIconButton,
            isPlayingAudio && styles.headerIconButtonActive,
            pressed && styles.pressedScale,
          ]}
        >
          <Ionicons
            name={isPlayingAudio ? "musical-notes" : "musical-note-outline"}
            size={20}
            color={isPlayingAudio ? theme.colors.onPrimary : theme.colors.primaryText}
          />
        </Pressable>
      </View>
    </View>
  );
};

export const FocusHeader = React.memo(FocusHeaderComponent);

const getStyles = (theme: Theme, isDarkMode: boolean) => {
  const shared = getSharedStyles(theme);
  return StyleSheet.create({
    headerContainer: {
      width: "100%",
      paddingTop: Platform.OS === "ios" ? 8 : 4,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
      alignSelf: "center",
      marginTop: 4,
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: themeTokens.spacing.lg,
      paddingBottom: 8,
    },
    headerIconButton: {
      ...shared.iconCircle,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 0,
    },
    headerIconButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    headerTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    headerTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: themeTokens.fonts.size.sm,
      color: theme.colors.primaryText,
      letterSpacing: 0.5,
    },
    pressedScale: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
};
