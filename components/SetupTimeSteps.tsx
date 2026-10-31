import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    LinearGradient,
    Mask,
    Path,
    RadialGradient,
    Rect,
    Stop
} from "react-native-svg";
import { themeTokens } from "../constants/themeTokens";
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "../styles/shared";
import { hexToRgba } from "../utils/color";
import * as Haptics from "../utils/haptics";
import { timeToMinutes } from "../utils/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DAY_BG = "#FFF8F3";
const NIGHT_BG = "#07080C";

// ─── Time helpers ────────────────────────────────────────────────────────────
function parseTimeString(timeStr: string) {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    let hours = 7;
    let minutes = 0;
    let ampm = "AM";
    if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        ampm = (match[3] || "AM").toUpperCase();
    }
    return { hours, minutes, ampm };
}

function formatTimeString(hours: number, minutes: number, ampm: string) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function calculateSleepWindow(sleepStr: string, wakeStr: string) {
    let diff = timeToMinutes(wakeStr) - timeToMinutes(sleepStr);
    if (diff <= 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const text = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

    let desc = "Optimal restorative balance. Ample deep sleep and REM for peak daytime focus.";
    let isWarning = false;
    if (hours < 7) {
        desc = "Slightly shorter sleep window. Zen recommends 7–9 hours for sustained cognitive clarity.";
        isWarning = true;
    } else if (hours > 9 || (hours === 9 && minutes > 30)) {
        desc = "Generous rest window. Plenty of time to recharge your body and nervous system.";
        isWarning = false;
    }
    return { text, desc, isWarning };
}

// ─── Illustration pieces ─────────────────────────────────────────────────────
function Cloud({ x, y, scale = 1, fill }: { x: number; y: number; scale?: number; fill: string }) {
    return (
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
            <Circle cx={16} cy={22} r={12} fill={fill} />
            <Circle cx={34} cy={14} r={16} fill={fill} />
            <Circle cx={54} cy={22} r={12} fill={fill} />
            <Rect x={16} y={22} width={38} height={12} fill={fill} />
        </G>
    );
}

// ─── Foliage ─────────────────────────────────────────────────────────────────
// Soft, painterly plants. Every shape fades toward its base so it melts into the
// hill behind it instead of sitting on top like a sticker. `hi` is the strength
// of the lighter facet on one side of each leaf / lump.
const fadeId = (c: string) => `fade-${c.replace("#", "")}`;

function Fade({ color }: { color: string }) {
    return (
        <Defs>
            <LinearGradient id={fadeId(color)} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={1} />
                <Stop offset="0.55" stopColor={color} stopOpacity={0.92} />
                <Stop offset="1" stopColor={color} stopOpacity={0.3} />
            </LinearGradient>
        </Defs>
    );
}

type FoliageProps = { x: number; y: number; scale?: number; fill: string; hi?: number };

// Slender, pointed leaf buds (tall, overlapping, two-toned).
const LEAF = "M0 0 C-5.5 -9 -6 -27 0 -46 C6 -27 5.5 -9 0 0 Z";
const LEAF_FACET = "M0 -6 C4.5 -12 6 -27 0 -46 L0 -6 Z";
const BUD_LEAVES = [
    { r: -20, s: 0.5, dx: -3, o: 0.8 },
    { r: 19, s: 0.46, dx: 3, o: 0.8 },
    { r: -9, s: 0.8, dx: -2, o: 0.88 },
    { r: 8, s: 0.72, dx: 2, o: 0.88 },
    { r: 0, s: 1, dx: 0, o: 1 },
];

function Tree({ x, y, scale = 1, fill, hi = 0.16 }: FoliageProps) {
    return (
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
            <Fade color={fill} />
            {BUD_LEAVES.map((l, i) => (
                <G key={i} transform={`translate(${l.dx} 0) rotate(${l.r}) scale(${l.s})`} opacity={l.o}>
                    <Path d={LEAF} fill={`url(#${fadeId(fill)})`} />
                    <Path d={LEAF_FACET} fill="#FFFFFF" fillOpacity={hi} />
                </G>
            ))}
        </G>
    );
}

// Narrow splayed blades (agave / grass tuft).
const BLADE = "M0 0 C-2.6 -8 -3.2 -22 0 -40 C3.2 -22 2.6 -8 0 0 Z";
const BLADE_FACET = "M0 -4 C2.4 -10 3.2 -22 0 -40 L0 -4 Z";
const SPIKES = [
    { r: -58, s: 0.55 },
    { r: 58, s: 0.55 },
    { r: -40, s: 0.75 },
    { r: 40, s: 0.75 },
    { r: -20, s: 0.92 },
    { r: 20, s: 0.92 },
    { r: 0, s: 1 },
];

function Spike({ x, y, scale = 1, fill, hi = 0.16 }: FoliageProps) {
    return (
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
            <Fade color={fill} />
            {SPIKES.map((l, i) => (
                <G key={i} transform={`rotate(${l.r}) scale(${l.s})`}>
                    <Path d={BLADE} fill={`url(#${fadeId(fill)})`} />
                    <Path d={BLADE_FACET} fill="#FFFFFF" fillOpacity={hi} />
                </G>
            ))}
        </G>
    );
}

// Lumpy rounded shrub with a lighter front lump; fades out at the base.
const BUSH = "M-28 2 A8 8 0 0 1 -21 -10 A11 11 0 0 1 -3 -17 A12 12 0 0 1 16 -15 A9 9 0 0 1 28 -4 L29 2 Z";
const BUSH_FRONT = "M-15 2 A7 7 0 0 1 -8 -6 A9 9 0 0 1 8 -8 A7 7 0 0 1 17 2 Z";

function Bush({ x, y, scale = 1, fill, hi = 0.16 }: FoliageProps) {
    return (
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
            <Fade color={fill} />
            <Path d={BUSH} fill={`url(#${fadeId(fill)})`} />
            <Path d={BUSH_FRONT} fill="#FFFFFF" fillOpacity={hi * 0.8} />
        </G>
    );
}

// Soft mauve ground patch the plants stand on.
function Mound({ d, color, id }: { d: string; color: string; id: string }) {
    return (
        <>
            <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={0.85} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
            </Defs>
            <Path d={d} fill={`url(#${id})`} />
        </>
    );
}

// ─── Shared landscape, built in layers so the sky can animate ────────────────
// Same hills / trees / clouds in both modes. Only the palette and the sky
// object (sun ↔ moon) differ. `progress` goes 0 (day) → 1 (night).
type Mode = "day" | "night";

const HILLS = {
    day: {
        back: ["#FAD5BE", "#F7C7AA"],
        mid: ["#F8CBAE", "#FBDCC8"],
        front: ["#FBDCC9", DAY_BG],
        tree: "#A98BA3",
        treeMid: "#C9A1A9",
        treeLight: "#D8AEAA",
        mound: "#CFA9AF",
        hi: 0.16,
        rim: "#FFFFFF",
        rimOpacity: 0.55,
        cloud: "#FBE4D5",
    },
    night: {
        back: ["#2C1C40", "#1A1230"],
        mid: ["#1F1533", "#150F25"],
        front: ["#150F24", NIGHT_BG],
        tree: "#150E27",
        treeMid: "#1D1434",
        treeLight: "#251B42",
        mound: "#140D24",
        hi: 0.09,
        rim: "#FFFFFF",
        rimOpacity: 0.2,
        cloud: "#26193A",
    },
} as const;

// Sky object position (shared by sun and moon)
const SKY_X = 195;
const SKY_Y = 92;
const SKY_R = 50;
const RISE_DISTANCE = 105; // viewBox units the sun/moon travel behind the hills

const RAYS = Array.from({ length: 24 }, (_, i) => {
    const a = (i * (360 / 24) * Math.PI) / 180;
    const r1 = SKY_R + 10;
    const r2 = SKY_R + (i % 2 === 0 ? 30 : 20);
    return {
        x1: SKY_X + Math.cos(a) * r1,
        y1: SKY_Y + Math.sin(a) * r1,
        x2: SKY_X + Math.cos(a) * r2,
        y2: SKY_Y + Math.sin(a) * r2,
    };
});

const STARS: [number, number, number, number][] = [
    [34, 22, 1.4, 0.7],
    [78, 48, 1, 0.45],
    [118, 16, 1.6, 0.8],
    [150, 56, 1, 0.4],
    [238, 18, 1.5, 0.7],
    [284, 50, 1.2, 0.6],
    [326, 24, 1.6, 0.8],
    [362, 60, 1, 0.45],
    [56, 80, 1, 0.35],
];

const BACK_RIDGE =
    "M0 108 C55 84 115 86 180 104 C245 122 300 100 345 88 C365 83 380 84 390 88";

// The scene is a full-page layer behind all content. Geometry is authored in a
// 390-wide "design" space and scaled to the screen; `ty` pins the hills to the
// empty slot between the header and the cards.
type SceneGeo = { w: number; h: number; s: number; ty: number; bottomVu: number };
const SceneCtx = React.createContext<SceneGeo>({ w: 390, h: 844, s: 1, ty: 0, bottomVu: 1000 });

// Every layer is a full-page SVG with the same transform, so they line up exactly.
function LayerSvg({ children }: { children: React.ReactNode }) {
    const g = React.useContext(SceneCtx);
    return (
        <Svg width={g.w} height={g.h} style={StyleSheet.absoluteFill}>
            <G transform={`translate(0 ${g.ty}) scale(${g.s})`}>{children}</G>
        </Svg>
    );
}

function Clouds({ mode }: { mode: Mode }) {
    const c = HILLS[mode].cloud;
    return (
        <LayerSvg>
            <Cloud x={22} y={52} scale={0.95} fill={c} />
            <Cloud x={298} y={30} scale={1.1} fill={c} />
            <Cloud x={250} y={-70} scale={0.8} fill={c} />
            <Cloud x={-10} y={-40} scale={0.7} fill={c} />
        </LayerSvg>
    );
}

const EXTRA_STARS: [number, number, number, number][] = [
    [60, -30, 1.3, 0.6],
    [140, -60, 1, 0.5],
    [200, -20, 1.5, 0.7],
    [300, -50, 1.2, 0.6],
    [350, -10, 1, 0.5],
    [20, -80, 1.2, 0.5],
    [250, -100, 1, 0.4],
];

function Stars() {
    return (
        <LayerSvg>
            {[...STARS, ...EXTRA_STARS].map(([cx, cy, r, o], i) => (
                <Circle key={i} cx={cx} cy={cy} r={r} fill="#FFFFFF" opacity={o} />
            ))}
            <Circle cx={262} cy={36} r={1.4} fill="#FFFFFF" opacity={0.8} />
        </LayerSvg>
    );
}

function Sun() {
    return (
        <LayerSvg>
            <Defs>
                <RadialGradient id="sunHalo" cx={SKY_X} cy={SKY_Y} r="115" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#FFC9A8" stopOpacity="0.65" />
                    <Stop offset="1" stopColor="#FFC9A8" stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="sunBody" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#F9B08A" />
                    <Stop offset="1" stopColor="#F59E78" />
                </LinearGradient>
            </Defs>
            <Circle cx={SKY_X} cy={SKY_Y} r={115} fill="url(#sunHalo)" />
            {RAYS.map((r, i) => (
                <Line
                    key={i}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke="#F9C9AE"
                    strokeOpacity={0.55}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                />
            ))}
            <Circle cx={SKY_X} cy={SKY_Y} r={SKY_R} fill="url(#sunBody)" />
        </LayerSvg>
    );
}

function Moon() {
    return (
        <LayerSvg>
            <Defs>
                <RadialGradient id="moonHalo" cx={SKY_X} cy={SKY_Y} r="125" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
                    <Stop offset="0.45" stopColor="#E0E7FF" stopOpacity="0.14" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="moonBody" x1="0.15" y1="0.05" x2="0.85" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" />
                    <Stop offset="0.5" stopColor="#F8FAFC" />
                    <Stop offset="1" stopColor="#CBD5E1" />
                </LinearGradient>
                {/* Second circle is cut out of the first → crescent */}
                <Mask id="crescent" x="0" y="0" width="390" height="200">
                    <Rect x="0" y="0" width="390" height="200" fill="white" />
                    <Circle cx={SKY_X + 24} cy={SKY_Y - 16} r={SKY_R - 6} fill="black" />
                </Mask>
            </Defs>
            <Circle cx={SKY_X} cy={SKY_Y} r={125} fill="url(#moonHalo)" />
            <Circle cx={SKY_X} cy={SKY_Y} r={SKY_R} fill="url(#moonBody)" mask="url(#crescent)" />
        </LayerSvg>
    );
}

function Hills({ mode }: { mode: Mode }) {
    const p = HILLS[mode];
    const { bottomVu: B } = React.useContext(SceneCtx);
    // Gradients are in design space so the hills can run to the bottom of the page
    // and settle into the flat background colour behind the cards.
    return (
        <LayerSvg>
            <Defs>
                <LinearGradient id={`rBack-${mode}`} gradientUnits="userSpaceOnUse" x1="0" y1="84" x2="0" y2="150">
                    <Stop offset="0" stopColor={p.back[0]} />
                    <Stop offset="1" stopColor={p.back[1]} />
                </LinearGradient>
                <LinearGradient id={`rMid-${mode}`} gradientUnits="userSpaceOnUse" x1="0" y1="112" x2="0" y2="172">
                    <Stop offset="0" stopColor={p.mid[0]} />
                    <Stop offset="1" stopColor={p.mid[1]} />
                </LinearGradient>
                <LinearGradient id={`rFront-${mode}`} gradientUnits="userSpaceOnUse" x1="0" y1="146" x2="0" y2="206">
                    <Stop offset="0" stopColor={p.front[0]} />
                    <Stop offset="1" stopColor={p.front[1]} />
                </LinearGradient>
            </Defs>

            <Path d={`${BACK_RIDGE} L390 ${B} L0 ${B} Z`} fill={`url(#rBack-${mode})`} />
            <Path d={BACK_RIDGE} stroke={p.rim} strokeOpacity={p.rimOpacity} strokeWidth={1.2} fill="none" />

            <Mound id={`mL-${mode}`} color={p.mound} d="M-5 112 C25 101 70 104 110 111 C140 117 160 124 178 134 L-5 134 Z" />
            <Mound id={`mR-${mode}`} color={p.mound} d="M395 100 C370 99 340 103 312 109 C290 114 270 124 252 134 L395 134 Z" />

            {/* left cluster */}
            <Bush x={74} y={118} scale={1} fill={p.treeMid} hi={p.hi} />
            <Bush x={106} y={119} scale={0.6} fill={p.treeLight} hi={p.hi} />
            <Spike x={6} y={120} scale={0.5} fill={p.tree} hi={p.hi} />
            <Tree x={17} y={118} scale={0.85} fill={p.tree} hi={p.hi} />
            <Tree x={47} y={118} scale={0.8} fill={p.tree} hi={p.hi} />
            <Tree x={33} y={117} scale={1.2} fill={p.tree} hi={p.hi} />
            <Spike x={128} y={121} scale={0.35} fill={p.treeMid} hi={p.hi} />

            {/* right cluster */}
            <Bush x={304} y={108} scale={0.55} fill={p.treeMid} hi={p.hi} />
            <Bush x={348} y={107} scale={0.6} fill={p.treeLight} hi={p.hi} />
            <Tree x={312} y={108} scale={0.5} fill={p.tree} hi={p.hi} />
            <Tree x={324} y={108} scale={0.75} fill={p.tree} hi={p.hi} />
            <Spike x={386} y={108} scale={0.7} fill={p.tree} hi={p.hi} />
            <Spike x={372} y={107} scale={1.15} fill={p.tree} hi={p.hi} />

            <Path
                d={`M0 134 C70 112 140 122 205 136 C275 150 335 128 390 114 L390 ${B} L0 ${B} Z`}
                fill={`url(#rMid-${mode})`}
            />
            <Path
                d={`M0 162 C80 146 150 156 215 166 C285 176 340 160 390 150 L390 ${B} L0 ${B} Z`}
                fill={`url(#rFront-${mode})`}
            />
        </LayerSvg>
    );
}

// Timeline (progress 0 → 1):
//   0.00–0.55  sun rises and arcs up to the top-right, fading out
//   0.25–0.75  theme blends day → night (background, hills, clouds)
//   0.50–0.90  stars fade in
//   0.50–1.00  moon rises from behind the hills
const THEME_FROM = 0.25;
const THEME_TO = 0.75;

// Smooth paths: the sun follows a quarter-ellipse (up first, then curving right)
// and the moon eases up with a slow finish. Sampled densely so the piecewise-linear
// interpolation reads as a true curve instead of a kinked line.
const SUN_END = 0.55; // progress at which the sun has finished its arc
const SUN_ARC_X = 175; // design units
const SUN_ARC_Y = 150;
const PATH_STEPS = 28;

function sunArc(s: number) {
    const input: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= PATH_STEPS; i++) {
        const t = i / PATH_STEPS;
        const th = t * (Math.PI / 2);
        input.push(t * SUN_END);
        x.push(SUN_ARC_X * (1 - Math.cos(th)) * s);
        y.push(-SUN_ARC_Y * Math.sin(th) * s);
    }
    input.push(1);
    x.push(x[x.length - 1]);
    y.push(y[y.length - 1]);
    return { input, x, y };
}

function moonRise(s: number) {
    const input: number[] = [0];
    const y: number[] = [RISE_DISTANCE * s];
    for (let i = 0; i <= PATH_STEPS; i++) {
        const t = i / PATH_STEPS;
        const e = 1 - Math.pow(1 - t, 3); // ease-out
        input.push(0.5 + t * 0.5);
        y.push(RISE_DISTANCE * s * (1 - e));
    }
    return { input, y };
}

// Full-page scene that sits BEHIND the screen content (nothing is clipped).
function SkyScene({
    progress,
    box,
    slot,
}: {
    progress: SharedValue<number>;
    box: { w: number; h: number };
    slot: { y: number; h: number };
}) {
    const s = box.w / 390;
    const ty = slot.y + slot.h - 200 * s; // design y=200 sits at the bottom of the slot
    const geo: SceneGeo = { w: box.w, h: box.h, s, ty, bottomVu: (box.h - ty) / s + 20 };

    const arc = useMemo(() => sunArc(s), [s]);
    const rise = useMemo(() => moonRise(s), [s]);

    const sunAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        const sunX = interpolate(progress.value, arc.input, arc.x, Extrapolation.CLAMP);
        const sunY = interpolate(progress.value, arc.input, arc.y, Extrapolation.CLAMP);
        const sunOpacity = interpolate(progress.value, [0, 0.3, 0.55, 1], [1, 1, 0, 0], Extrapolation.CLAMP);
        return {
            opacity: sunOpacity,
            transform: [{ translateX: sunX }, { translateY: sunY }],
        };
    });

    const moonAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        const moonY = interpolate(progress.value, rise.input, rise.y, Extrapolation.CLAMP);
        const moonOpacity = interpolate(progress.value, [0, 0.5, 0.6, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
        return {
            opacity: moonOpacity,
            transform: [{ translateY: moonY }],
        };
    });

    const starAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        const starOpacity = interpolate(progress.value, [0, 0.5, 0.9, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
        return { opacity: starOpacity };
    });

    const nightMixAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        const nightMix = interpolate(progress.value, [THEME_FROM, THEME_TO], [0, 1], Extrapolation.CLAMP);
        return { opacity: nightMix };
    });

    const dayMixAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        const dayMix = 1 - interpolate(progress.value, [THEME_FROM, THEME_TO], [0, 1], Extrapolation.CLAMP);
        return { opacity: dayMix };
    });

    const fill = StyleSheet.absoluteFill;

    return (
        <SceneCtx.Provider value={geo}>
            <View style={fill} pointerEvents="none">
                <Animated.View style={[fill, starAnimatedStyle]}>
                    <Stars />
                </Animated.View>
                <Animated.View style={[fill, dayMixAnimatedStyle]}>
                    <Clouds mode="day" />
                </Animated.View>
                <Animated.View style={[fill, nightMixAnimatedStyle]}>
                    <Clouds mode="night" />
                </Animated.View>

                <Animated.View style={[fill, sunAnimatedStyle]}>
                    <Sun />
                </Animated.View>
                <Animated.View style={[fill, moonAnimatedStyle]}>
                    <Moon />
                </Animated.View>

                {/* Day hills stay opaque; night hills fade in on top of them */}
                <View style={fill}>
                    <Hills mode="day" />
                </View>
                <Animated.View style={[fill, nightMixAnimatedStyle]}>
                    <Hills mode="night" />
                </Animated.View>
            </View>
        </SceneCtx.Provider>
    );
}

// Full-screen background that follows the same progress value.
export function SkyBackground({ progress }: { progress: SharedValue<number> }) {
    const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        const backgroundColor = interpolateColor(
            progress.value,
            [THEME_FROM, THEME_TO],
            [DAY_BG, NIGHT_BG]
        );
        return { backgroundColor };
    });
    return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]} />;
}

interface TimeDigitColumnProps {
    value: number;
    onUp: () => void;
    onDown: () => void;
    label: string;
    upColor: string;
    downColor: string;
    digitStyle: StyleProp<TextStyle>;
    boxStyle: StyleProp<ViewStyle>;
    styles: ReturnType<typeof makeStyles>;
}

const TimeDigitColumn = React.memo(function TimeDigitColumn({
    value,
    onUp,
    onDown,
    label,
    upColor,
    downColor,
    digitStyle,
    boxStyle,
    styles,
}: TimeDigitColumnProps) {
    return (
        <View style={styles.digitCol}>
            <Pressable
                style={styles.chevronBtn}
                onPress={onUp}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${label}`}
            >
                <Ionicons name="chevron-up" size={22} color={upColor} />
            </Pressable>
            <View style={boxStyle}>
                <Text style={digitStyle}>{String(value).padStart(2, "0")}</Text>
            </View>
            <Pressable
                style={styles.chevronBtn}
                onPress={onDown}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${label}`}
            >
                <Ionicons name="chevron-down" size={22} color={downColor} />
            </Pressable>
        </View>
    );
});

// Time picker card
export function InteractiveTimeCard({
    time,
    onChange,
    isSleepStep,
}: {
    time: string;
    onChange: (val: string) => void;
    isSleepStep: boolean;
}) {
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);
    const { hours, minutes, ampm } = useMemo(() => parseTimeString(time), [time]);

    const militaryHour = ampm === "PM" ? (hours % 12) + 12 : hours % 12;
    const displayHour = hours === 0 ? 12 : hours;

    const changeHour = (delta: number) => {
        Haptics.selectionAsync();
        const nextMil = (militaryHour + delta + 24) % 24;
        const nextAmPm = nextMil >= 12 ? "PM" : "AM";
        const nextH = nextMil % 12 === 0 ? 12 : nextMil % 12;
        onChange(formatTimeString(nextH, minutes, nextAmPm));
    };

    const changeMinute = (delta: number) => {
        Haptics.selectionAsync();
        let nextM = minutes + delta;
        let hourDelta = 0;
        if (nextM >= 60) {
            nextM = nextM % 60;
            hourDelta = 1;
        } else if (nextM < 0) {
            nextM = (nextM + 60) % 60;
            hourDelta = -1;
        }

        if (hourDelta !== 0) {
            const nextMil = (militaryHour + hourDelta + 24) % 24;
            const nextAmPm = nextMil >= 12 ? "PM" : "AM";
            const nextH = nextMil % 12 === 0 ? 12 : nextMil % 12;
            onChange(formatTimeString(nextH, nextM, nextAmPm));
        } else {
            onChange(formatTimeString(hours, nextM, ampm));
        }
    };

    const toggleAmPm = () => {
        Haptics.selectionAsync();
        onChange(formatTimeString(hours, minutes, ampm === "AM" ? "PM" : "AM"));
    };

    const up = isSleepStep ? theme.colors.primary : "#1F2937";
    const down = isSleepStep ? "#8B90A0" : "#1F2937";
    const digitStyle = isSleepStep ? styles.digitNight : styles.digitDay;
    const colonStyle = isSleepStep ? styles.colonNight : styles.colonDay;
    const boxStyle = isSleepStep ? styles.digitBoxNight : styles.digitBoxDay;

    return (
        <View style={isSleepStep ? styles.timeCardNight : styles.timeCardDay}>
            <Text style={isSleepStep ? styles.timeLabelNight : styles.timeLabelDay}>Select Time</Text>

            <View style={isSleepStep ? styles.timePillNight : styles.timePillDay}>
                <TimeDigitColumn
                    value={displayHour}
                    onUp={() => changeHour(1)}
                    onDown={() => changeHour(-1)}
                    label="hours"
                    upColor={up}
                    downColor={down}
                    digitStyle={digitStyle}
                    boxStyle={boxStyle}
                    styles={styles}
                />
                <Text style={colonStyle}>:</Text>
                <TimeDigitColumn
                    value={minutes}
                    onUp={() => changeMinute(5)}
                    onDown={() => changeMinute(-5)}
                    label="minutes"
                    upColor={up}
                    downColor={down}
                    digitStyle={digitStyle}
                    boxStyle={boxStyle}
                    styles={styles}
                />

                <Pressable
                    style={isSleepStep ? styles.ampmNight : styles.ampmDay}
                    onPress={toggleAmPm}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle AM or PM, currently ${ampm}`}
                >
                    <Text style={isSleepStep ? styles.ampmTextNight : styles.ampmTextDay}>{ampm}</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── The screen (one component for BOTH steps, so the sky can animate) ───────
export function StepTime({
    mode,
    wakeTime,
    sleepTime,
    onUpdateWake,
    onUpdateSleep,
    onNext,
    onBack,
    onSkip,
    skyProgress,
}: {
    mode: Mode;
    wakeTime: string;
    sleepTime: string;
    onUpdateWake: (val: string) => void;
    onUpdateSleep: (val: string) => void;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    skyProgress: SharedValue<number>;
}) {
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    const [shown, setShown] = useState<Mode>(mode);
    const shownRef = useRef<Mode>(mode);
    const fade = useSharedValue(1);
    const busy = useRef(false);

    const [box, setBox] = useState({ w: SCREEN_WIDTH, h: 0 });
    const [slot, setSlot] = useState({ y: 0, h: 0 });

    const handleSetMode = (nextMode: Mode) => {
        shownRef.current = nextMode;
        setShown(nextMode);
    };

    const handleUnlock = () => {
        busy.current = false;
    };

    useEffect(() => {
        if (mode === shownRef.current) {
            busy.current = false;
            fade.value = withTiming(1, { duration: 250 });
            return;
        }

        busy.current = true;
        const safetyTimer = setTimeout(() => {
            busy.current = false;
        }, 2500);

        fade.value = withTiming(0, { duration: 250 }, (finished) => {
            if (!finished) {
                runOnJS(handleUnlock)();
                return;
            }
            runOnJS(handleSetMode)(mode);
            fade.value = withDelay(
                1250,
                withTiming(1, { duration: 700 }, () => {
                    runOnJS(handleUnlock)();
                })
            );
        });

        return () => {
            clearTimeout(safetyTimer);
        };
    }, [mode, fade]);

    const fadeAnimatedStyle = useAnimatedStyle(() => ({
        opacity: fade.value,
    }));

    const night = shown === "night";
    const time = night ? sleepTime : wakeTime;
    const onUpdateTime = night ? onUpdateSleep : onUpdateWake;
    const sleepInfo = useMemo(
        () => (night ? calculateSleepWindow(sleepTime, wakeTime) : null),
        [night, sleepTime, wakeTime]
    );

    const press = (fn: () => void) => () => {
        if (busy.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        fn();
    };

    return (
        <View
            style={styles.screen}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setBox((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
            }}
        >
            {/* Full-page animated scene, behind everything */}
            {box.h > 0 && slot.h > 0 && <SkyScene progress={skyProgress} box={box} slot={slot} />}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Header */}
                <Animated.View style={[styles.header, fadeAnimatedStyle]}>
                    <View style={styles.headerTop}>
                        <Text style={styles.eyebrow}>
                            {night ? "STEP 2 OF 5 · EVENING REST" : "STEP 1 OF 5 · MORNING ANCHOR"}
                        </Text>
                        <Pressable onPress={onSkip} hitSlop={10}>
                            <Text style={[styles.skip, { color: night ? "#C4C7D0" : "#6B7280" }]}>
                                Skip All
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={[styles.title, { color: night ? "#FFFFFF" : "#0F172A" }]}>
                        {night ? "When do you\nsleep?" : "When do you\nwake up?"}
                    </Text>
                    <Text style={[styles.subtitle, { color: night ? "#A3A7B5" : "#5B6472" }]}>
                        {night
                            ? "True energy and clarity begin with intentional recovery."
                            : "Setting a consistent wake time anchors your daily focus."}
                    </Text>
                </Animated.View>

                {/* Empty slot: the scene's hills are pinned to this spot */}
                <View
                    style={styles.illustrationWrap}
                    onLayout={(e) => {
                        if (busy.current) return;
                        const { y, height } = e.nativeEvent.layout;
                        setSlot((prev) => (prev.y === y && prev.h === height ? prev : { y, h: height }));
                    }}
                />

                {/* Cards */}
                <Animated.View style={[styles.cards, fadeAnimatedStyle]}>
                    <InteractiveTimeCard time={time} onChange={onUpdateTime} isSleepStep={night} />

                    {/* Quick Presets Row */}
                    <View style={night ? styles.presetsRowNight : styles.presetsRowDay}>
                        {(night
                            ? ["10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM", "12:00 AM"]
                            : ["06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM"]
                        ).map((preset) => {
                            const isSelected = preset === time;
                            return (
                                <Pressable
                                    key={preset}
                                    style={[
                                        night ? styles.presetChipNight : styles.presetChipDay,
                                        isSelected &&
                                            (night
                                                ? styles.presetChipActiveNight
                                                : styles.presetChipActiveDay),
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onUpdateTime(preset);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Quick select ${preset}`}
                                >
                                    <Text
                                        style={[
                                            night ? styles.presetTextNight : styles.presetTextDay,
                                            isSelected &&
                                                (night
                                                    ? styles.presetTextActiveNight
                                                    : styles.presetTextActiveDay),
                                        ]}
                                    >
                                        {preset.replace(/^0/, "").replace(/\s*[AP]M/, "")}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {night && sleepInfo ? (
                        <View style={[styles.insightNight, sleepInfo.isWarning && styles.insightNightWarning]}>
                            <View
                                style={[
                                    styles.insightIconNight,
                                    sleepInfo.isWarning && styles.insightIconNightWarning,
                                ]}
                            >
                                <Ionicons
                                    name={sleepInfo.isWarning ? "alert-circle-outline" : "moon-outline"}
                                    size={26}
                                    color={sleepInfo.isWarning ? "#FCD34D" : "#FFFFFF"}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.insightTitleNight}>{sleepInfo.text} Sleep Window</Text>
                                <Text style={styles.insightDescNight}>{sleepInfo.desc}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.insightDay}>
                            <Ionicons name="sunny-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.insightTextDay}>
                                Your morning routine and tasks will naturally branch from this anchor time.
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom bar */}
            <Animated.View style={[styles.bottomBar, fadeAnimatedStyle]}>
                <Pressable style={night ? styles.backNight : styles.backDay} onPress={press(onBack)}>
                    <Ionicons name="arrow-back" size={18} color={night ? "#FFFFFF" : "#111827"} />
                    <Text style={night ? styles.backTextNight : styles.backTextDay}>Back</Text>
                </Pressable>

                <Pressable style={[styles.next, night && styles.nextGlow]} onPress={press(onNext)}>
                    <Text style={styles.nextText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.onPrimary} />
                </Pressable>
            </Animated.View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const makeStyles = (theme: Theme) => {
    const fonts = theme.fonts;
    return StyleSheet.create({
        screen: { flex: 1 }, // transparent: SkyBackground paints behind it
        scrollContent: { flexGrow: 1, paddingBottom: 12 },

        // Header
        header: { paddingHorizontal: 22, paddingTop: Platform.OS === "android" ? 16 : 14 },
        headerTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 34,
            marginBottom: 10,
        },
        eyebrow: {
            fontSize: themeTokens.fonts.size.xs,
            lineHeight: 16,
            fontFamily: fonts.bold,
            color: theme.colors.primaryText,
            letterSpacing: 1.4,
        },
        skip: { fontSize: themeTokens.fonts.size.sm, lineHeight: 18, fontFamily: fonts.medium },
        title: {
            fontSize: 36,
            lineHeight: 42,
            fontFamily: fonts.bold,
            letterSpacing: -0.5,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 15,
            lineHeight: 21,
            fontFamily: fonts.regular,
            maxWidth: 300,
        },

        // Illustration (full-bleed)
        illustrationWrap: {
            width: SCREEN_WIDTH,
            flexGrow: 1,
            flexShrink: 0,
            minHeight: 150,
            maxHeight: 260,
            marginTop: 6,
        },
        cards: { paddingHorizontal: 20, gap: 12, marginTop: 8 },

        // Time card – day
        timeCardDay: {
            backgroundColor: "#FFFFFF",
            borderRadius: 26,
            padding: 16,
            shadowColor: "#E8CBB8",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 18,
            elevation: 4,
        },
        timeLabelDay: {
            fontSize: themeTokens.fonts.size.sm,
            fontFamily: fonts.medium,
            color: "#1F2937",
            textAlign: "center",
            marginBottom: 10,
        },
        timePillDay: {
            backgroundColor: hexToRgba(theme.colors.primary, 0.08),
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
        },

        // Time card – night
        timeCardNight: {
            backgroundColor: "#0D0F17",
            borderRadius: 26,
            padding: 16,
            borderWidth: 1,
            borderColor: "#1B1F2C",
        },
        timeLabelNight: {
            fontSize: themeTokens.fonts.size.sm,
            fontFamily: fonts.medium,
            color: "#C4C7D0",
            textAlign: "center",
            marginBottom: 10,
        },
        timePillNight: {
            backgroundColor: "#0A0C13",
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "#1B1F2C",
        },

        // Digits
        digitCol: { alignItems: "center" },
        chevronBtn: { paddingVertical: 2, paddingHorizontal: 14 },
        digitBoxDay: { paddingHorizontal: 6 },
        digitBoxNight: {
            paddingHorizontal: 10,
            borderRadius: 18,
            backgroundColor: "#0F1119",
        },
        digitDay: {
            fontSize: 50,
            lineHeight: 58,
            fontFamily: fonts.bold,
            color: "#0F172A",
            fontVariant: ["tabular-nums"],
        },
        digitNight: {
            fontSize: 50,
            lineHeight: 58,
            fontFamily: fonts.bold,
            color: "#FFFFFF",
            fontVariant: ["tabular-nums"],
        },
        colonDay: {
            fontSize: 44,
            lineHeight: 50,
            fontFamily: fonts.bold,
            color: "#0F172A",
            marginTop: -4,
        },
        colonNight: {
            fontSize: 44,
            lineHeight: 50,
            fontFamily: fonts.bold,
            color: "#FFFFFF",
            marginTop: -4,
        },
        ampmDay: {
            backgroundColor: hexToRgba(theme.colors.primary, 0.14),
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
        },
        ampmNight: {
            backgroundColor: hexToRgba(theme.colors.primary, 0.22),
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
        },
        ampmTextDay: { fontSize: themeTokens.fonts.size.sm, fontFamily: fonts.bold, color: theme.colors.primaryText },
        ampmTextNight: { fontSize: themeTokens.fonts.size.md, fontFamily: fonts.bold, color: theme.colors.primary },

        // Insight cards
        insightDay: {
            minHeight: 104,
            backgroundColor: hexToRgba(theme.colors.primary, 0.08),
            borderRadius: 22,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
        },
        insightTextDay: {
            flex: 1,
            fontSize: themeTokens.fonts.size.sm,
            lineHeight: 20,
            fontFamily: fonts.regular,
            color: "#374151",
        },
        insightNight: {
            minHeight: 104,
            backgroundColor: "#0D0F17",
            borderRadius: 22,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "#1B1F2C",
        },
        insightIconNight: {
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: "#1B2234",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.12)",
            alignItems: "center",
            justifyContent: "center",
        },
        insightTitleNight: {
            fontSize: themeTokens.fonts.size.lg - 1,
            fontFamily: fonts.bold,
            color: "#FFFFFF",
            marginBottom: 4,
        },
        insightDescNight: {
            fontSize: themeTokens.fonts.size.sm - 1,
            lineHeight: 18,
            fontFamily: fonts.regular,
            color: "#9EA2B0",
        },
        insightNightWarning: {
            borderColor: "#B45309",
            backgroundColor: "#1C140D",
        },
        insightIconNightWarning: {
            backgroundColor: "#2E1A0C",
            borderColor: "#78350F",
        },

        // Quick presets
        presetsRowDay: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            marginTop: 4,
            marginBottom: 8,
            paddingHorizontal: 2,
        },
        presetsRowNight: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            marginTop: 4,
            marginBottom: 8,
            paddingHorizontal: 2,
        },
        presetChipDay: {
            flex: 1,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#EDE3DB",
            alignItems: "center",
            justifyContent: "center",
        },
        presetChipActiveDay: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        presetTextDay: {
            fontSize: themeTokens.fonts.size.xs + 1,
            fontFamily: fonts.medium,
            color: "#4B5563",
        },
        presetTextActiveDay: {
            color: theme.colors.onPrimary,
            fontFamily: fonts.bold,
        },
        presetChipNight: {
            flex: 1,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: "#0D0F17",
            borderWidth: 1,
            borderColor: "#1F2330",
            alignItems: "center",
            justifyContent: "center",
        },
        presetChipActiveNight: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        presetTextNight: {
            fontSize: themeTokens.fonts.size.xs + 1,
            fontFamily: fonts.medium,
            color: "#9EA2B0",
        },
        presetTextActiveNight: {
            color: theme.colors.onPrimary,
            fontFamily: fonts.bold,
        },

        // Bottom bar
        bottomBar: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 14,
        },
        backDay: {
            height: 56,
            paddingHorizontal: 24,
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#EDE3DB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },
        backNight: {
            height: 56,
            paddingHorizontal: 24,
            borderRadius: 22,
            backgroundColor: "#0D0F17",
            borderWidth: 1,
            borderColor: "#1F2330",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },
        backTextDay: { fontSize: themeTokens.fonts.size.md, fontFamily: fonts.bold, color: "#111827" },
        backTextNight: { fontSize: themeTokens.fonts.size.md, fontFamily: fonts.bold, color: "#FFFFFF" },
        next: {
            flex: 1,
            height: 56,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 5,
        },
        nextGlow: {
            shadowOpacity: 0.55,
            shadowRadius: 18,
        },
        nextText: { fontSize: themeTokens.fonts.size.lg - 1, fontFamily: fonts.bold, color: theme.colors.onPrimary },
    });
};