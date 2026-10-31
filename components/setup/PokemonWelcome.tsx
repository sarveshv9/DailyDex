import React, { useState } from "react";
import {
    Dimensions,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "../../utils/haptics";
import { themeTokens } from "../../constants/themeTokens";
import { hexToRgba } from "../../utils/color";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONSTELLATION_WIDTH = Math.min(SCREEN_WIDTH - 24, 380);
const CONSTELLATION_HEIGHT = 425;

interface PokemonMascotConfig {
    id: number;
    name: string;
    bubbleSize: number;
    left?: number;
    right?: number;
    top: number;
    accentColor: string;
}

const POKEMON_MASCOTS: PokemonMascotConfig[] = [
    {
        id: 1, // Bulbasaur
        name: "Bulbasaur",
        bubbleSize: 98,
        left: 14,
        top: 14,
        accentColor: "#1FCB8A", // Emerald green
    },
    {
        id: 6, // Charizard (Big mascot)
        name: "Charizard",
        bubbleSize: 128,
        right: 10,
        top: 24,
        accentColor: "#FF7A1A", // Radiant flame orange
    },
    {
        id: 25, // Pikachu
        name: "Pikachu",
        bubbleSize: 120,
        left: (CONSTELLATION_WIDTH - 120) / 2 - 10,
        top: 144,
        accentColor: "#FFB800", // Electric gold
    },
    {
        id: 7, // Squirtle
        name: "Squirtle",
        bubbleSize: 102,
        left: 10,
        top: 242,
        accentColor: "#1E9BFF", // Azure water blue
    },
    {
        id: 143, // Snorlax
        name: "Snorlax",
        bubbleSize: 100,
        right: 14,
        top: 256,
        accentColor: "#0284C7", // Peaceful cyan / deep teal
    },
    {
        id: 94, // Gengar
        name: "Gengar",
        bubbleSize: 110,
        left: (CONSTELLATION_WIDTH - 110) / 2 + 14,
        top: 312,
        accentColor: "#9B5CFF", // Electric shadow violet
    },
];

interface MascotBadgeProps {
    config: PokemonMascotConfig;
}

function MascotBadge({ config }: MascotBadgeProps) {
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${config.id}.png`;
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${config.id}.png`;
    const [imageError, setImageError] = useState(false);

    // Each Pokémon has its own signature theme color background
    const bubbleBg = hexToRgba(config.accentColor, 0.28);
    const imageSize = Math.round(config.bubbleSize * 0.84);
    const innerRingSize = Math.round(config.bubbleSize * 0.88);

    return (
        <View
            style={[
                styles.bubbleShadowWrapper,
                {
                    width: config.bubbleSize,
                    height: config.bubbleSize,
                    borderRadius: config.bubbleSize / 2,
                    top: config.top,
                    left: config.left,
                    right: config.right,
                },
            ]}
            accessibilityLabel={`${config.name} mascot bubble`}
        >
            <View
                style={[
                    styles.bubbleBadge,
                    {
                        backgroundColor: bubbleBg,
                    },
                ]}
            >
                {/* White border/halo around the Pokémon in the circle background */}
                <View
                    style={[
                        styles.pokemonWhiteBacking,
                        {
                            width: innerRingSize,
                            height: innerRingSize,
                            borderRadius: innerRingSize / 2,
                        },
                    ]}
                >
                    <Image
                        source={{ uri: imageError ? spriteUrl : artworkUrl }}
                        style={[
                            styles.pokemonImage,
                            {
                                width: imageSize,
                                height: imageSize,
                            },
                        ]}
                        resizeMode="contain"
                        onError={() => setImageError(true)}
                    />
                </View>
            </View>
        </View>
    );
}

export function PokemonWelcome({
    onStart,
    onSkip,
}: {
    onStart: () => void;
    onSkip: () => void;
}) {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Top Navigation Bar with subtle indicator and Skip option */}
            <View style={styles.topNav}>
                <View
                    style={[
                        styles.stepBadge,
                        { backgroundColor: theme.colors.primarySoft },
                    ]}
                >
                    <Text
                        style={[
                            styles.stepBadgeText,
                            { color: theme.colors.primary },
                        ]}
                    >
                        5 Quick Steps
                    </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable
                    onPress={onSkip}
                    style={({ pressed }) => [
                        styles.skipBtn,
                        pressed && { opacity: 0.6 },
                    ]}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Skip welcome"
                >
                    <Text style={[styles.skipBtnText, { color: theme.colors.textSecondary }]}>
                        Skip All
                    </Text>
                </Pressable>
            </View>

            {/* Scrollable Center Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Title Headline */}
                <View style={styles.headerArea}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        Welcome! Want to get on{"\n"}good terms with your{"\n"}daily routine?
                    </Text>
                </View>

                {/* Static Pokémon Constellation */}
                <View style={styles.centerStage}>
                    <View style={styles.constellationCard}>
                        {POKEMON_MASCOTS.map((mascot) => (
                            <MascotBadge key={mascot.id} config={mascot} />
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Call To Action: "Get Started" */}
            <View style={styles.bottomBar}>
                <Pressable
                    style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                            backgroundColor: theme.colors.primary,
                            shadowColor: theme.colors.primary,
                        },
                        pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onStart();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Get Started"
                >
                    <Text style={[styles.primaryBtnText, { color: theme.colors.onPrimary }]}>
                        Get Started
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={theme.colors.onPrimary}
                    />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 8,
    },
    topNav: {
        paddingHorizontal: 22,
        paddingTop: Platform.OS === "android" ? 14 : 10,
        paddingBottom: 4,
        flexDirection: "row",
        alignItems: "center",
    },
    stepBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
    },
    stepBadgeText: {
        fontSize: 12,
        fontFamily: themeTokens.fonts.family.bold,
        letterSpacing: 0.3,
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    skipBtnText: {
        fontSize: 14,
        fontFamily: themeTokens.fonts.family.medium,
    },
    headerArea: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 12,
        alignItems: "center",
    },
    title: {
        fontSize: 26,
        lineHeight: 34,
        fontFamily: themeTokens.fonts.family.bold,
        textAlign: "center",
        letterSpacing: -0.4,
    },
    centerStage: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    constellationCard: {
        width: CONSTELLATION_WIDTH,
        height: CONSTELLATION_HEIGHT,
        position: "relative",
    },

    // Mascot Bubble Shadow & Border
    bubbleShadowWrapper: {
        position: "absolute",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    bubbleBadge: {
        width: "100%",
        height: "100%",
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 5,
        borderColor: "#FFFFFF",
        overflow: "hidden",
    },

    // White border around the Pokémon in the circle background
    pokemonWhiteBacking: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#FFFFFF",
        backgroundColor: "rgba(255, 255, 255, 0.45)",
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 5,
    },
    pokemonImage: {
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        ...(Platform.OS === "web"
            ? {
                  // White outline contour filter for web
                  filter: "drop-shadow(0px 0px 3px #FFFFFF) drop-shadow(0px 0px 1px #FFFFFF)",
              }
            : {}),
    },

    // Bottom Action Button
    bottomBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 14,
    },
    primaryBtn: {
        flex: 1,
        height: 56,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryBtnPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    primaryBtnText: {
        fontSize: 17,
        fontFamily: themeTokens.fonts.family.bold,
        letterSpacing: -0.2,
    },
});
