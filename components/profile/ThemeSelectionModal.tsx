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
    TextInput,
    View,
    Alert,
} from "react-native";
import {
    createTheme,
    DEFAULT_THEME_NAME,
    getSharedStyles,
    THEME_ACCENTS,
    Theme,
    themeNames,
} from "../../styles/shared";
import { ModalSheet } from "../ui/ModalSheet";
import { useTheme } from "../../context/ThemeContext";
import { usePokemonQuery } from "../../api/pokemon";

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

// Maps PokeAPI species colors to exact hex matching the theme vibe
const SPECIES_COLORS: Record<string, string> = {
    black:  "#333333",
    blue:   "#007AFF",
    brown:  "#A0522D",
    gray:   "#8E8E93",
    green:  "#34C759",
    pink:   "#FF2D55",
    purple: "#AF52DE",
    red:    "#FF3B30",
    white:  "#9CA3AF",
    yellow: "#FFCC00",
};

/**
 * Theme Selection Modal
 * Refactored to use the central theme generator, theme registry,
 * and contrast-guaranteed preview for custom colors.
 */
export function ThemeSelectionModal({
    visible, onClose, currentTheme,
    activeThemeName, isDarkMode, onToggleDarkMode,
    isAutoTheme, onToggleAutoTheme, onSelectTheme,
}: ThemeSelectionModalProps) {
    const { customThemes, addCustomTheme, removeCustomTheme } = useTheme();
    const baseActiveTheme = activeThemeName.replace("light-", "").replace("dark-", "");
    const styles = useMemo(() => getStyles(currentTheme), [currentTheme]);

    const [showCustomForm, setShowCustomForm] = React.useState(false);
    const [cPokemonName, setCPokemonName] = React.useState("");
    const [cColor, setCColor] = React.useState(SPECIES_COLORS.red);
    const [cCustomHex, setCCustomHex] = React.useState("");
    const [debouncedQuery, setDebouncedQuery] = React.useState("");
    const [lastAutoColorId, setLastAutoColorId] = React.useState<string | null>(null);

    // Debounce the input by 400ms
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(cPokemonName.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [cPokemonName]);

    // TanStack Query with automatic caching and deduplication
    const { data: pokemonData, isError: queryError } = usePokemonQuery(
        debouncedQuery,
        showCustomForm && debouncedQuery.length > 0
    );

    // Derive preview state directly from query
    const previewSprite = pokemonData?.spriteUrl ?? null;
    const previewName = pokemonData?.name ?? null;
    const previewId = pokemonData?.id ?? null;
    const previewError = Boolean(debouncedQuery && queryError);

    // Automatically adopt species color when a new Pokémon is loaded
    if (pokemonData && pokemonData.id !== lastAutoColorId) {
        setLastAutoColorId(pokemonData.id);
        if (pokemonData.speciesColorName) {
            const autoColor = SPECIES_COLORS[pokemonData.speciesColorName];
            if (autoColor) {
                setCColor(autoColor);
                setCCustomHex("");
            }
        }
    }

    const closeCustomForm = () => {
        setShowCustomForm(false);
        setCPokemonName("");
        setCColor(SPECIES_COLORS.red);
        setCCustomHex("");
        setDebouncedQuery("");
        setLastAutoColorId(null);
    };

    const resolvedColor = cCustomHex.match(/^#[0-9A-Fa-f]{6}$/) ? cCustomHex : cColor;

    // Run the picked color through the theme generator to get contrast-guaranteed preview
    const previewTheme = useMemo(
        () => createTheme(resolvedColor, isDarkMode ? "dark" : "light"),
        [resolvedColor, isDarkMode]
    );

    const handleSaveCustom = () => {
        if (!previewId || !previewName) {
            Alert.alert("No Pokémon Found", "Type a valid Pokémon name and wait for the preview to load.");
            return;
        }

        addCustomTheme(previewId, {
            pokemonId: previewId,
            primaryColor: previewTheme.colors.primary,
            accentHex: previewTheme.colors.primary,
            name: previewName,
        });
        onSelectTheme(`custom_${previewId}`);
        if (isAutoTheme) onToggleAutoTheme(false);
        closeCustomForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onClose(), 300);
    };

    const handleDeleteCustom = (id: string, isCurrentlyActive: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        removeCustomTheme(id);
        if (isCurrentlyActive) {
            onSelectTheme(DEFAULT_THEME_NAME);
        }
    };

    return (
        <ModalSheet
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
                            <Ionicons name="moon" size={20} color={currentTheme.colors.primaryText} />
                            <Text style={styles.toggleLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={(v) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggleDarkMode(v);
                            }}
                            trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary }}
                            thumbColor={currentTheme.colors.onPrimary}
                            {...({ activeThumbColor: currentTheme.colors.onPrimary } as Record<string, string>)}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelGroup}>
                            <Ionicons name="sync" size={20} color={currentTheme.colors.primaryText} />
                            <Text style={styles.toggleLabel}>Auto Theme</Text>
                        </View>
                        <Switch
                            value={isAutoTheme}
                            onValueChange={(v) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggleAutoTheme(v);
                            }}
                            trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary }}
                            thumbColor={currentTheme.colors.onPrimary}
                            {...({ activeThumbColor: currentTheme.colors.onPrimary } as Record<string, string>)}
                        />
                    </View>
                </View>

                {/* Theme List from Central Registry */}
                <Text style={styles.sectionTitle}>Themes</Text>
                <View style={styles.listContainer}>
                    {themeNames.map((tName, index) => {
                        const preset = THEME_ACCENTS[tName];
                        const isApplied = baseActiveTheme === tName;
                        const thumb = preset?.pokemonId
                            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${preset.pokemonId}.png`
                            : null;

                        return (
                            <View key={tName}>
                                <Pressable
                                    onPress={() => {
                                        if (isApplied) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onSelectTheme(tName);
                                        if (isAutoTheme) onToggleAutoTheme(false);
                                        setTimeout(() => onClose(), 300);
                                    }}
                                    style={({ pressed }) => [
                                        styles.themeRow,
                                        pressed && { opacity: 0.7 },
                                    ]}
                                >
                                    <View style={[styles.dot, { backgroundColor: preset.accent }]}>
                                        {thumb && (
                                            <Image source={{ uri: thumb }} style={styles.dotSprite} resizeMode="contain" />
                                        )}
                                    </View>
                                    
                                    <View style={styles.themeInfo}>
                                        <Text style={[styles.themeLabel, isApplied && { color: currentTheme.colors.primaryText, fontFamily: currentTheme.fonts.bold }]}>
                                            {preset.label}
                                        </Text>
                                        {preset.description ? (
                                            <Text style={styles.themeDesc}>{preset.description}</Text>
                                        ) : null}
                                    </View>

                                    {isApplied && (
                                        <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primaryText} />
                                    )}
                                </Pressable>
                                {index < themeNames.length - 1 && <View style={styles.separator} />}
                            </View>
                        );
                    })}
                    
                    {/* Custom Themes in List */}
                    {Object.entries(customThemes).map(([id, config]) => {
                        const isApplied = baseActiveTheme === `custom_${id}`;
                        const accent = config.accentHex || config.primaryColor;
                        return (
                            <View key={`custom-${id}`}>
                                <View style={styles.separator} />
                                <View style={styles.customThemeRow}>
                                    <Pressable
                                        onPress={() => {
                                            if (isApplied) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onSelectTheme(`custom_${id}`);
                                            if (isAutoTheme) onToggleAutoTheme(false);
                                            setTimeout(() => onClose(), 300);
                                        }}
                                        style={({ pressed }) => [
                                            styles.themeRow,
                                            { flex: 1 },
                                            pressed && { opacity: 0.7 },
                                        ]}
                                    >
                                        <View style={[styles.dot, { backgroundColor: accent }]}>
                                            <Image 
                                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${config.pokemonId}.png` }} 
                                                style={styles.dotSprite} resizeMode="contain" 
                                            />
                                        </View>
                                        
                                        <View style={styles.themeInfo}>
                                            <Text style={[styles.themeLabel, isApplied && { color: currentTheme.colors.primaryText, fontFamily: currentTheme.fonts.bold }]}>
                                                {config.name || "Custom"}
                                            </Text>
                                            <Text style={styles.themeDesc}>Your personalized theme</Text>
                                        </View>

                                        {isApplied && (
                                            <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primaryText} />
                                        )}
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleDeleteCustom(id, isApplied)}
                                        style={({ pressed }) => [
                                            styles.deleteBtn,
                                            pressed && { opacity: 0.5 },
                                        ]}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={currentTheme.colors.danger} />
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })}

                    {/* Custom Theme Builder */}
                    <View style={styles.separator} />
                    {!showCustomForm ? (
                        <Pressable 
                            style={styles.addCustomButton} 
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowCustomForm(true);
                            }}
                        >
                            <View style={[styles.dot, { backgroundColor: currentTheme.colors.primarySoft }]}>
                                <Ionicons name="add" size={24} color={currentTheme.colors.primaryText} />
                            </View>
                            <Text style={[styles.themeLabel, { color: currentTheme.colors.primaryText, marginLeft: 12, fontFamily: currentTheme.fonts.bold }]}>Create Custom Theme</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.customForm}>
                            <View style={styles.customFormHeader}>
                                <Text style={styles.customFormTitle}>Create Custom Theme</Text>
                                <Pressable hitSlop={10} onPress={closeCustomForm}>
                                    <Ionicons name="close" size={24} color={currentTheme.colors.textSecondary} />
                                </Pressable>
                            </View>

                            {/* Live Preview Card with Guaranteed Contrast */}
                            <View style={[styles.previewCard, { borderColor: previewTheme.colors.border, backgroundColor: previewTheme.colors.surface }]}>
                                <View style={[styles.previewAvatar, { backgroundColor: previewTheme.colors.primarySoft }]}>
                                    {previewSprite ? (
                                        <Image source={{ uri: previewSprite }} style={styles.previewSprite} resizeMode="contain" />
                                    ) : (
                                        <Ionicons name="help-outline" size={36} color={currentTheme.colors.textSecondary} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <Text style={[styles.previewName, { color: previewName ? previewTheme.colors.primaryText : currentTheme.colors.textSecondary }]}>
                                            {previewName || "Type a name below..."}
                                        </Text>
                                        {previewTheme.wasAdjusted && (
                                            <View style={styles.adjustedBadge}>
                                                <Text style={styles.adjustedBadgeText}>Adjusted for readability</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.previewHint}>
                                        {previewError ? "Not found — try another name" : previewId ? `#${previewId}` : "Your Pokémon mascot"}
                                    </Text>
                                </View>
                            </View>

                            {/* Search Input */}
                            <Text style={styles.inputLabel}>Search Pokémon</Text>
                            <View style={styles.searchRow}>
                                <Ionicons name="search-outline" size={18} color={currentTheme.colors.textSecondary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="e.g. Lucario, Eevee, Greninja..."
                                    placeholderTextColor={currentTheme.colors.textSecondary}
                                    value={cPokemonName}
                                    onChangeText={setCPokemonName}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            
                            {/* Custom Hex */}
                            <Text style={[styles.inputLabel, { marginTop: currentTheme.spacing.md }]}>Custom Hex Color (Optional)</Text>
                            <TextInput
                                style={[styles.input, cCustomHex.match(/^#[0-9A-Fa-f]{6}$/) && { borderColor: previewTheme.colors.primary, borderWidth: 2 }]}
                                placeholder="#C084FC"
                                placeholderTextColor={currentTheme.colors.textSecondary}
                                value={cCustomHex}
                                onChangeText={setCCustomHex}
                                maxLength={7}
                            />

                            <View style={styles.customFormActions}>
                                <Pressable 
                                    style={[styles.customFormBtnSave, { backgroundColor: previewTheme.colors.primary }, !previewId && { opacity: 0.4 }]} 
                                    onPress={handleSaveCustom}
                                    disabled={!previewId}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={20} color={previewTheme.colors.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.customFormBtnTextSave, { color: previewTheme.colors.onPrimary }]}>Save & Apply Theme</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ModalSheet>
    );
}

const getStyles = (theme: Theme) => {
    const shared = getSharedStyles(theme);
    return StyleSheet.create({
    scrollContent: {
        paddingBottom: 24,
    },
    togglesContainer: {
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleRow: {
        ...shared.toggleRow,
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
        ...shared.divider,
    },
    sectionTitle: {
        ...shared.sectionTitle,
        paddingHorizontal: 4,
        marginBottom: theme.spacing.sm,
    },
    listContainer: {
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
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
    addCustomButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        opacity: 0.9,
    },
    customThemeRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    deleteBtn: {
        padding: theme.spacing.sm,
        borderRadius: 8,
    },
    customForm: {
        marginTop: theme.spacing.sm,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    customFormHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    customFormTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    previewCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        borderRadius: 20,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
    },
    previewAvatar: {
        width: 60, height: 60, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
    },
    previewSprite: {
        width: 52, height: 52,
    },
    previewName: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
    },
    previewHint: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    adjustedBadge: {
        backgroundColor: theme.colors.surfaceMuted,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    adjustedBadgeText: {
        fontSize: 10,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
    },
    /* Search */
    inputLabel: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontFamily: theme.fonts.medium,
    },
    input: {
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontFamily: theme.fonts.medium,
    },
    /* Actions */
    customFormActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    customFormBtnSave: {
        height: 52,
        borderRadius: 18,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    customFormBtnTextSave: {
        fontFamily: theme.fonts.bold,
        fontSize: 16,
    },
  });
};