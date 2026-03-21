// components/profile/SettingsSection.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SONG_LIST } from '../../constants/songs';
import { BottomSheet } from './BottomSheet';

// --- Constants ---
const APPEARANCE_MODES = {
  LIGHT: 'light',
  HEAVY: 'heavy',
} as const;

// --- Types ---
type IconName = keyof typeof Ionicons.glyphMap;
type AppearanceMode = typeof APPEARANCE_MODES[keyof typeof APPEARANCE_MODES];

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
  glass: {
    cardBg: string;
    borderColor: string;
    shadowOpacity: number;
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
  isDarkMode: boolean;
  isAppearanceExpanded: boolean;
  setIsAppearanceExpanded: (value: boolean) => void;
  selectThemeMode: (isDark: boolean) => void;
  settings: {
    notifications: Record<string, boolean>;
  };
  setShowNotificationSettings: (value: boolean) => void;
  handleBackup: () => void;
  selectedSong: number;
  setSelectedSong: (index: number) => void;
  isMusicExpanded: boolean;
  setIsMusicExpanded: (value: boolean) => void;
  userXp?: number; // Added to pass to Modal
  handleResetTasks: () => void;
}

interface SettingItemProps {
  theme: Theme;
  iconName: IconName;
  text: string;
  onPress: () => void;
  valueText?: string;
  isLast?: boolean;
  isDestructive?: boolean;
}

interface ExpandableSettingProps {
  theme: Theme;
  iconName: IconName;
  title: string;
  currentValue: string;
  isExpanded: boolean;
  onToggle: () => void;
  isLast?: boolean;
  children: React.ReactNode;
}

interface OptionItemProps {
  theme: Theme;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

// --- Utility Functions ---
const createColorWithOpacity = (color: string, opacity: string): string => {
  return `${color}${opacity}`;
};

// --- Sub-Components ---

/**
 * Reusable setting item component
 */
const SettingItem = React.memo<SettingItemProps>(({
  theme,
  iconName,
  text,
  onPress,
  valueText,
  isLast = false,
  isDestructive = false,
}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const primaryColor = isDestructive ? '#FF453A' : theme.colors.primary;
  const secondaryColor = theme.colors.secondary;
  const textColor = isDestructive ? '#FF453A' : theme.colors.text;
  const cardColor = theme.colors.card;

  const handlePress = useCallback(() => {
    console.log(`SettingItem "${text}" pressed`);
    if (onPress) {
      onPress();
    } else {
      console.warn(`No onPress handler for "${text}"`);
    }
  }, [onPress, text]);

  return (
    /* Pressable with scale feedback replaced TouchableOpacity — consistent with app pattern */
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={valueText ? `Current value: ${valueText}` : 'Tap to open settings'}
    >
      <View style={styles.settingItemLeft}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: createColorWithOpacity(primaryColor, '15') }
        ]}>
          <Ionicons name={iconName} size={22} color={primaryColor} />
        </View>
        <Text style={[styles.settingText, { color: textColor }]} numberOfLines={1}>
          {text}
        </Text>
      </View>

      <View style={styles.settingItemRight}>
        {valueText && (
          <View style={[
            styles.badge,
            { backgroundColor: createColorWithOpacity(primaryColor, '20') }
          ]}>
            <Text style={[styles.badgeText, { color: primaryColor }]}>
              {valueText}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={secondaryColor} />
      </View>
    </Pressable>
  );
});

SettingItem.displayName = 'SettingItem';

/**
 * Reusable expandable setting component
 */
const ExpandableSetting = React.memo<ExpandableSettingProps>(({
  theme,
  iconName,
  title,
  currentValue,
  isExpanded,
  onToggle,
  isLast = false,
  children,
}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const primaryColor = theme.colors.primary;
  const secondaryColor = theme.colors.secondary;
  const textColor = theme.colors.text;
  const cardColor = theme.colors.card;
  const borderColor = `${theme.colors.secondary}20`;

  return (
    <View style={[
      styles.expandableContainer,
      !isLast && styles.settingItemBorder,
    ]}>
      <Pressable
        style={({ pressed }) => [
          styles.settingItem,
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${title} setting`}
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={`Current value: ${currentValue}. Tap to ${isExpanded ? 'collapse' : 'expand'} options`}
      >
        <View style={styles.settingItemLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: createColorWithOpacity(primaryColor, '15') }
          ]}>
            <Ionicons name={iconName} size={22} color={primaryColor} />
          </View>
          <Text style={[styles.settingText, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.settingItemRight}>
          <Text style={[styles.valueText, { color: secondaryColor }]} numberOfLines={1}>
            {currentValue}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color={secondaryColor}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <View
          style={[styles.expandedContent, { borderTopColor: borderColor }]}
          accessibilityRole="list"
        >
          {children}
        </View>
      )}
    </View>
  );
});

ExpandableSetting.displayName = 'ExpandableSetting';

/**
 * Option item for expandable menus
 */
const OptionItem = React.memo<OptionItemProps>(({
  theme,
  label,
  isSelected,
  onPress,
  isFirst = false,
  isLast = false,
}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const primaryColor = theme.colors.primary;
  const textColor = theme.colors.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionItem,
        isFirst && styles.optionItemFirst,
        isLast && styles.optionItemLast,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={label}
      accessibilityHint={isSelected ? 'Currently selected' : 'Tap to select this option'}
    >
      <Text
        style={[
          styles.optionText,
          { color: textColor },
          isSelected && {
            color: primaryColor,
            fontWeight: '600'
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {isSelected && (
        <Ionicons
          name="checkmark"
          size={20}
          color={primaryColor}
          accessibilityLabel="Selected"
        />
      )}
    </Pressable>
  );
});

OptionItem.displayName = 'OptionItem';

/**
 * Music setting with song selection
 */
const MusicSetting = React.memo<{
  theme: Theme;
  selectedSong: number;
  setSelectedSong: (index: number) => void;
  isMusicExpanded: boolean;
  setIsMusicExpanded: (value: boolean) => void;
  isLast?: boolean;
}>(({
  theme,
  selectedSong,
  setSelectedSong,
  isMusicExpanded,
  setIsMusicExpanded,
  isLast = false,
}) => {
  const currentSongTitle = useMemo(() => {
    if (selectedSong === 0) return 'Off';
    const foundSong = SONG_LIST.find((s) => s.id === selectedSong);
    return foundSong?.title || 'Off';
  }, [selectedSong]);

  const handleToggle = useCallback(() => {
    setIsMusicExpanded(true);
  }, [setIsMusicExpanded]);

  const handleSongSelect = useCallback((songId: number) => {
    setSelectedSong(songId);
    setTimeout(() => setIsMusicExpanded(false), 300); // Close after brief delay
  }, [setSelectedSong, setIsMusicExpanded]);

  return (
    <>
      {/* Previously used ExpandableSetting (inline accordion); changed to pattern-consistent BottomSheet */}
      <SettingItem
        theme={theme}
        iconName="musical-notes-outline"
        text="Music"
        valueText={currentSongTitle}
        onPress={handleToggle}
        isLast={isLast}
      />
      <BottomSheet
        visible={isMusicExpanded}
        onClose={() => setIsMusicExpanded(false)}
        theme={theme}
        title="Music Preferences"
      >
        <OptionItem
          theme={theme}
          label="Off"
          isSelected={selectedSong === 0}
          onPress={() => handleSongSelect(0)}
          isFirst
        />
        {SONG_LIST.map((song, index) => (
          <OptionItem
            key={song.id}
            theme={theme}
            label={song.title}
            isSelected={selectedSong === song.id}
            onPress={() => handleSongSelect(song.id)}
            isLast={index === SONG_LIST.length - 1}
          />
        ))}
      </BottomSheet>
    </>
  );
});

MusicSetting.displayName = 'MusicSetting';

/**
 * Appearance setting with theme mode selection
 */
const AppearanceSetting = React.memo<{
  theme: Theme;
  isDarkMode: boolean;
  isAppearanceExpanded: boolean;
  setIsAppearanceExpanded: (value: boolean) => void;
  selectThemeMode: (isDark: boolean) => void;
  isLast?: boolean;
}>(({
  theme,
  isDarkMode,
  isAppearanceExpanded,
  setIsAppearanceExpanded,
  selectThemeMode,
  isLast = false,
}) => {
  const currentMode = useMemo(() => {
    return isDarkMode ? 'Dark' : 'Light';
  }, [isDarkMode]);

  const handleToggle = useCallback(() => {
    setIsAppearanceExpanded(!isAppearanceExpanded);
  }, [isAppearanceExpanded, setIsAppearanceExpanded]);

  const handleModeSelect = useCallback((isDark: boolean) => {
    selectThemeMode(isDark);
  }, [selectThemeMode]);

  return (
    <ExpandableSetting
      theme={theme}
      iconName="color-palette-outline"
      title="Appearance"
      currentValue={currentMode}
      isExpanded={isAppearanceExpanded}
      onToggle={handleToggle}
      isLast={isLast}
    >
      <OptionItem
        theme={theme}
        label="Light"
        isSelected={!isDarkMode}
        onPress={() => handleModeSelect(false)}
        isFirst
      />
      <OptionItem
        theme={theme}
        label="Dark"
        isSelected={isDarkMode}
        onPress={() => handleModeSelect(true)}
        isLast
      />
    </ExpandableSetting>
  );
});

AppearanceSetting.displayName = 'AppearanceSetting';

// --- Main Component ---

/**
 * SettingsSection Component
 * 
 * Displays a comprehensive settings interface with all interactions fully wired.
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  theme,
  isDarkMode,
  isAppearanceExpanded,
  setIsAppearanceExpanded,
  selectThemeMode,
  settings,
  setShowNotificationSettings,
  handleBackup,
  selectedSong,
  setSelectedSong,
  isMusicExpanded,
  setIsMusicExpanded,
  userXp = 0,
  handleResetTasks,
}) => {
  // Calculate notification count
  const notificationCount = useMemo(() => {
    return Object.values(settings.notifications).filter(Boolean).length;
  }, [settings.notifications]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Get theme colors
  const textColor = useMemo(() => theme.colors.text, [theme]);
  const cardColor = useMemo(() => theme.colors.card, [theme]);

  // Event handlers - All fully functional and wired
  const handleNotificationPress = useCallback(() => {
    console.log('Notification settings pressed');
    setShowNotificationSettings(true);
  }, [setShowNotificationSettings]);

  const handleBackupPress = useCallback(() => {
    console.log('Backup pressed');
    handleBackup();
  }, [handleBackup]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Settings
      </Text>

      <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
        <SettingItem
          theme={theme}
          iconName="notifications-outline"
          text="Notifications"
          valueText={`${notificationCount}/4`}
          onPress={handleNotificationPress}
        />

        <MusicSetting
          theme={theme}
          selectedSong={selectedSong}
          setSelectedSong={setSelectedSong}
          isMusicExpanded={isMusicExpanded}
          setIsMusicExpanded={setIsMusicExpanded}
        />

        <SettingItem
          theme={theme}
          iconName="color-palette-outline"
          text="Theme Selection"
          onPress={() => {
            // We use the existing isAppearanceExpanded to trigger the Modal in parent profile
            setIsAppearanceExpanded(true);
          }}
        />

        <SettingItem
          theme={theme}
          iconName="cloud-upload-outline"
          text="Backup & Export"
          onPress={handleBackupPress}
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
    </View>
  );
};

// --- Styles ---

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SF-Pro-Rounded-Bold',
    marginBottom: theme.spacing.md,
    letterSpacing: 0.3,
  },
  settingsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
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
    marginRight: 8,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  valueText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    maxWidth: 120,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
  },
  expandableContainer: {
    overflow: 'hidden',
  },
  expandedContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 52,
    minHeight: 48,
  },
  optionItemFirst: {
    paddingTop: theme.spacing.sm,
  },
  optionItemLast: {
    paddingBottom: theme.spacing.sm,
  },
  optionText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.2,
    flex: 1,
  },
});