// components/profile/SettingsSection.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

interface SettingsSectionProps {
  theme: Theme;
  onOpenThemeModal?: () => void;
  onOpenMusicModal?: () => void;
  handleBackup: () => void;
  handleRestore?: () => void;
  handleResetTasks: () => void;
}

interface SettingItemProps {
  theme: Theme;
  iconName: keyof typeof Ionicons.glyphMap;
  text: string;
  subtext?: string;
  onPress: () => void;
  isLast?: boolean;
  isDestructive?: boolean;
  rightBadge?: string;
}

const SettingItem = React.memo<SettingItemProps>(
  ({
    theme,
    iconName,
    text,
    subtext,
    onPress,
    isLast = false,
    isDestructive = false,
    rightBadge,
  }) => {
    const iconColor = isDestructive ? "#FF453A" : theme.colors.primary;

    const handlePress = () => {
      Haptics.impactAsync(
        isDestructive
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
      onPress();
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.settingItem,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: `${theme.colors.secondary}18`,
          },
          pressed && {
            backgroundColor: `${theme.colors.secondary}08`,
            opacity: 0.85,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={text}
      >
        <View style={styles.settingItemLeft}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDestructive
                  ? "#FF453A18"
                  : `${theme.colors.primary}16`,
              },
            ]}
          >
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.settingText,
                {
                  color: isDestructive ? "#FF453A" : theme.colors.text,
                  fontFamily: theme.fonts.medium,
                },
              ]}
              numberOfLines={1}
            >
              {text}
            </Text>
            {subtext ? (
              <Text
                style={[
                  styles.settingSubtext,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.regular,
                  },
                ]}
                numberOfLines={1}
              >
                {subtext}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.settingItemRight}>
          {rightBadge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: `${theme.colors.primary}18` },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.primary, fontFamily: theme.fonts.bold },
                ]}
              >
                {rightBadge}
              </Text>
            </View>
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={`${theme.colors.textSecondary}80`}
          />
        </View>
      </Pressable>
    );
  }
);

SettingItem.displayName = "SettingItem";

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  theme,
  onOpenThemeModal,
  onOpenMusicModal,
  handleBackup,
  handleRestore,
  handleResetTasks,
}) => {
  const router = useRouter();

  const handleOpenGeneralSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  return (
    <View style={styles.container}>
      {/* 1. Appearance & Preferences */}
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.bold },
        ]}
      >
        App Experience
      </Text>

      <View
        style={[
          styles.settingsCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.glass.borderColor,
          },
        ]}
      >
        <SettingItem
          theme={theme}
          iconName="settings-outline"
          text="General Settings"
          subtext="Notifications, haptics & routine timing"
          onPress={handleOpenGeneralSettings}
          isLast={!onOpenThemeModal && !onOpenMusicModal}
        />
        {onOpenThemeModal && (
          <SettingItem
            theme={theme}
            iconName="color-palette-outline"
            text="Theme & Appearance"
            subtext="Pokemon styles & dynamic modes"
            onPress={onOpenThemeModal}
            isLast={!onOpenMusicModal}
          />
        )}
        {onOpenMusicModal && (
          <SettingItem
            theme={theme}
            iconName="musical-notes-outline"
            text="Focus Soundscapes"
            subtext="Calming Lo-Fi audio backgrounds"
            onPress={onOpenMusicModal}
            isLast
          />
        )}
      </View>

      {/* 2. Data Management */}
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.fonts.bold,
            marginTop: theme.spacing.lg,
          },
        ]}
      >
        Data & Storage
      </Text>

      <View
        style={[
          styles.settingsCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.glass.borderColor,
          },
        ]}
      >
        <SettingItem
          theme={theme}
          iconName="cloud-upload-outline"
          text="Backup & Export"
          subtext="Save your data locally or share"
          onPress={handleBackup}
        />
        {handleRestore && (
          <SettingItem
            theme={theme}
            iconName="cloud-download-outline"
            text="Restore Backup"
            subtext="Import data from JSON backup"
            onPress={handleRestore}
          />
        )}
        <SettingItem
          theme={theme}
          iconName="trash-outline"
          text="Reset All Tasks"
          subtext="Keep Wake Up & Sleep only"
          onPress={handleResetTasks}
          isLast
          isDestructive
        />
      </View>

      {/* 3. Legal & About */}
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.fonts.bold,
            marginTop: theme.spacing.lg,
          },
        ]}
      >
        About & Legal
      </Text>

      <View
        style={[
          styles.settingsCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.glass.borderColor,
          },
        ]}
      >
        <SettingItem
          theme={theme}
          iconName="document-text-outline"
          text="Privacy Policy"
          onPress={() => router.push("/privacy")}
        />
        <SettingItem
          theme={theme}
          iconName="shield-checkmark-outline"
          text="Terms of Service"
          onPress={() => router.push("/terms")}
          isLast
        />
      </View>

      {/* Version Card Footnote */}
      <View style={styles.versionFooter}>
        <View style={[styles.versionIconCircle, { backgroundColor: `${theme.colors.primary}12` }]}>
          <Ionicons name="sparkles-outline" size={14} color={theme.colors.primary} />
        </View>
        <Text style={[styles.versionText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
          Zen App • Mindful Productivity
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  settingsCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  settingItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
  },
  versionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  versionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  versionText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});