import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { lightThemes, Theme, themes } from "../../constants/shared";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ThemeSelectionModalProps = {
    visible: boolean;
    onClose: () => void;
    currentTheme: Theme;
    activeThemeName: string;
    isLightMode: boolean;
    onToggleLightMode: (value: boolean) => void;
    isAutoTheme: boolean;
    onToggleAutoTheme: (value: boolean) => void;
    onSelectTheme: (themeName: string) => void;
};

const POKEMON_IDS: Record<string, number> = {
    pikachu: 25, bulbasaur: 1, squirtle: 7, jigglypuff: 39,
    meowth: 52, psyduck: 54, slowpoke: 79, gengar: 94,
    snorlax: 143, charizard: 6, dragonite: 149, mew: 151,
};

const THEME_META: Record<string, { label: string; description: string }> = {
    default: { label: "Classic", description: "Clean & timeless" },
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

export function ThemeSelectionModal({
    visible, onClose, currentTheme,
    activeThemeName, isLightMode, onToggleLightMode,
    isAutoTheme, onToggleAutoTheme, onSelectTheme,
}: ThemeSelectionModalProps) {
    const baseActiveTheme = activeThemeName.replace("light-", "");
    const [previewTheme, setPreviewTheme] = useState(baseActiveTheme);

    const isLightPreview = isLightMode && previewTheme !== "default" && previewTheme !== "dark";
    const resolvedPreviewThemeName = isLightPreview ? `light-${previewTheme}` : previewTheme;
    const previewThemeObj = isLightPreview ? lightThemes[resolvedPreviewThemeName] : (themes as any)[resolvedPreviewThemeName];

    const previewColors = previewThemeObj?.colors ?? currentTheme.colors;
    const activeColors = (themes as any)[baseActiveTheme]?.colors ?? currentTheme.colors;

    const pokeId = POKEMON_IDS[previewTheme];
    const spriteUrl = pokeId
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png`
        : null;

    const meta = THEME_META[previewTheme] ?? {
        label: previewTheme.charAt(0).toUpperCase() + previewTheme.slice(1),
        description: "",
    };

    const themeList = Object.keys(themes);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const switchPreview = (name: string) => {
        if (name === previewTheme) return;
        Haptics.selectionAsync();
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();
        setPreviewTheme(name);
    };

    const handleApply = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSelectTheme(previewTheme);
        if (isAutoTheme) onToggleAutoTheme(false); // Disable auto if user manually picks
        onClose();
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.screen, { backgroundColor: previewColors.background }]}>

                {/* ── Top bar ── */}
                <View style={styles.topBar}>
                    <Pressable onPress={onClose} hitSlop={14} style={styles.closeBtn}>
                        <Ionicons name="arrow-back" size={20} color={previewColors.primary} />
                    </Pressable>
                    <Text style={[styles.topTitle, { color: previewColors.primary }]}>Appearance</Text>

                    {/* Auto theme toggle (Top Right) */}
                    <Pressable
                        style={[styles.topToggle, {
                            backgroundColor: `${previewColors.primary}0E`,
                            borderColor: `${previewColors.primary}20`,
                        }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onToggleAutoTheme(!isAutoTheme);
                        }}
                    >
                        <Ionicons
                            name={isAutoTheme ? "sync-outline" : "sync-circle-outline"}
                            size={16}
                            color={previewColors.primary}
                        />
                        <Text style={[styles.topToggleLabel, { color: previewColors.primary }]}>
                            {isAutoTheme ? "Auto: ON" : "Auto: OFF"}
                        </Text>
                    </Pressable>
                </View>

                {/* ── Body: sidebar + preview ── */}
                <View style={styles.body}>

                    {/* LEFT: theme list */}
                    <ScrollView
                        style={styles.sidebar}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.sidebarContent}
                    >
                        {themeList.map((tName) => {
                            const tColors = (themes as any)[tName].colors;
                            const isApplied = baseActiveTheme === tName;
                            const isPreviewing = previewTheme === tName;
                            const tmeta = THEME_META[tName] ?? {
                                label: tName.charAt(0).toUpperCase() + tName.slice(1),
                            };
                            const pid = POKEMON_IDS[tName];
                            const thumb = pid
                                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pid}.png`
                                : null;

                            return (
                                <Pressable
                                    key={tName}
                                    onPress={() => switchPreview(tName)}
                                    style={[
                                        styles.row,
                                        isPreviewing && {
                                            backgroundColor: `${tColors.primary}15`,
                                            borderColor: `${tColors.primary}30`,
                                        },
                                    ]}
                                >
                                    {/* Color dot */}
                                    <View style={[styles.dot, { backgroundColor: tColors.primary }]}>
                                        {thumb ? (
                                            <Image source={{ uri: thumb }} style={styles.dotSprite} resizeMode="contain" />
                                        ) : null}
                                    </View>

                                    <Text
                                        style={[
                                            styles.rowLabel,
                                            { color: isPreviewing ? tColors.primary : `${previewColors.primary}80` },
                                            isPreviewing && { fontFamily: currentTheme.fonts.bold },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {tmeta.label}
                                    </Text>

                                    {isApplied && (
                                        <View style={[styles.appliedDot, { backgroundColor: tColors.primary }]} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {/* RIGHT: big preview panel */}
                    <View style={styles.previewColumn}>
                        <Animated.View
                            style={[
                                styles.previewCard,
                                { backgroundColor: previewColors.primary, opacity: fadeAnim },
                            ]}
                        >
                            {/* Decorative circles */}
                            <View style={[styles.circle, styles.circleA, { backgroundColor: "rgba(255,255,255,0.07)" }]} />
                            <View style={[styles.circle, styles.circleB, { backgroundColor: "rgba(255,255,255,0.05)" }]} />
                            {previewColors.secondary && (
                                <View style={[styles.circle, styles.circleC, { backgroundColor: previewColors.secondary, opacity: 0.2 }]} />
                            )}

                            {spriteUrl ? (
                                <Image source={{ uri: spriteUrl }} style={styles.artwork} resizeMode="contain" />
                            ) : (
                                <Ionicons name="color-palette" size={72} color="rgba(255,255,255,0.5)" />
                            )}

                            {/* Name overlay at bottom */}
                            <View style={styles.previewLabel}>
                                <Text style={styles.previewName}>{meta.label}</Text>
                                <Text style={styles.previewDesc}>{meta.description}</Text>
                            </View>

                            {/* Applied chip */}
                            {baseActiveTheme === previewTheme && (
                                <View style={styles.appliedChip}>
                                    <Ionicons name="checkmark" size={10} color={previewColors.primary} />
                                    <Text style={[styles.appliedChipText, { color: previewColors.primary }]}>Applied</Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* Light mode toggle */}
                        <Pressable
                            style={[styles.toggle, {
                                backgroundColor: `${previewColors.primary}0E`,
                                borderColor: `${previewColors.primary}20`,
                            }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggleLightMode(!isLightMode);
                            }}
                        >
                            <Ionicons
                                name={isLightMode ? "sunny-outline" : "moon-outline"}
                                size={14}
                                color={previewColors.primary}
                            />
                            <Text style={[styles.toggleLabel, { color: previewColors.primary }]}>
                                {isLightMode ? "Light" : "Dark"}
                            </Text>
                            <Switch
                                value={isLightMode}
                                onValueChange={(v) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onToggleLightMode(v);
                                }}
                                trackColor={{ false: `${previewColors.primary}25`, true: `${previewColors.primary}60` }}
                                thumbColor={previewColors.primary}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                        </Pressable>

                        {/* Apply button */}
                        <Pressable
                            style={[
                                styles.applyBtn,
                                { backgroundColor: previewColors.primary },
                                baseActiveTheme === previewTheme && { opacity: 0.45 },
                            ]}
                            onPress={handleApply}
                            disabled={baseActiveTheme === previewTheme}
                        >
                            <Text style={styles.applyText}>Apply</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const SIDEBAR_W = 140;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingTop: 56,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.06)",
        alignItems: "center", justifyContent: "center",
    },
    topTitle: {
        fontSize: 17, fontWeight: "700", letterSpacing: 0.1,
    },
    topToggle: {
        flexDirection: "row", alignItems: "center",
        gap: 4, borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 6,
        borderWidth: 1,
    },
    topToggleLabel: { fontSize: 11, fontWeight: "700" },

    body: {
        flex: 1,
        flexDirection: "row",
    },

    // ── Sidebar ──
    sidebar: {
        width: SIDEBAR_W,
        borderRightWidth: 1,
        borderRightColor: "rgba(0,0,0,0.06)",
    },
    sidebarContent: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 2,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
    },
    dot: {
        width: 26, height: 26, borderRadius: 8,
        overflow: "hidden",
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    dotSprite: {
        width: 26, height: 26,
    },
    rowLabel: {
        flex: 1, fontSize: 13, fontWeight: "500",
    },
    appliedDot: {
        width: 6, height: 6, borderRadius: 3, flexShrink: 0,
    },

    // ── Preview ──
    previewColumn: {
        flex: 1,
        padding: 14,
        gap: 10,
        justifyContent: "flex-start",
    },
    previewCard: {
        borderRadius: 24,
        height: SCREEN_HEIGHT * 0.42,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    circle: { position: "absolute", borderRadius: 9999 },
    circleA: { width: 220, height: 220, top: -60, right: -60 },
    circleB: { width: 160, height: 160, bottom: -40, left: -40 },
    circleC: { width: 200, height: 200, bottom: -50, right: -30 },
    artwork: {
        width: "75%", height: "65%",
    },
    previewLabel: {
        position: "absolute", bottom: 14, left: 14,
    },
    previewName: {
        fontSize: 22, fontWeight: "800", color: "#fff",
        letterSpacing: -0.5,
        textShadowColor: "rgba(0,0,0,0.2)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    previewDesc: {
        fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500", marginTop: 2,
    },
    appliedChip: {
        position: "absolute", top: 12, right: 12,
        backgroundColor: "#fff",
        borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
        flexDirection: "row", alignItems: "center", gap: 4,
    },
    appliedChipText: {
        fontSize: 11, fontWeight: "800",
    },

    toggle: {
        flexDirection: "row", alignItems: "center",
        gap: 6, borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 8,
        borderWidth: 1,
    },
    toggleLabel: { fontSize: 13, fontWeight: "600", flex: 1 },

    applyBtn: {
        borderRadius: 14, paddingVertical: 13,
        alignItems: "center", justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
    },
    applyText: {
        color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2,
    },
});