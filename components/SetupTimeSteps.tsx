// components/SetupTimeSteps.tsx
// Wake-up (day) and Sleep (night) onboarding steps, rebuilt to match the mockups.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    Line,
    LinearGradient,
    Mask,
    Path,
    RadialGradient,
    Rect,
    Stop,
} from "react-native-svg";
import type { Theme } from "../styles/shared";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "../utils/haptics";
import { timeToMinutes } from "../utils/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const RED = "#FF3B30";
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
    if (hours < 7) {
        desc = "Slightly shorter sleep window. Zen recommends 7–9 hours for sustained cognitive clarity.";
    } else if (hours > 9) {
        desc = "Generous rest window. Plenty of time to recharge your body and nervous system.";
    }
    return { text, desc };
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

function Tree({ x, y, scale = 1, fill }: { x: number; y: number; scale?: number; fill: string }) {
    return (
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
            <Path d="M0 -44 C9 -28 12 -10 12 0 L-12 0 C-12 -10 -9 -28 0 -44 Z" fill={fill} />
        </G>
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
        tree: "#F0B99C",
        rim: "#FFFFFF",
        rimOpacity: 0.55,
        cloud: "#FBE4D5",
    },
    night: {
        back: ["#2C1C40", "#1A1230"],
        mid: ["#1F1533", "#150F25"],
        front: ["#150F24", NIGHT_BG],
        tree: "#0C0817",
        rim: "#FF5A5F",
        rimOpacity: 0.3,
        cloud: "#26193A",
    },
} as const;

// Sky object position (shared by sun and moon)
const SKY_X = 195;
const SKY_Y = 92;
const SKY_R = 50;
const RISE_DISTANCE = 105; // viewBox units the sun/moon travel behind the hills

const RAYS = Array.from({ length: 13 }, (_, i) => {
    const a = ((196 + i * 12) * Math.PI) / 180;
    const r1 = SKY_R + 12;
    const r2 = SKY_R + (i % 2 === 0 ? 34 : 22);
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
            <Circle cx={262} cy={36} r={1.4} fill="#FF6B6B" opacity={0.8} />
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
                <RadialGradient id="moonHalo" cx={SKY_X} cy={SKY_Y} r="115" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#FF4D55" stopOpacity="0.28" />
                    <Stop offset="1" stopColor="#FF4D55" stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="moonBody" x1="0.15" y1="0.05" x2="0.85" y2="1">
                    <Stop offset="0" stopColor="#E8545E" />
                    <Stop offset="0.6" stopColor="#F27468" />
                    <Stop offset="1" stopColor="#FFA37E" />
                </LinearGradient>
                {/* Second circle is cut out of the first → crescent */}
                <Mask id="crescent" x="0" y="0" width="390" height="200">
                    <Rect x="0" y="0" width="390" height="200" fill="white" />
                    <Circle cx={SKY_X + 24} cy={SKY_Y - 16} r={SKY_R - 6} fill="black" />
                </Mask>
            </Defs>
            <Circle cx={SKY_X} cy={SKY_Y} r={115} fill="url(#moonHalo)" />
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

            <Tree x={14} y={106} scale={1.15} fill={p.tree} />
            <Tree x={38} y={100} scale={0.8} fill={p.tree} />
            <Tree x={62} y={97} scale={0.6} fill={p.tree} />
            <Ellipse cx={26} cy={104} rx={18} ry={7} fill={p.tree} />
            <Tree x={344} y={94} scale={0.7} fill={p.tree} />
            <Tree x={372} y={90} scale={1.2} fill={p.tree} />
            <Ellipse cx={362} cy={92} rx={20} ry={7} fill={p.tree} />

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
const CLAMP = { extrapolate: "clamp" } as const;

const themeMix = (p: Animated.Value) =>
    p.interpolate({ inputRange: [THEME_FROM, THEME_TO], outputRange: [0, 1], ...CLAMP });

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
    progress: Animated.Value;
    box: { w: number; h: number };
    slot: { y: number; h: number };
}) {
    const s = box.w / 390;
    const ty = slot.y + slot.h - 200 * s; // design y=200 sits at the bottom of the slot
    const geo: SceneGeo = { w: box.w, h: box.h, s, ty, bottomVu: (box.h - ty) / s + 20 };

    // Sun: climbs, then curves to the top-right and fades out
    const arc = sunArc(s);
    const sunX = progress.interpolate({ inputRange: arc.input, outputRange: arc.x, ...CLAMP });
    const sunY = progress.interpolate({ inputRange: arc.input, outputRange: arc.y, ...CLAMP });
    const sunOpacity = progress.interpolate({
        inputRange: [0, 0.3, 0.55, 1],
        outputRange: [1, 1, 0, 0],
        ...CLAMP,
    });

    // Moon: waits behind the hills, then rises into place
    const rise = moonRise(s);
    const moonY = progress.interpolate({ inputRange: rise.input, outputRange: rise.y, ...CLAMP });
    const moonOpacity = progress.interpolate({
        inputRange: [0, 0.5, 0.6, 1],
        outputRange: [0, 0, 1, 1],
        ...CLAMP,
    });

    const starOpacity = progress.interpolate({
        inputRange: [0, 0.5, 0.9, 1],
        outputRange: [0, 0, 1, 1],
        ...CLAMP,
    });
    const nightMix = themeMix(progress);
    const dayMix = nightMix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

    const fill = StyleSheet.absoluteFill;

    return (
        <SceneCtx.Provider value={geo}>
            <View style={fill} pointerEvents="none">
                <Animated.View style={[fill, { opacity: starOpacity }]}>
                    <Stars />
                </Animated.View>
                <Animated.View style={[fill, { opacity: dayMix }]}>
                    <Clouds mode="day" />
                </Animated.View>
                <Animated.View style={[fill, { opacity: nightMix }]}>
                    <Clouds mode="night" />
                </Animated.View>

                <Animated.View
                    style={[fill, { opacity: sunOpacity, transform: [{ translateX: sunX }, { translateY: sunY }] }]}
                >
                    <Sun />
                </Animated.View>
                <Animated.View style={[fill, { opacity: moonOpacity, transform: [{ translateY: moonY }] }]}>
                    <Moon />
                </Animated.View>

                {/* Day hills stay opaque; night hills fade in on top of them */}
                <View style={fill}>
                    <Hills mode="day" />
                </View>
                <Animated.View style={[fill, { opacity: nightMix }]}>
                    <Hills mode="night" />
                </Animated.View>
            </View>
        </SceneCtx.Provider>
    );
}

// Full-screen background that follows the same progress value.
// Render this as the first child of your SafeAreaView on steps 1–2.
export function SkyBackground({ progress }: { progress: Animated.Value }) {
    const backgroundColor = themeMix(progress).interpolate({
        inputRange: [0, 1],
        outputRange: [DAY_BG, NIGHT_BG],
    });
    return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor }]} />;
}

// Same timing for the progress-bar track in your setup screen
export function skyTrackColor(progress: Animated.Value) {
    return themeMix(progress).interpolate({
        inputRange: [0, 1],
        outputRange: ["#ECDCCE", "#1E212E"],
    });
}

// ─── Time picker card ────────────────────────────────────────────────────────
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
    const styles = useMemo(() => makeStyles(theme.fonts), [theme.fonts]);
    const { hours, minutes, ampm } = useMemo(() => parseTimeString(time), [time]);

    // 0–23 representation, used for all hour math so AM/PM flips correctly
    const militaryHour = ampm === "PM" ? (hours % 12) + 12 : hours % 12;
    const displayHour = isSleepStep ? militaryHour : hours;

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
        if (nextM >= 60) nextM = 0;
        if (nextM < 0) nextM = 55;
        onChange(formatTimeString(hours, nextM, ampm));
    };

    const toggleAmPm = () => {
        Haptics.selectionAsync();
        onChange(formatTimeString(hours, minutes, ampm === "AM" ? "PM" : "AM"));
    };

    const up = isSleepStep ? RED : "#1F2937";
    const down = isSleepStep ? "#8B90A0" : "#1F2937";
    const digitStyle = isSleepStep ? styles.digitNight : styles.digitDay;
    const colonStyle = isSleepStep ? styles.colonNight : styles.colonDay;

    const Column = ({
        value,
        onUp,
        onDown,
    }: {
        value: number;
        onUp: () => void;
        onDown: () => void;
    }) => (
        <View style={styles.digitCol}>
            <Pressable style={styles.chevronBtn} onPress={onUp} hitSlop={12}>
                <Ionicons name="chevron-up" size={22} color={up} />
            </Pressable>
            <View style={isSleepStep ? styles.digitBoxNight : styles.digitBoxDay}>
                <Text style={digitStyle}>{String(value).padStart(2, "0")}</Text>
            </View>
            <Pressable style={styles.chevronBtn} onPress={onDown} hitSlop={12}>
                <Ionicons name="chevron-down" size={22} color={down} />
            </Pressable>
        </View>
    );

    return (
        <View style={isSleepStep ? styles.timeCardNight : styles.timeCardDay}>
            <Text style={isSleepStep ? styles.timeLabelNight : styles.timeLabelDay}>Select Time</Text>

            <View style={isSleepStep ? styles.timePillNight : styles.timePillDay}>
                <Column value={displayHour} onUp={() => changeHour(1)} onDown={() => changeHour(-1)} />
                <Text style={colonStyle}>:</Text>
                <Column value={minutes} onUp={() => changeMinute(5)} onDown={() => changeMinute(-5)} />

                <Pressable
                    style={isSleepStep ? styles.ampmNight : styles.ampmDay}
                    onPress={toggleAmPm}
                    hitSlop={8}
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
    mode: Mode; // "day" = step 1, "night" = step 2
    wakeTime: string;
    sleepTime: string;
    onUpdateWake: (val: string) => void;
    onUpdateSleep: (val: string) => void;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    skyProgress: Animated.Value;
}) {
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme.fonts), [theme.fonts]);

    // `shown` lags behind `mode`: the text/cards fade out, swap, then fade back in
    const [shown, setShown] = useState<Mode>(mode);
    const shownRef = useRef<Mode>(mode);
    const fade = useRef(new Animated.Value(1)).current;
    const busy = useRef(false);
    // `motion` drives the scene on the native thread (smooth); `skyProgress` only
    // drives colours (background, progress-bar track), which need the JS driver.
    const motion = useRef(new Animated.Value(mode === "night" ? 1 : 0)).current;

    const [box, setBox] = useState({ w: SCREEN_WIDTH, h: 0 });
    const [slot, setSlot] = useState({ y: 0, h: 0 });

    useLayoutEffect(() => {
        skyProgress.setValue(mode === "night" ? 1 : 0);
        motion.setValue(mode === "night" ? 1 : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        skyProgress.stopAnimation();
        motion.stopAnimation();
        fade.stopAnimation();

        const target = mode === "night" ? 1 : 0;
        const timing = { toValue: target, duration: 2800, easing: Easing.inOut(Easing.sin) };
        Animated.timing(skyProgress, { ...timing, useNativeDriver: false }).start();
        Animated.timing(motion, { ...timing, useNativeDriver: true }).start();

        if (mode === shownRef.current) {
            busy.current = false;
            Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
            return;
        }

        busy.current = true;
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(
            ({ finished }) => {
                if (!finished) return;
                shownRef.current = mode;
                setShown(mode);
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 700,
                    delay: 1250, // UI returns just as the moon starts rising
                    useNativeDriver: true,
                }).start(() => {
                    busy.current = false;
                });
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const night = shown === "night";
    const time = night ? sleepTime : wakeTime;
    const onUpdateTime = night ? onUpdateSleep : onUpdateWake;
    const sleepInfo = useMemo(
        () => (night ? calculateSleepWindow(sleepTime, wakeTime) : null),
        [night, sleepTime, wakeTime]
    );

    const press = (fn: () => void) => () => {
        if (busy.current) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            {box.h > 0 && slot.h > 0 && <SkyScene progress={motion} box={box} slot={slot} />}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: fade }]}>
                    <View style={styles.headerTop}>
                        <Text style={styles.eyebrow}>
                            {night ? "STEP 2 OF 4 · EVENING REST" : "STEP 1 OF 4 · MORNING ANCHOR"}
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
                        if (busy.current) return; // keep the scene still while it animates
                        const { y, height } = e.nativeEvent.layout;
                        setSlot((prev) => (prev.y === y && prev.h === height ? prev : { y, h: height }));
                    }}
                />

                {/* Cards */}
                <Animated.View style={[styles.cards, { opacity: fade }]}>
                    <InteractiveTimeCard time={time} onChange={onUpdateTime} isSleepStep={night} />

                    {night && sleepInfo ? (
                        <View style={styles.insightNight}>
                            <View style={styles.insightIconNight}>
                                <Ionicons name="sparkles-outline" size={26} color="#FF5A5F" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.insightTitleNight}>{sleepInfo.text} Sleep Window</Text>
                                <Text style={styles.insightDescNight}>{sleepInfo.desc}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.insightDay}>
                            <Ionicons name="sunny-outline" size={24} color={RED} />
                            <Text style={styles.insightTextDay}>
                                Your morning routine and tasks will naturally branch from this anchor time.
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom bar */}
            <Animated.View style={[styles.bottomBar, { opacity: fade }]}>
                <Pressable style={night ? styles.backNight : styles.backDay} onPress={press(onBack)}>
                    <Ionicons name="arrow-back" size={18} color={night ? "#FFFFFF" : "#111827"} />
                    <Text style={night ? styles.backTextNight : styles.backTextDay}>Back</Text>
                </Pressable>

                <Pressable style={[styles.next, night && styles.nextGlow]} onPress={press(onNext)}>
                    <Text style={styles.nextText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
            </Animated.View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const makeStyles = (fonts: Theme["fonts"]) =>
    StyleSheet.create({
        screen: { flex: 1 }, // transparent: SkyBackground paints behind it
        scrollContent: { flexGrow: 1, paddingBottom: 12 },

        // Header
        header: { paddingHorizontal: 22, paddingTop: 14 },
        headerTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            height: 24,
            marginBottom: 10,
        },
        eyebrow: {
            fontSize: 12,
            lineHeight: 16,
            fontFamily: fonts.bold,
            color: RED,
            letterSpacing: 1.4,
        },
        skip: { fontSize: 14, lineHeight: 18, fontFamily: fonts.medium },
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
            fontSize: 14,
            fontFamily: fonts.medium,
            color: "#1F2937",
            textAlign: "center",
            marginBottom: 10,
        },
        timePillDay: {
            backgroundColor: "#FDF0E9",
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
            fontSize: 14,
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
            backgroundColor: "#FBDCCF",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
        },
        ampmNight: {
            backgroundColor: "#2A1219",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
        },
        ampmTextDay: { fontSize: 14, fontFamily: fonts.bold, color: RED },
        ampmTextNight: { fontSize: 16, fontFamily: fonts.bold, color: "#FF4D55" },

        // Insight cards
        insightDay: {
            minHeight: 104,
            backgroundColor: "#FDEAE2",
            borderRadius: 22,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
        },
        insightTextDay: {
            flex: 1,
            fontSize: 14,
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
            backgroundColor: "#1C0F15",
            alignItems: "center",
            justifyContent: "center",
        },
        insightTitleNight: {
            fontSize: 17,
            fontFamily: fonts.bold,
            color: "#FFFFFF",
            marginBottom: 4,
        },
        insightDescNight: {
            fontSize: 13,
            lineHeight: 18,
            fontFamily: fonts.regular,
            color: "#9EA2B0",
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
        backTextDay: { fontSize: 16, fontFamily: fonts.bold, color: "#111827" },
        backTextNight: { fontSize: 16, fontFamily: fonts.bold, color: "#FFFFFF" },
        next: {
            flex: 1,
            height: 56,
            borderRadius: 22,
            backgroundColor: "#EF4444",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: "#EF4444",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 5,
        },
        nextGlow: {
            shadowOpacity: 0.55,
            shadowRadius: 18,
        },
        nextText: { fontSize: 17, fontFamily: fonts.bold, color: "#FFFFFF" },
    });
