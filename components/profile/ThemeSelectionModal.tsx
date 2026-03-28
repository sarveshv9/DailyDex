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
    ActivityIndicator,
    Alert,
} from "react-native";
import { darkThemes, lightThemes, Theme } from "../../constants/shared";
import { BottomSheet } from "./BottomSheet";
import { useTheme } from "../../context/ThemeContext";

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
    pokeball: 100, pikachu: 25, bulbasaur: 1, squirtle: 7, jigglypuff: 39,
    meowth: 52, psyduck: 54, slowpoke: 79, gengar: 94,
    snorlax: 143, charizard: 6, dragonite: 149, mew: 151,
};

const THEME_META: Record<string, { label: string; description: string }> = {
    pokeball: { label: "Classic", description: "Iconic Red & White" },
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
    white:  "#9CA3AF", // Use a soft gray for white to ensure visibility against light backgrounds
    yellow: "#FFCC00",
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
    const { customThemes, addCustomTheme, removeCustomTheme } = useTheme();
    const baseActiveTheme = activeThemeName.replace("light-", "").replace("dark-", "");
    const themeList = Object.keys(lightThemes);
    const styles = useMemo(() => getStyles(currentTheme), [currentTheme]);

    const [showCustomForm, setShowCustomForm] = React.useState(false);
    const [cPokemonName, setCPokemonName] = React.useState("");
    const [cColor, setCColor] = React.useState(SPECIES_COLORS.red); // Default fallback
    const [cCustomHex, setCCustomHex] = React.useState("");
    const [isFetching, setIsFetching] = React.useState(false);

    // Live preview state
    const [previewSprite, setPreviewSprite] = React.useState<string | null>(null);
    const [previewName, setPreviewName] = React.useState<string | null>(null);
    const [previewId, setPreviewId] = React.useState<string | null>(null);
    const [previewError, setPreviewError] = React.useState(false);
    const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset form
    React.useEffect(() => {
        if (!showCustomForm) {
            setCPokemonName(""); setCColor(SPECIES_COLORS.red); setCCustomHex("");
            setPreviewSprite(null); setPreviewName(null); setPreviewId(null); setPreviewError(false);
        }
    }, [showCustomForm]);

    // Debounced Pokemon search for live preview
    React.useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setPreviewError(false);

        if (!cPokemonName.trim()) {
            setPreviewSprite(null); setPreviewName(null); setPreviewId(null);
            return;
        }

        searchTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${cPokemonName.toLowerCase().trim()}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                setPreviewSprite(data.sprites.front_default);
                setPreviewName(data.name.charAt(0).toUpperCase() + data.name.slice(1));
                setPreviewId(data.id.toString());
                setPreviewError(false);

                // Auto-pick accent color from the Pokémon's physical species color
                if (data.species && data.species.url) {
                    const speciesRes = await fetch(data.species.url);
                    if (speciesRes.ok) {
                        const speciesData = await speciesRes.json();
                        const colorName = speciesData.color?.name;
                        const autoColor = SPECIES_COLORS[colorName];
                        if (autoColor) {
                            setCColor(autoColor);
                            setCCustomHex('');
                        }
                    }
                }
            } catch {
                setPreviewSprite(null); setPreviewName(null); setPreviewId(null);
                setPreviewError(true);
            }
        }, 600);

        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [cPokemonName]);

    const resolvedColor = cCustomHex.match(/^#[0-9A-Fa-f]{6}$/) ? cCustomHex : cColor;

    const handleSaveCustom = () => {
        if (!previewId || !previewName) {
            Alert.alert("No Pokémon Found", "Type a valid Pokémon name and wait for the preview to load.");
            return;
        }

        addCustomTheme(previewId, { pokemonId: previewId, primaryColor: resolvedColor, name: previewName });
        onSelectTheme(`custom_${previewId}`);
        if (isAutoTheme) onToggleAutoTheme(false);
        setShowCustomForm(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onClose(), 300);
    };

    const handleDeleteCustom = (id: string, isCurrentlyActive: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        removeCustomTheme(id);
        if (isCurrentlyActive) {
            onSelectTheme('pokeball');
        }
    };

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
                            trackColor={{ false: `${currentTheme.colors.secondary}40`, true: currentTheme.colors.primary }}
                            thumbColor="#FFFFFF"
                            {...({ activeThumbColor: "#FFFFFF" } as any)}
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
                            trackColor={{ false: `${currentTheme.colors.secondary}40`, true: currentTheme.colors.primary }}
                            thumbColor="#FFFFFF"
                            {...({ activeThumbColor: "#FFFFFF" } as any)}
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
                    
                    {/* Custom Theme Rendering in List */}
                    {Object.entries(customThemes).map(([id, config]) => {
                        const isApplied = baseActiveTheme === `custom_${id}`;
                        return (
                            <View key={`custom-${id}`}>
                                <View style={styles.separator} />
                                <View style={styles.customThemeRow}>
                                    <Pressable
                                        onPress={() => {
                                            if (isApplied) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                                        <View style={[styles.dot, { backgroundColor: config.primaryColor }]}>
                                            <Image 
                                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${config.pokemonId}.png` }} 
                                                style={styles.dotSprite} resizeMode="contain" 
                                            />
                                        </View>
                                        
                                        <View style={styles.themeInfo}>
                                            <Text style={[styles.themeLabel, isApplied && { color: currentTheme.colors.primary, fontFamily: currentTheme.fonts.bold }]}>
                                                {config.name || "Custom"}
                                            </Text>
                                            <Text style={styles.themeDesc}>Your personalized theme</Text>
                                        </View>

                                        {isApplied && (
                                            <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primary} />
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
                                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
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
                            <View style={[styles.dot, { backgroundColor: `${currentTheme.colors.primary}1A` }]}>
                                <Ionicons name="add" size={24} color={currentTheme.colors.primary} />
                            </View>
                            <Text style={[styles.themeLabel, { color: currentTheme.colors.primary, marginLeft: 12, fontFamily: currentTheme.fonts.bold }]}>Create Custom Theme</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.customForm}>
                            <View style={styles.customFormHeader}>
                                <Text style={styles.customFormTitle}>Create Custom Theme</Text>
                                <Pressable hitSlop={10} onPress={() => setShowCustomForm(false)}>
                                    <Ionicons name="close" size={24} color={currentTheme.colors.textSecondary} />
                                </Pressable>
                            </View>

                            {/* Live Preview Card */}
                            <View style={[styles.previewCard, { borderColor: resolvedColor + '40', backgroundColor: resolvedColor + '08' }]}>
                                <View style={[styles.previewAvatar, { backgroundColor: resolvedColor + '20' }]}>
                                    {previewSprite ? (
                                        <Image source={{ uri: previewSprite }} style={styles.previewSprite} resizeMode="contain" />
                                    ) : (
                                        <Ionicons name="help-outline" size={36} color={currentTheme.colors.textSecondary} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.previewName, { color: previewName ? resolvedColor : currentTheme.colors.textSecondary }]}>
                                        {previewName || "Type a name below..."}
                                    </Text>
                                    <Text style={styles.previewHint}>
                                        {previewError ? "❌ Not found — try another name" : previewId ? `#${previewId}` : "Your Pokémon mascot"}
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
                                style={[styles.input, cCustomHex.match(/^#[0-9A-Fa-f]{6}$/) && { borderColor: cCustomHex, borderWidth: 2 }]}
                                placeholder="#C084FC"
                                placeholderTextColor={currentTheme.colors.textSecondary}
                                value={cCustomHex}
                                onChangeText={setCCustomHex}
                                maxLength={7}
                            />

                            <View style={styles.customFormActions}>
                                <Pressable 
                                    style={[styles.customFormBtnSave, { backgroundColor: resolvedColor }, !previewId && { opacity: 0.4 }]} 
                                    onPress={handleSaveCustom}
                                    disabled={!previewId}
                                >
                                    <Text style={styles.customFormBtnTextSave}>Save & Apply</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
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
        backgroundColor: `${theme.colors.secondary}10`,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}20`,
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
    /* Live preview */
    previewCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        borderWidth: 1,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.card,
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
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}30`,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontFamily: theme.fonts.medium,
    },
    /* Custom hex */
    input: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}30`,
        borderRadius: theme.borderRadius.md,
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
    customFormBtnCancel: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    customFormBtnTextCancel: {
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
    },
    customFormBtnSave: {
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        minWidth: 120,
        alignItems: "center",
        justifyContent: "center",
    },
    customFormBtnTextSave: {
        fontFamily: theme.fonts.bold,
        color: "#FFF",
    },
});