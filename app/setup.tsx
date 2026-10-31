import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    BackHandler,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    interpolateColor,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme } from "../styles/shared";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "../utils/haptics";
import { scheduleRoutineNotifications } from "../utils/notifications";
import { getRoutineIcon, RoutineItem, timeToMinutes } from "../utils/utils";
import { StepTime, InteractiveTimeCard, SkyBackground } from "../components/SetupTimeSteps";
import { PokemonWelcome } from "../components/setup/PokemonWelcome";
import { StepPick } from "../components/setup/stepPick/StepPick";
import { TEMPLATES } from "../components/setup/stepPick/templates";
import { ActivityTemplate } from "../components/setup/stepPick/types";
import { ROUTINE_STORAGE_KEY, SETUP_STORAGE_KEY } from "../constants/storageKeys";
import { themeTokens } from "../constants/themeTokens";

const STORAGE_KEY = ROUTINE_STORAGE_KEY;
const SETUP_KEY = SETUP_STORAGE_KEY;

type DraftItem = Omit<RoutineItem, "id" | "insertionOrder"> & { id: string; duration?: number };

// ─── Step 0: Welcome Screen with Pokémon Mascots ───────────────────────────────
function StepWelcome({
    onStart,
    onSkip,
}: {
    onStart: () => void;
    onSkip: () => void;
}) {
    return <PokemonWelcome onStart={onStart} onSkip={onSkip} />;
}

// ─── Step 1 & 2: Day & Night Anchor Screens are imported from ../components/SetupTimeSteps ──

// ─── Step 3 & 4: Focus & Curate Habits are imported from ../components/setup/stepPick/StepPick ──

// ─── Conflict Detection Types & Helper ────────────────────────────────────────
interface ScheduleConflict {
    type: "overlap" | "outside_waking_hours";
    message: string;
    details?: string;
}

function computeRoutineConflicts(
    routines: DraftItem[],
    wakeTimeStr: string,
    sleepTimeStr: string
): Record<string, ScheduleConflict> {
    const conflicts: Record<string, ScheduleConflict> = {};
    if (routines.length === 0) return conflicts;

    const wakeMin = timeToMinutes(wakeTimeStr);
    const rawSleepMin = timeToMinutes(sleepTimeStr);

    // Calculate sleep window boundaries & midpoint
    const isSleepPastMidnight = rawSleepMin <= wakeMin;
    let sleepDuration = 0;
    let sleepMidpoint = 0;

    if (isSleepPastMidnight) {
        sleepDuration = wakeMin - rawSleepMin;
        sleepMidpoint = (rawSleepMin + Math.floor(sleepDuration / 2)) % 1440;
    } else {
        sleepDuration = (1440 - rawSleepMin) + wakeMin;
        sleepMidpoint = (rawSleepMin + Math.floor(sleepDuration / 2)) % 1440;
    }

    const effectiveSleepMin = isSleepPastMidnight ? rawSleepMin + 1440 : rawSleepMin;

    // 1. Outside waking hours check (for non-anchor items)
    for (const item of routines) {
        const isAnchor =
            item.task.toLowerCase() === "wake up" ||
            item.task.toLowerCase() === "sleep";

        if (isAnchor) continue;

        const rawMin = timeToMinutes(item.time);
        const duration = item.duration || 30;

        let isSleepingHour = false;
        let isCloserToWake = false;

        if (isSleepPastMidnight) {
            // Sleeping window is [rawSleepMin, wakeMin)
            if (rawMin >= rawSleepMin && rawMin < wakeMin) {
                isSleepingHour = true;
                isCloserToWake = rawMin >= sleepMidpoint;
            }
        } else {
            // Sleeping window is [rawSleepMin, 1440) OR [0, wakeMin)
            if (rawMin >= rawSleepMin || rawMin < wakeMin) {
                isSleepingHour = true;
                // Midpoint is in early morning [0, wakeMin)
                if (rawMin >= sleepMidpoint && rawMin < wakeMin) {
                    isCloserToWake = true;
                } else {
                    isCloserToWake = false;
                }
            }
        }

        if (isSleepingHour) {
            if (isCloserToWake) {
                conflicts[item.id] = {
                    type: "outside_waking_hours",
                    message: "Before wake-up",
                    details: `Scheduled for ${item.time}, before your ${wakeTimeStr} wake-up.`,
                };
            } else {
                conflicts[item.id] = {
                    type: "outside_waking_hours",
                    message: "Past bedtime",
                    details: `Scheduled for ${item.time}, after your ${sleepTimeStr} bedtime.`,
                };
            }
            continue;
        }

        // Check if task starts in waking window but ends after bedtime
        let normalizedTaskStart = rawMin;
        if (rawMin < wakeMin) {
            normalizedTaskStart += 1440;
        }
        const normalizedTaskEnd = normalizedTaskStart + duration;

        if (normalizedTaskEnd > effectiveSleepMin) {
            conflicts[item.id] = {
                type: "outside_waking_hours",
                message: "Overlaps bedtime",
                details: `Runs past your ${sleepTimeStr} bedtime.`,
            };
        }
    }

    // 2. Overlapping activities check between items in chronological waking flow
    const wakingItems = routines.map((item) => {
        const rawMin = timeToMinutes(item.time);
        const elapsed = (rawMin - wakeMin + 1440) % 1440;
        return {
            ...item,
            rawMin,
            elapsed,
            duration: item.duration || 30,
        };
    });

    wakingItems.sort((a, b) => a.elapsed - b.elapsed);

    for (let i = 0; i < wakingItems.length - 1; i++) {
        const current = wakingItems[i];
        const next = wakingItems[i + 1];

        // Check if current item ends after next begins
        if (
            current.elapsed + current.duration > next.elapsed &&
            next.elapsed > current.elapsed
        ) {
            const overlapMins = current.elapsed + current.duration - next.elapsed;
            if (!conflicts[current.id]) {
                conflicts[current.id] = {
                    type: "overlap",
                    message: `Overlaps with ${next.task}`,
                    details: `Ends ${overlapMins}m after ${next.task} begins (${next.time}).`,
                };
            }
            if (!conflicts[next.id]) {
                conflicts[next.id] = {
                    type: "overlap",
                    message: `Overlaps with ${current.task}`,
                    details: `Starts before ${current.task} completes (${current.duration}m).`,
                };
            }
        }
    }

    return conflicts;
}

function getRecurringPreviewTimes(
    item: DraftItem,
    hoursInterval: number,
    wakeTimeStr: string,
    sleepTimeStr: string
): string[] {
    const wakeMin = timeToMinutes(wakeTimeStr);
    let sleepMin = timeToMinutes(sleepTimeStr);
    if (sleepMin <= wakeMin) sleepMin += 24 * 60;

    let itemMin = timeToMinutes(item.time);
    if (itemMin < wakeMin) itemMin += 24 * 60;

    let cur = itemMin + hoursInterval * 60;
    const times: string[] = [];

    while (cur < sleepMin) {
        const norm = cur % (24 * 60);
        let h = Math.floor(norm / 60);
        const m = norm % 60;
        const ampm = h >= 12 ? "PM" : "AM";
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        times.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`);
        cur += hoursInterval * 60;
    }
    return times;
}

// ─── Step 5: Finalize Times & Schedule ────────────────────────────────────────
function StepTimes({
    routines,
    wakeTime,
    sleepTime,
    onUpdateTime,
    onUpdateDesc,
    onUpdateDuration,
    onRemove,
    onMakeRecurring,
    onSave,
    onBack,
    onSkip,
    saving,
}: {
    routines: DraftItem[];
    wakeTime: string;
    sleepTime: string;
    onUpdateTime: (id: string, val: string) => void;
    onUpdateDesc: (id: string, val: string) => void;
    onUpdateDuration: (id: string, duration: number) => void;
    onRemove: (id: string) => void;
    onMakeRecurring: (id: string, hoursInterval: number) => void;
    onSave: () => void;
    onBack: () => void;
    onSkip: () => void;
    saving: boolean;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [recurringModalItem, setRecurringModalItem] = useState<DraftItem | null>(null);

    const conflicts = useMemo(
        () => computeRoutineConflicts(routines, wakeTime, sleepTime),
        [routines, wakeTime, sleepTime]
    );

    const recurringPreviews = useMemo(() => {
        if (!recurringModalItem) return {};
        const res: Record<number, string[]> = {};
        for (const h of [1, 2, 3, 4]) {
            res[h] = getRecurringPreviewTimes(recurringModalItem, h, wakeTime, sleepTime);
        }
        return res;
    }, [recurringModalItem, wakeTime, sleepTime]);

    const DURATION_CHOICES = [15, 30, 45, 60];

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>Step 5 of 5 · Schedule</Text>
                    <Pressable
                        onPress={onSkip}
                        style={styles.skipBtn}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Skip schedule customization"
                    >
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
                <Text style={styles.stepTitle}>Your Zen Schedule</Text>
                <Text style={styles.stepSubtitle}>
                    Review your daily timeline. Habits flow naturally from dawn to dusk.
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Notification Primer Card */}
                <View style={styles.notificationPrimerCard}>
                    <View style={styles.notificationPrimerIconWrap}>
                        <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.notificationPrimerTitle}>Peaceful Prompts</Text>
                        <Text style={styles.notificationPrimerDesc}>
                            Zen gently notifies you at the start of each habit so you never have to watch the clock.
                        </Text>
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.timeline}>
                    {routines.map((item, index) => {
                        const isOpen = expandedId === item.id;
                        const duration = item.duration || 30;
                        const conflict = conflicts[item.id];

                        return (
                            <View key={item.id} style={styles.timelineRow}>
                                <View style={styles.timelineConnector}>
                                    <View style={styles.timelineDot} />
                                    {index < routines.length - 1 && (
                                        <View style={styles.timelineLine} />
                                    )}
                                </View>

                                <View
                                    style={[
                                        styles.timelineCard,
                                        isOpen && styles.timelineCardOpen,
                                        Boolean(conflict) && styles.timelineCardConflict,
                                    ]}
                                >
                                    <Pressable
                                        style={styles.timelineCardTop}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setExpandedId(isOpen ? null : item.id);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${item.task} at ${item.time}, ${duration} minutes${
                                            conflict ? `, note: ${conflict.message}` : ""
                                        }. Tap to ${isOpen ? "collapse" : "expand"}`}
                                    >
                                        <View style={styles.timelineCardLeft}>
                                            <View style={styles.timelineCardIconWrap}>
                                                <Ionicons
                                                    name={getRoutineIcon(item.imageKey)}
                                                    size={24}
                                                    color={theme.colors.primary}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.timelineTask}>{item.task}</Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                                                    <Text style={styles.timelineTime}>{item.time}</Text>
                                                    <Text style={styles.timelineDurationDot}>·</Text>
                                                    <Text style={styles.timelineDurationText}>{duration}m</Text>
                                                    {conflict && (
                                                        <View style={styles.conflictBadge}>
                                                            <Ionicons
                                                                name={conflict.type === "overlap" ? "alert-circle" : "moon"}
                                                                size={12}
                                                                color={theme.isDarkMode ? "#FCD34D" : "#D97706"}
                                                            />
                                                            <Text style={styles.conflictBadgeText}>
                                                                {conflict.message}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.timelineCardRight}>
                                            <Ionicons
                                                name={isOpen ? "chevron-up" : "chevron-down"}
                                                size={18}
                                                color={theme.colors.textSecondary}
                                            />
                                        </View>
                                    </Pressable>

                                    {isOpen && (
                                        <View style={styles.timelineExpanded}>
                                            {conflict && (
                                                <View style={styles.conflictDetailCard}>
                                                    <Ionicons
                                                        name={conflict.type === "overlap" ? "alert-circle-outline" : "moon-outline"}
                                                        size={16}
                                                        color={theme.isDarkMode ? "#FCD34D" : "#D97706"}
                                                        style={{ marginTop: 1 }}
                                                    />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.conflictDetailTitle}>
                                                            {conflict.type === "overlap" ? "Schedule Overlap" : "Rest Window Note"}
                                                        </Text>
                                                        <Text style={styles.conflictDetailText}>
                                                            {conflict.details}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}
                                            <View style={styles.expandedDivider} />
                                            
                                            <Text style={styles.expandedLabel}>Adjust Start Time</Text>
                                            <View style={styles.timePickerWrap}>
                                                <View style={{ paddingVertical: 10 }}>
                                                    <InteractiveTimeCard
                                                        time={item.time}
                                                        onChange={(newT: string) => onUpdateTime(item.id, newT)}
                                                        isSleepStep={false}
                                                    />
                                                </View>
                                            </View>

                                            <Text style={[styles.expandedLabel, { marginTop: 18 }]}>
                                                Duration
                                            </Text>
                                            <View style={styles.durationPillsRow}>
                                                {DURATION_CHOICES.map((mins) => {
                                                    const isDurActive = duration === mins;
                                                    return (
                                                        <Pressable
                                                            key={mins}
                                                            style={[
                                                                styles.durationPill,
                                                                isDurActive && styles.durationPillActive,
                                                            ]}
                                                            onPress={() => {
                                                                Haptics.selectionAsync();
                                                                onUpdateDuration(item.id, mins);
                                                            }}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`${mins} minutes`}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.durationPillText,
                                                                    isDurActive && styles.durationPillTextActive,
                                                                ]}
                                                            >
                                                                {mins}m
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>

                                            <Text style={[styles.expandedLabel, { marginTop: 18 }]}>
                                                Notes (optional)
                                            </Text>
                                            <TextInput
                                                style={styles.notesInput}
                                                value={item.description}
                                                onChangeText={(v) => onUpdateDesc(item.id, v)}
                                                placeholder="Add intention or instructions…"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                multiline
                                                accessibilityLabel={`Notes for ${item.task}`}
                                            />

                                            {item.task !== "Wake Up" && item.task !== "Sleep" && (
                                                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                                                    <Pressable
                                                        style={[styles.actionBtnSecondary, { flex: 1 }]}
                                                        onPress={() => setRecurringModalItem(item)}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Repeat ${item.task}`}
                                                    >
                                                        <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                                                        <Text style={styles.actionBtnSecondaryText}>Repeat</Text>
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.actionBtnDestructive, { flex: 1 }]}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setExpandedId(null);
                                                            onRemove(item.id);
                                                        }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Remove ${item.task}`}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color={themeTokens.colors.danger} />
                                                        <Text style={styles.actionBtnDestructiveText}>Remove</Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Recurring Modal */}
            {recurringModalItem !== null && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 200, elevation: 200 }]}>
                    <Pressable style={styles.previewBackdrop} onPress={() => setRecurringModalItem(null)}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : undefined}
                            style={{ width: "100%", alignItems: "center", justifyContent: "center" }}
                        >
                            <Pressable style={styles.previewCard} onPress={(e) => e.stopPropagation()}>
                                <Text style={styles.previewTitle}>Repeat {recurringModalItem.task}</Text>
                                <Text style={styles.previewDescription}>
                                    Automatically repeat this habit throughout your daytime hours until sleep.
                                </Text>

                                <View style={{ width: "100%", gap: 10 }}>
                                    {[1, 2, 3, 4].map((hours) => {
                                        const times = recurringPreviews[hours] || [];
                                        const count = times.length;
                                        return (
                                            <Pressable
                                                key={hours}
                                                style={styles.recurringOptionBtn}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    onMakeRecurring(recurringModalItem.id, hours);
                                                    setRecurringModalItem(null);
                                                }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Repeat every ${hours} hour${hours > 1 ? "s" : ""}, adds ${count} sessions`}
                                            >
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <Text style={styles.recurringOptionText}>
                                                        Every {hours} hour{hours > 1 ? "s" : ""}
                                                    </Text>
                                                    <Text style={styles.recurringOptionPreviewText}>
                                                        {count > 0
                                                            ? `Adds ${count} session${count > 1 ? "s" : ""}: ${times.slice(0, 3).join(", ")}${count > 3 ? "…" : ""}`
                                                            : "No daytime slots before bedtime"}
                                                    </Text>
                                                </View>
                                                <Ionicons
                                                    name="add-circle"
                                                    size={20}
                                                    color={theme.colors.primary}
                                                />
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </Pressable>
                        </KeyboardAvoidingView>
                    </Pressable>
                </View>
            )}

            <View style={styles.bottomBar}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onBack();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Back to previous step"
                >
                    <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onSave();
                    }}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={saving ? "Creating Rhythm…" : "Finish Setup"}
                >
                    <Text style={styles.saveBtnText}>
                        {saving ? "Creating Rhythm…" : "Finish Setup"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.onPrimary} />
                </Pressable>
            </View>
        </View>
    );
}

// ─── Main Setup Screen ────────────────────────────────────────────────────────
export default function SetupScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
    const [saving, setSaving] = useState(false);
    const skyProgress = useSharedValue(0);

    useEffect(() => {
        if (step === 1) {
            skyProgress.value = withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) });
        } else if (step === 2) {
            skyProgress.value = withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) });
        }
    }, [step, skyProgress]);

    // Android hardware back button handler
    useEffect(() => {
        const onBackPress = () => {
            if (step > 0) {
                setStep((prev) => (prev - 1) as 0 | 1 | 2 | 3 | 4 | 5);
                return true;
            }
            return false;
        };

        const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => sub.remove();
    }, [step]);

    // Initial state with default wake/sleep times
    const [wakeTime, setWakeTime] = useState("07:00 AM");
    const [sleepTime, setSleepTime] = useState("10:30 PM");
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [routines, setRoutines] = useState<DraftItem[]>([]);
    const [customActivities, setCustomActivities] = useState<ActivityTemplate[]>([]);
    const [skipModalVisible, setSkipModalVisible] = useState(false);

    const addCustomActivity = (activity: ActivityTemplate) => {
        setCustomActivities((prev) => [...prev, activity]);
        setSelectedTasks((prev) => [...prev, activity.task]);
    };

    const toggleTask = (task: string) => {
        setSelectedTasks((prev) =>
            prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
        );
    };

    const saveAndExit = async (items: RoutineItem[]) => {
        setSaving(true);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(SETUP_KEY, "true");
        } catch (e) {
            console.error("Failed to save setup data", e);
            Alert.alert("Setup Error", "Failed to save your routine. Please try again.");
            setSaving(false);
            return;
        }

        scheduleRoutineNotifications(items).catch((err) => {
            console.warn("Could not schedule routine notifications:", err);
        });

        setSaving(false);
        router.replace("/(tabs)");
    };

    const saveMinimal = () => {
        const minimalItems: RoutineItem[] = [
            {
                task: "Wake Up",
                description: "Start your day with a clear mind.",
                imageKey: "wakeup",
                time: wakeTime,
                id: "skip-wakeup",
                insertionOrder: 1,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                duration: 30,
            },
            {
                task: "Sleep",
                description: "Rest deeply and recharge.",
                imageKey: "sleep",
                time: sleepTime,
                id: "skip-sleep",
                insertionOrder: 2,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                duration: 30,
            },
        ];
        saveAndExit(minimalItems);
    };

    const saveWithHabits = () => {
        const allTemplates = [...TEMPLATES, ...customActivities];
        const tasksWithAnchors = Array.from(new Set(["Wake Up", ...selectedTasks, "Sleep"]));
        const merged = tasksWithAnchors.map((t, idx) => {
            const tmpl: ActivityTemplate = allTemplates.find((x) => x.task.toLowerCase() === t.toLowerCase()) || {
                task: t,
                description: "",
                imageKey: "breathe",
                defaultTime: "09:00 AM",
                category: "morning",
                minutes: 30,
            };

            let time = tmpl.defaultTime;
            if (t === "Wake Up") time = wakeTime;
            if (t === "Sleep") time = sleepTime;

            return {
                id: Date.now().toString() + idx,
                task: tmpl.task,
                description: tmpl.description,
                imageKey: tmpl.imageKey,
                time: time,
                insertionOrder: idx + 1,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                duration: tmpl.minutes || 30,
            };
        });

        merged.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        saveAndExit(merged);
    };

    const handleSkipAll = () => {
        setSkipModalVisible(true);
    };

    const goToStep5 = () => {
        const allTemplates = [...TEMPLATES, ...customActivities];
        const tasksWithAnchors = Array.from(new Set(["Wake Up", ...selectedTasks, "Sleep"]));
        const merged: DraftItem[] = tasksWithAnchors.map((t, idx) => {
            const tmpl: ActivityTemplate = allTemplates.find((x) => x.task.toLowerCase() === t.toLowerCase()) || {
                task: t,
                description: "",
                imageKey: "breathe",
                defaultTime: "09:00 AM",
                category: "morning",
                minutes: 30,
            };

            let time = tmpl.defaultTime;
            if (t === "Wake Up") time = wakeTime;
            if (t === "Sleep") time = sleepTime;

            return {
                id: `draft-${t.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${idx}`,
                task: tmpl.task,
                description: tmpl.description,
                imageKey: tmpl.imageKey,
                time: time,
                duration: tmpl.minutes || 30,
            };
        });

        // Chronologically sort routines
        merged.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        setRoutines(merged);
        setStep(5);
    };

    const updateRoutineTime = (id: string, val: string) => {
        const next = routines.map((r) => (r.id === id ? { ...r, time: val } : r));
        const updated = next.find((r) => r.id === id);
        if (updated?.task === "Wake Up") setWakeTime(val);
        if (updated?.task === "Sleep") setSleepTime(val);
        // Do not immediately re-sort while user is editing to prevent cards jumping
        setRoutines(next);
    };

    const updateRoutineDesc = (id: string, val: string) => {
        setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, description: val } : r)));
    };

    const updateRoutineDuration = (id: string, duration: number) => {
        setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, duration } : r)));
    };

    const removeItem = (id: string) => {
        const item = routines.find((r) => r.id === id);
        if (!item) return;
        setRoutines((prev) => prev.filter((r) => r.id !== id));
        setSelectedTasks((prev) => prev.filter((t) => t !== item.task));
    };

    const handleMakeRecurring = (id: string, hoursInterval: number) => {
        if (hoursInterval <= 0) return;
        const item = routines.find((r) => r.id === id);
        if (!item) return;

        const wakeTimeMinutes = timeToMinutes(wakeTime);
        let sleepTimeMinutes = timeToMinutes(sleepTime);
        if (sleepTimeMinutes <= wakeTimeMinutes) {
            sleepTimeMinutes += 24 * 60;
        }

        let itemTimeMinutes = timeToMinutes(item.time);
        if (itemTimeMinutes < wakeTimeMinutes) {
            itemTimeMinutes += 24 * 60;
        }

        let currentTimeMinutes = itemTimeMinutes + hoursInterval * 60;
        const newItems: DraftItem[] = [];

        while (currentTimeMinutes < sleepTimeMinutes) {
            const normalizedMinutes = currentTimeMinutes % (24 * 60);
            let h = Math.floor(normalizedMinutes / 60);
            const m = normalizedMinutes % 60;
            const ampm = h >= 12 ? "PM" : "AM";

            if (h === 0) h = 12;
            else if (h > 12) h -= 12;

            const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;

            newItems.push({
                ...item,
                id: `recurring-${item.task.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${timeStr.replace(/[^a-z0-9]/g, '_')}`,
                time: timeStr,
            });

            currentTimeMinutes += hoursInterval * 60;
        }

        if (newItems.length > 0) {
            const next = [...routines, ...newItems].sort(
                (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
            );
            setRoutines(next);
        }
    };

    const handleSave = async () => {
        if (routines.length === 0) return;
        setSaving(true);
        const sorted = [...routines].sort(
            (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
        );
        const items: RoutineItem[] = sorted.map((r, idx) => ({
            ...r,
            id: Date.now().toString() + idx,
            insertionOrder: idx + 1,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            duration: r.duration || 30,
        }));

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(SETUP_KEY, "true");
        } catch (e) {
            console.error("Failed to save setup data", e);
            Alert.alert("Setup Error", "Failed to save your routine. Please try again.");
            setSaving(false);
            return;
        }

        // Schedule notifications safely in background without blocking user
        scheduleRoutineNotifications(items).catch((err) => {
            console.warn("Could not schedule routine notifications:", err);
        });

        router.replace("/(tabs)");
    };

    const progressBarAnimatedStyle = useAnimatedStyle(() => {
        'worklet';
        if (step === 0) return { backgroundColor: "transparent" };
        if (step === 1 || step === 2) {
            const bg = interpolateColor(skyProgress.value, [0.25, 0.75], ["#ECDCCE", "#1E212E"]);
            return { backgroundColor: bg };
        }
        return { backgroundColor: theme.colors.primarySoft };
    });

    return (
        <SafeAreaView
            style={[
                styles.safeArea,
            ]}
        >
            {(step === 1 || step === 2) && (
                <SkyBackground progress={skyProgress} />
            )}

            {step > 0 && (
                <Animated.View
                    style={[
                        styles.progressBar,
                        progressBarAnimatedStyle,
                    ]}
                >
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(step / 5) * 100}%` },
                        ]}
                    />
                </Animated.View>
            )}

            {step === 0 && (
                <StepWelcome
                    onStart={() => setStep(1)}
                    onSkip={handleSkipAll}
                />
            )}

            {(step === 1 || step === 2) && (
                <StepTime
                    mode={step === 1 ? "day" : "night"}
                    wakeTime={wakeTime}
                    sleepTime={sleepTime}
                    onUpdateWake={setWakeTime}
                    onUpdateSleep={setSleepTime}
                    onNext={() => {
                        if (step === 1) {
                            setStep(2);
                        } else {
                            if (wakeTime.trim().toLowerCase() === sleepTime.trim().toLowerCase()) {
                                Alert.alert(
                                    "Identical Times",
                                    "Your wake time and sleep time cannot be the same. Please set a restorative sleep window."
                                );
                                return;
                            }
                            setStep(3);
                        }
                    }}
                    onBack={() => {
                        if (step === 1) setStep(0);
                        else setStep(1);
                    }}
                    onSkip={handleSkipAll}
                    skyProgress={skyProgress}
                />
            )}

            {step === 3 && (
                <StepPick
                    phase="start"
                    selected={selectedTasks}
                    onToggle={toggleTask}
                    onSetSelected={setSelectedTasks}
                    onAddCustom={addCustomActivity}
                    onNext={() => setStep(4)}
                    onBack={() => setStep(2)}
                    onSkip={handleSkipAll}
                    customActivities={customActivities}
                />
            )}

            {step === 4 && (
                <StepPick
                    phase="refine"
                    selected={selectedTasks}
                    onToggle={toggleTask}
                    onSetSelected={setSelectedTasks}
                    onAddCustom={addCustomActivity}
                    onNext={goToStep5}
                    onBack={() => setStep(3)}
                    onSkip={handleSkipAll}
                    customActivities={customActivities}
                />
            )}

            {step === 5 && (
                <StepTimes
                    routines={routines}
                    wakeTime={wakeTime}
                    sleepTime={sleepTime}
                    onUpdateTime={updateRoutineTime}
                    onUpdateDesc={updateRoutineDesc}
                    onUpdateDuration={updateRoutineDuration}
                    onRemove={removeItem}
                    onMakeRecurring={handleMakeRecurring}
                    onSave={handleSave}
                    onBack={() => setStep(4)}
                    onSkip={handleSkipAll}
                    saving={saving}
                />
            )}

            {/* Skip Confirmation Modal */}
            <Modal
                visible={skipModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSkipModalVisible(false)}
            >
                <Pressable
                    style={styles.skipModalBackdrop}
                    onPress={() => setSkipModalVisible(false)}
                >
                    <Pressable style={styles.skipModalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.skipModalIconWrap}>
                            <Ionicons
                                name={selectedTasks.length > 0 ? "sparkles-outline" : "information-circle-outline"}
                                size={28}
                                color={theme.colors.primary}
                            />
                        </View>

                        <Text style={styles.skipModalTitle}>
                            {selectedTasks.length > 0 ? "Save Selected Habits?" : "Skip Setup?"}
                        </Text>
                        <Text style={styles.skipModalSubtitle}>
                            {selectedTasks.length > 0
                                ? `You've selected ${selectedTasks.length} habit${
                                      selectedTasks.length > 1 ? "s" : ""
                                  }. Would you like to keep them in your schedule or start with just your wake and sleep anchors?`
                                : `We'll set up your daily rhythm with Wake Up (${wakeTime}) and Sleep (${sleepTime}). You can customize anytime.`}
                        </Text>

                        <View style={styles.skipModalActions}>
                            {selectedTasks.length > 0 ? (
                                <>
                                    <Pressable
                                        style={styles.skipModalPrimaryBtn}
                                        onPress={() => {
                                            setSkipModalVisible(false);
                                            saveWithHabits();
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Save with habits"
                                    >
                                        <Text style={styles.skipModalPrimaryBtnText}>
                                            Save With Habits
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={styles.skipModalSecondaryBtn}
                                        onPress={() => {
                                            setSkipModalVisible(false);
                                            saveMinimal();
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Discard habits and keep anchors only"
                                    >
                                        <Text style={styles.skipModalSecondaryBtnText}>
                                            Discard (Anchors Only)
                                        </Text>
                                    </Pressable>
                                </>
                            ) : (
                                <Pressable
                                    style={styles.skipModalPrimaryBtn}
                                    onPress={() => {
                                        setSkipModalVisible(false);
                                        saveMinimal();
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Confirm skip setup"
                                >
                                    <Text style={styles.skipModalPrimaryBtnText}>
                                        Yes, Skip Setup
                                    </Text>
                                </Pressable>
                            )}

                            <Pressable
                                style={styles.skipModalCancelBtn}
                                onPress={() => setSkipModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Keep editing setup"
                            >
                                <Text style={styles.skipModalCancelText}>Keep Editing</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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

        progressBar: {
            height: 4,
            marginHorizontal: 22,
            marginTop: 8,
            marginBottom: 6,
            borderRadius: 2,
            backgroundColor: theme.colors.primarySoft,
            overflow: "hidden",
        },
        progressFill: {
            height: 4,
            backgroundColor: theme.colors.primary,
            borderRadius: 2,
        },

        // ─── Common Step Header ──────────────────
        stepHeader: {
            paddingHorizontal: 22,
            paddingTop: Platform.OS === "android" ? 16 : 14,
            paddingBottom: 8,
        },
        headerTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 34,
            marginBottom: 10,
        },
        stepEyebrow: {
            fontSize: themeTokens.fonts.size.xs,
            lineHeight: 16,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            letterSpacing: 1.4,
            textTransform: "uppercase",
        },
        skipBtn: {
            justifyContent: "center",
        },
        skipText: {
            fontSize: themeTokens.fonts.size.sm,
            lineHeight: 18,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
        stepTitle: {
            fontSize: themeTokens.fonts.size.display + 2,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 36,
            marginBottom: 4,
        },
        stepSubtitle: {
            fontSize: themeTokens.fonts.size.sm,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            lineHeight: 19,
        },

        // ─── Notification Primer Card (Step 4) ───
        notificationPrimerCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: theme.colors.surface,
            padding: 16,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            marginBottom: 18,
        },
        notificationPrimerIconWrap: {
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: theme.colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
        },
        notificationPrimerTitle: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        notificationPrimerDesc: {
            fontSize: 12,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            lineHeight: 16,
        },

        // ─── Timeline (Step 4) ───────────────────
        timeline: {
            paddingLeft: 4,
        },
        timelineRow: {
            flexDirection: "row",
            marginBottom: 12,
        },
        timelineConnector: {
            width: 28,
            alignItems: "center",
            paddingTop: 18,
        },
        timelineDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.colors.primary,
        },
        timelineLine: {
            flex: 1,
            width: 2,
            backgroundColor: theme.colors.primarySoft,
            marginTop: 4,
            minHeight: 40,
        },
        timelineCard: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            overflow: "hidden",
        },
        timelineCardOpen: {
            borderColor: theme.colors.primary,
        },
        timelineCardConflict: {
            borderColor: theme.isDarkMode ? "#B45309" : "#F59E0B",
        },
        conflictBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: theme.isDarkMode ? "#2D1E0F" : "#FEF3C7",
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.isDarkMode ? "#78350F" : "#FCD34D",
        },
        conflictBadgeText: {
            fontSize: 10.5,
            fontFamily: theme.fonts.bold,
            color: theme.isDarkMode ? "#FCD34D" : "#92400E",
        },
        conflictDetailCard: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            backgroundColor: theme.isDarkMode ? "#24170A" : "#FFFBEB",
            borderWidth: 1,
            borderColor: theme.isDarkMode ? "#78350F" : "#FDE68A",
            padding: 12,
            borderRadius: 12,
            marginBottom: 14,
        },
        conflictDetailTitle: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            color: theme.isDarkMode ? "#FCD34D" : "#92400E",
            marginBottom: 2,
        },
        conflictDetailText: {
            fontSize: 11.5,
            fontFamily: theme.fonts.regular,
            color: theme.isDarkMode ? "#FDE68A" : "#B45309",
            lineHeight: 16,
        },
        timelineCardTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 14,
        },
        timelineCardLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flex: 1,
        },
        timelineCardIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
        },
        timelineTask: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        timelineTime: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
        timelineDurationDot: {
            fontSize: 12,
            color: theme.colors.textSecondary,
        },
        timelineDurationText: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primaryText,
        },
        timelineCardRight: {
            paddingLeft: 8,
        },
        timelineExpanded: {
            paddingHorizontal: 14,
            paddingBottom: 14,
        },
        expandedDivider: {
            height: 1,
            backgroundColor: theme.colors.divider,
            marginBottom: 12,
        },
        expandedLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        timePickerWrap: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: 14,
            paddingVertical: 6,
        },
        durationPillsRow: {
            flexDirection: "row",
            gap: 8,
            marginBottom: 4,
        },
        durationPill: {
            flex: 1,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        durationPillActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        durationPillText: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
        },
        durationPillTextActive: {
            color: "#FFFFFF",
        },
        notesInput: {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.text,
            borderWidth: 1,
            borderColor: theme.colors.border,
            minHeight: 52,
        },
        actionBtnSecondary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.colors.primarySoft,
        },
        actionBtnSecondaryText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primaryText,
        },
        actionBtnDestructive: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.colors.dangerSoft,
        },
        actionBtnDestructiveText: {
            fontSize: themeTokens.fonts.size.sm - 1,
            fontFamily: theme.fonts.bold,
            color: theme.colors.danger,
        },

        // ─── Modal & Preview ─────────────────────
        previewBackdrop: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,0.45)",
        },
        previewCard: {
            width: "100%",
            maxWidth: 340,
            backgroundColor: theme.colors.surface,
            borderRadius: 24,
            padding: 24,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
        },
        previewTitle: {
            fontSize: 20,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 6,
            textAlign: "center",
        },
        previewDescription: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 18,
        },
        recurringOptionBtn: {
            width: "100%",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            backgroundColor: theme.colors.surfaceMuted,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        recurringOptionText: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        recurringOptionPreviewText: {
            fontSize: 11.5,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
        },

        // ─── Bottom Navigation Bar ───────────────
        bottomBar: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 14,
            backgroundColor: theme.colors.background,
        },
        backBtn: {
            height: 56,
            paddingHorizontal: 24,
            borderRadius: 22,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },
        backBtnText: {
            fontSize: 16,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        nextBtn: {
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
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
        },
        nextBtnText: {
            fontSize: 17,
            fontFamily: theme.fonts.bold,
            color: "#FFFFFF",
        },
        saveBtn: {
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
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
        },
        saveBtnDisabled: {
            opacity: 0.6,
        },
        saveBtnText: {
            fontSize: 17,
            fontFamily: theme.fonts.bold,
            color: theme.colors.onPrimary,
        },

        // ─── Skip Confirmation Modal ─────────────
        skipModalBackdrop: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        skipModalCard: {
            width: "100%",
            maxWidth: 360,
            backgroundColor: theme.colors.surface,
            borderRadius: 24,
            padding: 24,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 8,
        },
        skipModalIconWrap: {
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: theme.colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        skipModalTitle: {
            fontSize: 20,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            textAlign: "center",
            marginBottom: 8,
        },
        skipModalSubtitle: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 20,
        },
        skipModalActions: {
            width: "100%",
            gap: 10,
        },
        skipModalPrimaryBtn: {
            width: "100%",
            height: 48,
            borderRadius: 14,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        skipModalPrimaryBtnText: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
            color: theme.colors.onPrimary,
        },
        skipModalSecondaryBtn: {
            width: "100%",
            height: 46,
            borderRadius: 14,
            backgroundColor: theme.colors.surfaceMuted,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        skipModalSecondaryBtnText: {
            fontSize: 13.5,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
        },
        skipModalCancelBtn: {
            width: "100%",
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
        },
        skipModalCancelText: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
    });