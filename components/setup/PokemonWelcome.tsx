import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Dimensions,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { themeTokens } from "../../constants/themeTokens";
import * as Haptics from "../../utils/haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STAGE_WIDTH = Math.min(SCREEN_WIDTH - 24, 384);
const SCALE = Math.min(1, Math.max(0.82, Math.min(STAGE_WIDTH / 384, SCREEN_HEIGHT / 820)));
const STAGE_HEIGHT = Math.round(365 * SCALE);

// Arc geometry calculated in exact screen pixels (1:1 with device display)
const ARC_START_Y = Math.round(SCREEN_HEIGHT * 0.32);
const ARC_APEX_Y = Math.round(SCREEN_HEIGHT * 0.395);
const ARC_CONTROL_Y = 2 * ARC_APEX_Y - ARC_START_Y;
const CENTER_BALL_SIZE = 88;

interface PokeballWatermarkProps {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    fillOpacity: number;
    line?: string;
    lineOpacity?: number;
    ringR?: number;
    strokeWidth?: number;
    detail?: boolean;
}

const PokeballWatermark = ({
    cx,
    cy,
    r,
    fill,
    fillOpacity,
    line,
    lineOpacity,
    ringR = r * 0.47,
    strokeWidth = r * 0.13,
    detail = true,
}: PokeballWatermarkProps) => (
    <G>
        <Circle cx={cx} cy={cy} r={r} fill={fill} opacity={fillOpacity} />
        {detail && (
            <G opacity={lineOpacity} stroke={line} strokeWidth={strokeWidth} fill="none">
                <Circle cx={cx} cy={cy} r={ringR} />
                <Path d={`M ${cx - r} ${cy} H ${cx - ringR} M ${cx + ringR} ${cy} H ${cx + r}`} />
            </G>
        )}
    </G>
);

interface PokemonMascotConfig {
    id: number;
    name: string;
    size: number;
    left?: number;
    right?: number;
    top: number;
    zIndex?: number;
    borderColor: string;
}

const POKEMON_MASCOTS: PokemonMascotConfig[] = [
    {
        id: 1, // Bulbasaur - Top Left
        name: "Bulbasaur",
        size: Math.round(104 * SCALE),
        left: Math.round(10 * SCALE),
        top: Math.round(6 * SCALE),
        zIndex: 2,
        borderColor: "#74D7B8",
    },
    {
        id: 6, // Charizard - Top Right
        name: "Charizard",
        size: Math.round(116 * SCALE),
        right: Math.round(8 * SCALE),
        top: Math.round(10 * SCALE),
        zIndex: 2,
        borderColor: "#FFB3A8",
    },
    {
        id: 25, // Pikachu - Center Hero
        name: "Pikachu",
        size: Math.round(120 * SCALE),
        left: (STAGE_WIDTH - Math.round(120 * SCALE)) / 2 - 2,
        top: Math.round(102 * SCALE),
        zIndex: 5,
        borderColor: "#FFD85B",
    },
    {
        id: 7, // Squirtle - Mid Left
        name: "Squirtle",
        size: Math.round(104 * SCALE),
        left: Math.round(12 * SCALE),
        top: Math.round(192 * SCALE),
        zIndex: 2,
        borderColor: "#9CCFFF",
    },
    {
        id: 143, // Snorlax - Mid Right
        name: "Snorlax",
        size: Math.round(110 * SCALE),
        right: Math.round(10 * SCALE),
        top: Math.round(198 * SCALE),
        zIndex: 2,
        borderColor: "#A9DCDC",
    },
    {
        id: 94, // Gengar - Bottom Center
        name: "Gengar",
        size: Math.round(108 * SCALE),
        left: (STAGE_WIDTH - Math.round(108 * SCALE)) / 2 + Math.round(8 * SCALE),
        top: Math.round(256 * SCALE),
        zIndex: 4,
        borderColor: "#D2B4F2",
    },
];

interface MascotBadgeProps {
    mascot: PokemonMascotConfig;
}

function MascotBadge({ mascot }: MascotBadgeProps) {
    const [imageError, setImageError] = useState(false);
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mascot.id}.png`;
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mascot.id}.png`;
    const imageSize = Math.round(mascot.size * 0.86);

    return (
        <View
            style={[
                styles.badge,
                {
                    width: mascot.size,
                    height: mascot.size,
                    borderRadius: mascot.size / 2,
                    borderColor: mascot.borderColor,
                    top: mascot.top,
                    left: mascot.left,
                    right: mascot.right,
                    zIndex: mascot.zIndex || 2,
                },
            ]}
            accessibilityLabel={`${mascot.name} mascot bubble`}
        >
            <Image
                source={{ uri: imageError ? spriteUrl : artworkUrl }}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
                onError={() => setImageError(true)}
                accessibilityLabel={mascot.name}
            />
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
    // End-to-end paths extending beyond screen margins to guarantee zero gaps at edges
    const redPath = `M -20 -20 H ${SCREEN_WIDTH + 20} V ${ARC_START_Y} Q ${SCREEN_WIDTH / 2} ${ARC_CONTROL_Y} -20 ${ARC_START_Y} Z`;
    const blackArcPath = `M -20 ${ARC_START_Y} Q ${SCREEN_WIDTH / 2} ${ARC_CONTROL_Y} ${SCREEN_WIDTH + 20} ${ARC_START_Y}`;

    return (
        <View style={styles.container}>
            {/* 1:1 Pixel-Accurate SVG Background: No distortion, true circles, seamless edges */}
            <Svg
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
            >
                {/* Red Top Half Filling Edge-to-Edge */}
                <Path d={redPath} fill="#F9343D" />

                {/* Dark Charcoal Separator Arc (Extends past screen boundaries) */}
                <Path
                    d={blackArcPath}
                    fill="none"
                    stroke="#292D36"
                    strokeWidth={18}
                />

                {/* Top-Right */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.82}
                    cy={SCREEN_HEIGHT * 0.07}
                    r={56}
                    fill="#FF5E65"
                    fillOpacity={0.35}
                    line="#F9343D"
                    lineOpacity={0.5}
                    strokeWidth={7}
                    ringR={27}
                />

                {/* Top-Left */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.07}
                    cy={SCREEN_HEIGHT * 0.14}
                    r={40}
                    fill="#FF5E65"
                    fillOpacity={0.25}
                    line="#F9343D"
                    lineOpacity={0.35}
                    strokeWidth={6}
                    ringR={18}
                />

                {/* Mid-Left */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.09}
                    cy={SCREEN_HEIGHT * 0.57}
                    r={42}
                    fill="#EEF0F4"
                    fillOpacity={0.7}
                    line="#FFF"
                    lineOpacity={0.65}
                    strokeWidth={8}
                    ringR={19}
                />

                {/* Mid-Right */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.90}
                    cy={SCREEN_HEIGHT * 0.63}
                    r={46}
                    fill="#F5F5F8"
                    fillOpacity={0.75}
                    line="#FFF"
                    lineOpacity={0.7}
                    strokeWidth={8}
                    ringR={21}
                />

                {/* Bottom-Left (plain disc) */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.11}
                    cy={SCREEN_HEIGHT * 0.89}
                    r={36}
                    fill="#EEF0F4"
                    fillOpacity={0.6}
                    detail={false}
                />

                {/* Bottom-Right (plain disc) */}
                <PokeballWatermark
                    cx={SCREEN_WIDTH * 0.91}
                    cy={SCREEN_HEIGHT * 0.91}
                    r={38}
                    fill="#F5F5F8"
                    fillOpacity={0.6}
                    detail={false}
                />

            </Svg>

            {/* Top Navigation: 5 Quick Steps & Skip All */}
            <View style={styles.topNav}>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>5 Quick Steps</Text>
                </View>
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        onSkip();
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Skip welcome"
                >
                    <Text style={styles.skipText}>Skip All</Text>
                </Pressable>
            </View>

            {/* Hero Headline */}
            <View style={styles.heroCopy}>
                <Text style={styles.title}>
                    Welcome! Want to get on{"\n"}good terms with your{"\n"}daily routine?
                </Text>
            </View>

            {/* Perfectly Circular Center Pokéball Button */}
            <View
                pointerEvents="none"
                style={[
                    styles.centerBall,
                    {
                        top: ARC_APEX_Y - CENTER_BALL_SIZE / 2,
                        left: (SCREEN_WIDTH - CENTER_BALL_SIZE) / 2,
                        width: CENTER_BALL_SIZE,
                        height: CENTER_BALL_SIZE,
                        borderRadius: CENTER_BALL_SIZE / 2,
                    },
                ]}
            >
                <View style={styles.centerBallWhiteRing}>
                    <View style={styles.centerBallCore}>
                        <View style={styles.centerBallDot} />
                    </View>
                </View>
            </View>

            {/* Scattered Pokémon Stage */}
            <View
                style={[
                    styles.centerStage,
                    {
                        top: ARC_APEX_Y + CENTER_BALL_SIZE / 2 + 8,
                    },
                ]}
            >
                <View style={[styles.constellationCard, { width: STAGE_WIDTH, height: STAGE_HEIGHT }]}>
                    {/* Decorative Star Sparkles */}
                    <Text pointerEvents="none" style={[styles.sparkle, styles.sparkleCoral]}>
                        ✦
                    </Text>
                    <Text pointerEvents="none" style={[styles.sparkle, styles.sparkleGoldTop]}>
                        ✦
                    </Text>
                    <Text pointerEvents="none" style={[styles.sparkle, styles.sparkleGoldBottom]}>
                        ✦
                    </Text>

                    {/* 6 Scattered Big Pokémon Badges */}
                    {POKEMON_MASCOTS.map((mascot) => (
                        <MascotBadge key={mascot.id} mascot={mascot} />
                    ))}
                </View>
            </View>

            {/* Bottom Call To Action */}
            <View style={styles.bottomBar}>
                <Pressable
                    style={({ pressed }) => [
                        styles.primaryBtn,
                        pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onStart();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Get Started"
                >
                    <Text style={styles.primaryBtnText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },
    topNav: {
        paddingTop: Platform.OS === "android" ? 18 : 12,
        paddingHorizontal: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
    },
    stepBadge: {
        backgroundColor: "#FFFFFF",
        borderRadius: 30,
        paddingHorizontal: 18,
        paddingVertical: 9,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    stepBadgeText: {
        color: "#E92732",
        fontFamily: themeTokens.fonts.family.bold,
        fontSize: 15.5,
    },
    skipText: {
        color: "#FFFFFF",
        fontFamily: themeTokens.fonts.family.bold,
        fontSize: 16.5,
        padding: 6,
    },
    heroCopy: {
        position: "absolute",
        top: Platform.OS === "android" ? "14%" : "15%",
        width: "100%",
        paddingHorizontal: 26,
        alignItems: "center",
        zIndex: 10,
    },
    title: {
        color: "#FFFFFF",
        fontSize: Math.min(29, SCREEN_WIDTH * 0.074),
        lineHeight: Math.min(39, SCREEN_WIDTH * 0.098),
        fontFamily: themeTokens.fonts.family.bold,
        textAlign: "center",
        letterSpacing: -0.45,
    },
    centerBall: {
        position: "absolute",
        backgroundColor: "#292D36",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 8,
    },
    centerBallWhiteRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    centerBallCore: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#FFFFFF",
        borderWidth: 4,
        borderColor: "#D9DADD",
        alignItems: "center",
        justifyContent: "center",
    },
    centerBallDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#F5F6F8",
    },
    centerStage: {
        position: "absolute",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 8,
    },
    constellationCard: {
        position: "relative",
    },
    badge: {
        position: "absolute",
        borderWidth: 4,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#667085",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 9,
        elevation: 6,
    },
    sparkle: {
        position: "absolute",
        fontSize: 26,
    },
    sparkleCoral: {
        top: "8%",
        left: "34%",
        color: "#FFC7C8",
    },
    sparkleGoldTop: {
        top: "28%",
        right: "6%",
        color: "#FFD24A",
    },
    sparkleGoldBottom: {
        top: "84%",
        right: "12%",
        color: "#FFD24A",
    },
    bottomBar: {
        position: "absolute",
        bottom: Platform.OS === "android" ? 22 : 18,
        left: 24,
        right: 24,
        zIndex: 10,
    },
    primaryBtn: {
        minHeight: 64,
        borderRadius: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: "#F9343D",
        shadowColor: "#DB222D",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 7,
    },
    primaryBtnPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    primaryBtnText: {
        color: "#FFFFFF",
        fontFamily: themeTokens.fonts.family.bold,
        fontSize: 18.5,
        letterSpacing: -0.2,
    },
});
