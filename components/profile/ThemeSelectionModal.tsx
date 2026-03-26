import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import React, { useMemo } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { darkThemes, lightThemes, Theme } from "../../constants/shared";
import { BottomSheet } from "./BottomSheet";

type ThemeSelectionModalProps = {
    visible: boolean;
    onClose: () => void;
    currentTheme: Theme;
    activeThemeName: string;
    isDarkMode: boolean;
    onToggleDarkMode: (value: boolean) => void;
    isAutoTheme: boolean;
    onToggleAutoTheme: (value: boolean) => void;
    onSelectTheme: (themeName: string) => void;
};

const POKEMON_IDS: Record<string, number> = {
    default: 100, pikachu: 25, bulbasaur: 1, squirtle: 7, jigglypuff: 39,
    meowth: 52, psyduck: 54, slowpoke: 79, gengar: 94,
    snorlax: 143, charizard: 6, dragonite: 149, mew: 151,
};

const THEME_META: Record<string, { label: string; description: string }> = {
    default: { label: "Classic", description: "Iconic Red & White" },
    dark: { label: "Midnight", description: "Easy on the eyes" },
    pikachu: { label: "Pikachu", description: "Electric energy" },
    bulbasaur: { label: "Bulbasaur", description: "Fresh & natural" },
    squirtle: { label: "Squirtle", description: "Cool blue vibes" },
    jigglypuff: { label: "Jigglypuff", description: "Soft & dreamy" },
    meowth: { label: "Meowth", description: "That's right!" },
    psyduck: { label: "Psyduck", description: "Permanently confused" },
    slowpoke: { label: "Slowpoke", description: "Take it slow" },
    gengar: { label: "Gengar", description: "Spooky vibes" },
    snorlax: { label: "Snorlax", description: "Comfy & cozy" },
    charizard: { label: "Charizard", description: "Fire & power" },
    dragonite: { label: "Dragonite", description: "Majestic & rare" },
    mew: { label: "Mew", description: "Mysterious" },
};

/**
 * Theme Selection
 * Previously a massive full-screen modal with custom sidebar styling.
 * Now refactored to use the consistent BottomSheet pattern.
 */
export function ThemeSelectionModal({
    visible, onClose, currentTheme,
    activeThemeName, isDarkMode, onToggleDarkMode,
    isAutoTheme, onToggleAutoTheme, onSelectTheme,
}: ThemeSelectionModalProps) {
    const baseActiveTheme = activeThemeName.replace("light-", "").replace("dark-", "");
    const themeList = Object.keys(lightThemes);
    const styles = useMemo(() => getStyles(currentTheme), [currentTheme]);

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            theme={currentTheme}
            title="Appearance"
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Mode Toggles */}
                <View style={styles.togglesContainer}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelGroup}>
                            <Ionicons name="moon" size={20} color={currentTheme.colors.primary} />
                            <Text style={styles.toggleLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={(v) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggleDarkMode(v);
                            }}
                            trackColor={{ false: currentTheme.colors.secondary, true: currentTheme.colors.primary }}
                            thumbColor={currentTheme.colors.white}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelGroup}>
                            <Ionicons name="sync" size={20} color={currentTheme.colors.primary} />
                            <Text style={styles.toggleLabel}>Auto Theme</Text>
                        </View>
                        <Switch
                            value={isAutoTheme}
                            onValueChange={(v) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggleAutoTheme(v);
                            }}
                            trackColor={{ false: currentTheme.colors.secondary, true: currentTheme.colors.primary }}
                            thumbColor={currentTheme.colors.white}
                        />
                    </View>
                </View>

                {/* Theme List */}
                <Text style={styles.sectionTitle}>Themes</Text>
                <View style={styles.listContainer}>
                    {themeList.map((tName, index) => {
                        const tColors = lightThemes[tName].colors;
                        const isApplied = baseActiveTheme === tName;
                        const tmeta = THEME_META[tName] ?? {
                            label: tName.charAt(0).toUpperCase() + tName.slice(1),
                            description: ""
                        };
                        const pid = POKEMON_IDS[tName];
                        const thumb = pid
                            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pid}.png`
                            : null;

                        return (
                            <View key={tName}>
                                <Pressable
                                    onPress={() => {
                                        if (isApplied) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        onSelectTheme(tName);
                                        if (isAutoTheme) onToggleAutoTheme(false);
                                        // Auto-close on selection to correctly implement the pattern
                                        setTimeout(() => onClose(), 300);
                                    }}
                                    style={({ pressed }) => [
                                        styles.themeRow,
                                        pressed && { opacity: 0.7 },
                                    ]}
                                >
                                    <View style={[styles.dot, { backgroundColor: tColors.primary }]}>
                                        {thumb && (
                                            <Image source={{ uri: thumb }} style={styles.dotSprite} resizeMode="contain" />
                                        )}
                                    </View>
                                    
                                    <View style={styles.themeInfo}>
                                        <Text style={[styles.themeLabel, isApplied && { color: currentTheme.colors.primary, fontFamily: currentTheme.fonts.bold }]}>
                                            {tmeta.label}
                                        </Text>
                                        {tmeta.description ? (
                                            <Text style={styles.themeDesc}>{tmeta.description}</Text>
                                        ) : null}
                                    </View>

                                    {isApplied && (
                                        <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primary} />
                                    )}
                                </Pressable>
                                {index < themeList.length - 1 && <View style={styles.separator} />}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    scrollContent: {
        paddingBottom: 24,
    },
    togglesContainer: {
        backgroundColor: `${theme.colors.secondary}0D`,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.md,
    },
    toggleLabelGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
    },
    toggleLabel: {
        fontFamily: theme.fonts.medium,
        fontSize: 16,
        color: theme.colors.text,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: `${theme.colors.secondary}20`,
    },
    sectionTitle: {
        fontFamily: theme.fonts.bold,
        fontSize: 18,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        paddingHorizontal: 4,
    },
    listContainer: {
        backgroundColor: `${theme.colors.secondary}0D`,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
    },
    themeRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    dot: {
        width: 40, height: 40, borderRadius: 12,
        overflow: "hidden",
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    dotSprite: {
        width: 36, height: 36,
    },
    themeInfo: {
        flex: 1,
        justifyContent: "center",
    },
    themeLabel: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text,
    },
    themeDesc: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});