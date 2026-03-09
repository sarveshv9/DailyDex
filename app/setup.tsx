import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InlineTimePicker } from "../components/InlineTimePicker";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { getRoutineImage, RoutineItem } from "../utils/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STORAGE_KEY = "@zen_routine";
const SETUP_KEY = "@zen_setup_complete";

const TEMPLATES = [
    { task: "Wake Up", description: "A wild day appears! Start gently.", imageKey: "wakeup", emoji: "🌅", defaultTime: "07:00 AM" },
    { task: "Hydrate", description: "It's super effective! Drink water.", imageKey: "water", emoji: "💧", defaultTime: "07:15 AM" },
    { task: "Stretch", description: "Limber up to increase evasion.", imageKey: "yoga", emoji: "🧘", defaultTime: "07:30 AM" },
    { task: "Tea", description: "Restore PP and focus your mind.", imageKey: "tea_journal", emoji: "🍵", defaultTime: "08:00 AM" },
    { task: "Breakfast", description: "Boost Attack stat with nutrition.", imageKey: "breakfast", emoji: "🥣", defaultTime: "08:30 AM" },
    { task: "Study", description: "Gain XP in a new skill.", imageKey: "study", emoji: "📚", defaultTime: "09:00 AM" },
    { task: "Lunch", description: "Refuel HP for the afternoon.", imageKey: "lunch", emoji: "🍱", defaultTime: "01:00 PM" },
    { task: "Walk", description: "Encounter nature in the tall grass.", imageKey: "walk", emoji: "🚶", defaultTime: "05:00 PM" },
    { task: "Reflect", description: "Check your progress badge.", imageKey: "reflect", emoji: "📓", defaultTime: "06:00 PM" },
    { task: "Dinner", description: "Share a meal with your party.", imageKey: "dinner", emoji: "🍽️", defaultTime: "07:00 PM" },
    { task: "Wind Down", description: "Lower defense, prepare to rest.", imageKey: "prepare_sleep", emoji: "🌙", defaultTime: "09:00 PM" },
    { task: "Sleep", description: "Save your game and recharge.", imageKey: "sleep", emoji: "😴", defaultTime: "10:00 PM" },
];

type DraftItem = Omit<RoutineItem, "id" | "insertionOrder">;

// ─── Step 1: Pick activities ─────────────────────────────────────────────────
function StepPick({
    selected,
    onToggle,
    onNext,
}: {
    selected: string[];
    onToggle: (task: string) => void;
    onNext: () => void;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <Text style={styles.stepEyebrow}>Step 1 of 2</Text>
                <Text style={styles.stepTitle}>What's in{"\n"}your day?</Text>
                <Text style={styles.stepSubtitle}>
                    Tap to add activities. You can reorder & set times next.
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
            >
                {TEMPLATES.map((tmpl) => {
                    const isOn = selected.includes(tmpl.task);
                    return (
                        <Pressable
                            key={tmpl.task}
                            style={[styles.gridCard, isOn && styles.gridCardOn]}
                            onPress={() => onToggle(tmpl.task)}
                        >
                            <View style={[styles.gridIconWrap, isOn && styles.gridIconWrapOn]}>
                                <Image
                                    source={getRoutineImage(tmpl.imageKey)}
                                    style={styles.gridIcon}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={[styles.gridLabel, isOn && styles.gridLabelOn]}>
                                {tmpl.task}
                            </Text>
                            {isOn && (
                                <View style={styles.checkBadge}>
                                    <Text style={styles.checkMark}>✓</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.bottomBar}>
                <View style={styles.selectionCount}>
                    <Text style={styles.selectionCountText}>
                        {selected.length === 0
                            ? "Select at least one"
                            : `${selected.length} selected`}
                    </Text>
                </View>
                <Pressable
                    style={[styles.nextBtn, selected.length === 0 && styles.nextBtnDisabled]}
                    onPress={onNext}
                    disabled={selected.length === 0}
                >
                    <Text style={styles.nextBtnText}>Set Times →</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Step 2: Set times (inline timeline) ─────────────────────────────────────
function StepTimes({
    routines,
    onUpdateTime,
    onUpdateDesc,
    onRemove,
    onSave,
    onBack,
    saving,
}: {
    routines: DraftItem[];
    onUpdateTime: (index: number, val: string) => void;
    onUpdateDesc: (index: number, val: string) => void;
    onRemove: (index: number) => void;
    onSave: () => void;
    onBack: () => void;
    saving: boolean;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <Text style={styles.stepEyebrow}>Step 2 of 2</Text>
                <Text style={styles.stepTitle}>Time{"\n"}to schedule</Text>
                <Text style={styles.stepSubtitle}>
                    Tap any activity to adjust its time or add notes.
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeline */}
                <View style={styles.timeline}>
                    {routines.map((item, index) => {
                        const tmpl = TEMPLATES.find((t) => t.task === item.task)!;
                        const isOpen = expanded === index;
                        return (
                            <View key={index} style={styles.timelineRow}>
                                {/* Line */}
                                <View style={styles.timelineConnector}>
                                    <View style={styles.timelineDot} />
                                    {index < routines.length - 1 && (
                                        <View style={styles.timelineLine} />
                                    )}
                                </View>

                                {/* Card */}
                                <View style={[styles.timelineCard, isOpen && styles.timelineCardOpen]}>
                                    <Pressable
                                        style={styles.timelineCardTop}
                                        onPress={() => setExpanded(isOpen ? null : index)}
                                    >
                                        <View style={styles.timelineCardLeft}>
                                            <Image
                                                source={getRoutineImage(item.imageKey)}
                                                style={styles.timelineIcon}
                                                resizeMode="contain"
                                            />
                                            <View>
                                                <Text style={styles.timelineTask}>{item.task}</Text>
                                                <Text style={styles.timelineTime}>{item.time}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.timelineCardRight}>
                                            <Text style={styles.timelineChevron}>
                                                {isOpen ? "▲" : "▼"}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    {isOpen && (
                                        <View style={styles.timelineExpanded}>
                                            <View style={styles.expandedDivider} />
                                            <Text style={styles.expandedLabel}>Time</Text>
                                            <View style={styles.timePickerWrap}>
                                                <InlineTimePicker
                                                    value={item.time}
                                                    onChange={(v) => onUpdateTime(index, v)}
                                                />
                                            </View>
                                            <Text style={[styles.expandedLabel, { marginTop: 12 }]}>
                                                Notes (optional)
                                            </Text>
                                            <TextInput
                                                style={styles.notesInput}
                                                value={item.description}
                                                onChangeText={(v) => onUpdateDesc(index, v)}
                                                placeholder="Add personal notes…"
                                                placeholderTextColor={theme.colors.secondary + "60"}
                                                multiline
                                            />
                                            <Pressable
                                                style={styles.removeBtn}
                                                onPress={() => {
                                                    setExpanded(null);
                                                    onRemove(index);
                                                }}
                                            >
                                                <Text style={styles.removeBtnText}>Remove activity</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <Pressable style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={onSave}
                    disabled={saving}
                >
                    <Text style={styles.saveBtnText}>
                        {saving ? "Saving…" : "Start My Day ✦"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function SetupScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [step, setStep] = useState<1 | 2>(1);
    const [saving, setSaving] = useState(false);

    // Step 1 state: set of selected task names
    const [selectedTasks, setSelectedTasks] = useState<string[]>([
        "Wake Up", "Lunch", "Sleep",
    ]);

    // Step 2 state: full draft items (built when moving to step 2)
    const [routines, setRoutines] = useState<DraftItem[]>([]);

    const toggleTask = (task: string) => {
        setSelectedTasks((prev) =>
            prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
        );
    };

    const goToStep2 = () => {
        // Build draft items ordered by their default time, preserving any
        // already-edited data if the user goes back and forth
        const ordered = TEMPLATES.filter((t) => selectedTasks.includes(t.task));
        const existing = new Map(routines.map((r) => [r.task, r]));
        const merged: DraftItem[] = ordered.map((tmpl) =>
            existing.has(tmpl.task)
                ? existing.get(tmpl.task)!
                : {
                    task: tmpl.task,
                    description: tmpl.description,
                    imageKey: tmpl.imageKey,
                    time: tmpl.defaultTime,
                }
        );
        setRoutines(merged);
        setStep(2);
    };

    const goToStep1 = () => setStep(1);

    const updateTime = (index: number, val: string) => {
        const next = [...routines];
        next[index] = { ...next[index], time: val };
        setRoutines(next);
    };

    const updateDesc = (index: number, val: string) => {
        const next = [...routines];
        next[index] = { ...next[index], description: val };
        setRoutines(next);
    };

    const removeItem = (index: number) => {
        const task = routines[index].task;
        setRoutines(routines.filter((_, i) => i !== index));
        setSelectedTasks((prev) => prev.filter((t) => t !== task));
    };

    const handleSave = async () => {
        if (routines.length === 0) return;
        setSaving(true);
        const items: RoutineItem[] = routines.map((r, idx) => ({
            ...r,
            id: Date.now().toString() + idx,
            insertionOrder: idx + 1,
        }));
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(SETUP_KEY, "true");
            router.replace("/(tabs)");
        } catch (e) {
            console.error("Failed to save setup data", e);
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: step === 1 ? "50%" : "100%" }]} />
            </View>

            {step === 1 ? (
                <StepPick
                    selected={selectedTasks}
                    onToggle={toggleTask}
                    onNext={goToStep2}
                />
            ) : (
                <StepTimes
                    routines={routines}
                    onUpdateTime={updateTime}
                    onUpdateDesc={updateDesc}
                    onRemove={removeItem}
                    onSave={handleSave}
                    onBack={goToStep1}
                    saving={saving}
                />
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (theme: Theme) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },

        // Progress
        progressBar: {
            height: 3,
            backgroundColor: `${theme.colors.primary}18`,
        },
        progressFill: {
            height: 3,
            backgroundColor: theme.colors.primary,
            borderRadius: 2,
        },

        // Step headers
        stepHeader: {
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
        },
        stepEyebrow: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            opacity: 0.45,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 6,
        },
        stepTitle: {
            fontSize: 34,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            lineHeight: 40,
            marginBottom: 8,
        },
        stepSubtitle: {
            fontSize: 15,
            fontFamily: theme.fonts.regular,
            color: theme.colors.secondary,
            opacity: 0.75,
            lineHeight: 21,
        },

        // Grid (step 1)
        gridContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            gap: 12,
        },
        gridCard: {
            width: (SCREEN_WIDTH - 56) / 3,
            aspectRatio: 0.95,
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: `${theme.colors.primary}10`,
            padding: 10,
            position: "relative",
        },
        gridCardOn: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}08`,
        },
        gridIconWrap: {
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
        },
        gridIconWrapOn: {
            backgroundColor: `${theme.colors.primary}18`,
        },
        gridIcon: {
            width: 34,
            height: 34,
        },
        gridLabel: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            opacity: 0.6,
            textAlign: "center",
        },
        gridLabelOn: {
            opacity: 1,
            fontFamily: theme.fonts.bold,
        },
        checkBadge: {
            position: "absolute",
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        checkMark: {
            color: theme.colors.white,
            fontSize: 11,
            fontFamily: theme.fonts.bold,
        },

        // Selection count label
        selectionCount: {
            flex: 1,
            justifyContent: "center",
        },
        selectionCountText: {
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.secondary,
            opacity: 0.65,
        },

        // Bottom bar
        bottomBar: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: theme.colors.background,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 32,
            borderTopWidth: 1,
            borderTopColor: `${theme.colors.primary}10`,
        },
        nextBtn: {
            flex: 2,
            backgroundColor: theme.colors.primary,
            borderRadius: 14,
            height: 52,
            justifyContent: "center",
            alignItems: "center",
        },
        nextBtnDisabled: {
            opacity: 0.35,
        },
        nextBtnText: {
            color: theme.colors.white,
            fontSize: 16,
            fontFamily: theme.fonts.bold,
        },
        backBtn: {
            flex: 1,
            backgroundColor: `${theme.colors.primary}10`,
            borderRadius: 14,
            height: 52,
            justifyContent: "center",
            alignItems: "center",
        },
        backBtnText: {
            color: theme.colors.primary,
            fontSize: 15,
            fontFamily: theme.fonts.bold,
        },
        saveBtn: {
            flex: 2,
            backgroundColor: theme.colors.primary,
            borderRadius: 14,
            height: 52,
            justifyContent: "center",
            alignItems: "center",
        },
        saveBtnDisabled: {
            opacity: 0.5,
        },
        saveBtnText: {
            color: theme.colors.white,
            fontSize: 16,
            fontFamily: theme.fonts.bold,
        },

        // Timeline (step 2)
        timeline: {
            paddingTop: 8,
        },
        timelineRow: {
            flexDirection: "row",
            marginBottom: 4,
        },
        timelineConnector: {
            width: 32,
            alignItems: "center",
            paddingTop: 18,
        },
        timelineDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.colors.primary,
            zIndex: 1,
        },
        timelineLine: {
            width: 2,
            flex: 1,
            marginTop: 4,
            backgroundColor: `${theme.colors.primary}18`,
            minHeight: 16,
        },
        timelineCard: {
            flex: 1,
            backgroundColor: theme.colors.white,
            borderRadius: 16,
            marginBottom: 10,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}0C`,
            overflow: "hidden",
        },
        timelineCardOpen: {
            borderColor: `${theme.colors.primary}30`,
        },
        timelineCardTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        timelineCardLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        timelineIcon: {
            width: 36,
            height: 36,
        },
        timelineTask: {
            fontSize: 15,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
        },
        timelineTime: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.secondary,
            opacity: 0.65,
            marginTop: 1,
        },
        timelineCardRight: {},
        timelineChevron: {
            fontSize: 10,
            color: theme.colors.primary,
            opacity: 0.4,
        },

        // Expanded content
        timelineExpanded: {
            paddingHorizontal: 14,
            paddingBottom: 14,
        },
        expandedDivider: {
            height: 1,
            backgroundColor: `${theme.colors.primary}08`,
            marginBottom: 14,
        },
        expandedLabel: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            opacity: 0.5,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 8,
        },
        timePickerWrap: {
            backgroundColor: `${theme.colors.primary}05`,
            borderRadius: 12,
            height: 48,
            justifyContent: "center",
            borderWidth: 1,
            borderColor: `${theme.colors.primary}10`,
        },
        notesInput: {
            backgroundColor: `${theme.colors.primary}05`,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingTop: 12,
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}10`,
            minHeight: 56,
            textAlignVertical: "top",
        },
        removeBtn: {
            marginTop: 12,
            alignSelf: "flex-start",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: "#FF3B3010",
        },
        removeBtnText: {
            color: "#FF3B30",
            fontSize: 13,
            fontFamily: theme.fonts.medium,
        },
    });