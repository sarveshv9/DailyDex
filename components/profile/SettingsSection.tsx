// components/profile/SettingsSection.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    white: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
  };
}

interface SettingsSectionProps {
  theme: Theme;
  handleBackup: () => void;
  handleResetTasks: () => void;
}

const SettingItem = React.memo<{
  theme: Theme;
  iconName: any;
  text: string;
  onPress: () => void;
  isLast?: boolean;
  isDestructive?: boolean;
}>(({ theme, iconName, text, onPress, isLast = false, isDestructive = false }) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const iconColor = isDestructive ? "#FF453A" : theme.colors.primary;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? "#FF453A15" : `${theme.colors.primary}15` }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <Text style={[styles.settingText, { color: isDestructive ? "#FF453A" : theme.colors.text }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
    </Pressable>
  );
});

export const SettingsSection: React.FC<SettingsSectionProps> = ({ theme, handleBackup, handleResetTasks }) => {
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleOpenSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        App Configuration
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
        <SettingItem
          theme={theme}
          iconName="settings-outline"
          text="General Settings"
          onPress={handleOpenSettings}
          isLast
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg }]}>
        Data Management
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
        <SettingItem
          theme={theme}
          iconName="cloud-upload-outline"
          text="Backup & Export"
          onPress={handleBackup}
        />
        <SettingItem
          theme={theme}
          iconName="warning-outline"
          text="Reset All Tasks"
          onPress={handleResetTasks}
          isLast
          isDestructive
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg }]}>
        Legal
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
        <SettingItem
            theme={theme}
            iconName="document-text-outline"
            text="Privacy Policy"
            onPress={() => router.push('/privacy')}
        />
        <SettingItem
            theme={theme}
            iconName="shield-checkmark-outline"
            text="Terms of Service"
            onPress={() => router.push('/terms')}
            isLast
        />
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
  },
  settingsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: `${theme.colors.secondary}15`,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 56,
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${theme.colors.secondary}20`,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.2,
  },
});