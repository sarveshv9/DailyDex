import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme, themes } from "../../constants/shared";

type ThemeSelectionModalProps = {
    visible: boolean;
    onClose: () => void;
    currentTheme: Theme;
    onSelectTheme: (themeName: string) => void;
};

// Map themes to their PokeAPI national dex IDs
const POKEMON_IDS: Record<string, number> = {
    pikachu: 25,
    bulbasaur: 1,
    squirtle: 7,
    jigglypuff: 39,
    meowth: 52,
    psyduck: 54,
    slowpoke: 79,
    gengar: 94,
    snorlax: 143,
    charizard: 6,
    dragonite: 149,
    mew: 151,
};

export function ThemeSelectionModal({
    visible,
    onClose,
    currentTheme,
    onSelectTheme,
}: ThemeSelectionModalProps) {
    const styles = useMemo(() => getStyles(currentTheme), [currentTheme]);

    // Just grouping basics vs pokemon
    const themeGroups = useMemo(() => {
        const basics = ["default", "dark"];
        const pokemon = Object.keys(themes).filter((t) => !basics.includes(t));
        return [
            { title: "Basics", items: basics },
            { title: "Pokémon", items: pokemon },
        ];
    }, []);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.modalContent} onPress={() => { }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Theme</Text>
                        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={currentTheme.colors.primary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {themeGroups.map((group) => (
                            <View key={group.title} style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>{group.title}</Text>
                                </View>

                                <View style={styles.themeGrid}>
                                    {group.items.map((tName) => {
                                        const tColors = (themes as any)[tName].colors;
                                        const pokeId = POKEMON_IDS[tName];
                                        const spriteUrl = pokeId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png` : null;

                                        return (
                                            <Pressable
                                                key={tName}
                                                style={styles.themeCard}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    onSelectTheme(tName);
                                                    onClose();
                                                }}
                                            >
                                                <View style={[styles.colorPreview, { backgroundColor: tColors.primary }]}>
                                                    {spriteUrl ? (
                                                        <Image source={{ uri: spriteUrl }} style={{ width: 64, height: 64 }} />
                                                    ) : (
                                                        <Ionicons name="color-palette" size={28} color="rgba(255,255,255,0.7)" />
                                                    )}
                                                </View>
                                                <Text style={styles.themeNameText}>
                                                    {tName.charAt(0).toUpperCase() + tName.slice(1)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const getStyles = (theme: Theme) =>
    StyleSheet.create({
        modalBackdrop: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
        },
        modalContent: {
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: theme.spacing.lg,
            maxHeight: "90%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.lg,
        },
        title: {
            fontSize: 24,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
        },
        closeButton: {
            backgroundColor: theme.colors.white,
            padding: theme.spacing.xs,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: `${theme.colors.secondary}20`,
        },
        scrollContent: {
            paddingBottom: 40,
            gap: theme.spacing.xl,
        },
        sectionContainer: {
            marginBottom: theme.spacing.md,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        sectionTitle: {
            fontSize: 18,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
        },
        lockedText: {
            color: theme.colors.secondary,
            opacity: 0.6,
        },
        themeGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.md,
        },
        themeCard: {
            width: "30%", // 3 columns
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        themeCardLocked: {
            opacity: 0.5,
        },
        colorPreview: {
            width: 64,
            height: 64,
            borderRadius: 16,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        themeNameText: {
            fontFamily: theme.fonts.medium,
            fontSize: 14,
            color: theme.colors.primary,
            textTransform: "capitalize",
        },
    });
