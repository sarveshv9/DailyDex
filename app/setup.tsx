import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme } from "../styles/shared";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "../utils/haptics";
import { scheduleRoutineNotifications } from "../utils/notifications";
import { getRoutineIcon, RoutineItem, timeToMinutes } from "../utils/utils";
import { StepTime, InteractiveTimeCard, SkyBackground, skyTrackColor } from "../components/SetupTimeSteps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STORAGE_KEY = "@zen_routine";
const SETUP_KEY = "@zen_setup_complete";

interface CategoryDef {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryDef[] = [
    { key: "all", label: "All", icon: "apps-outline" },
    { key: "morning", label: "Morning", icon: "sunny-outline" },
    { key: "meals", label: "Meals", icon: "restaurant-outline" },
    { key: "fitness", label: "Fitness", icon: "barbell-outline" },
    { key: "productivity", label: "Productivity", icon: "briefcase-outline" },
    { key: "mindfulness", label: "Mindfulness", icon: "leaf-outline" },
    { key: "creative", label: "Creative", icon: "brush-outline" },
    { key: "social", label: "Social", icon: "people-outline" },
    { key: "evening", label: "Evening", icon: "moon-outline" },
];

type CategoryKey = string;

interface ActivityTemplate {
    task: string;
    description: string;
    imageKey: string;
    defaultTime: string;
    category: CategoryKey;
}

interface StarterPack {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    tasks: string[];
}

const STARTER_PACKS: StarterPack[] = [
    {
        id: "mindful",
        title: "Mindful Morning",
        subtitle: "Clarity, hydration & stillness",
        icon: "flower-outline",
        tasks: ["Wake Up", "Hydrate", "Meditate", "Journal", "Sleep"],
    },
    {
        id: "deep_work",
        title: "Deep Flow",
        subtitle: "Structured creation & reading",
        icon: "flash-outline",
        tasks: ["Wake Up", "Hydrate", "Deep Work", "Read", "Sleep"],
    },
    {
        id: "vitality",
        title: "Active & Vital",
        subtitle: "Strength, cold shower & walk",
        icon: "barbell-outline",
        tasks: ["Wake Up", "Cold Shower", "Gym", "Walk", "Sleep"],
    },
    {
        id: "balanced",
        title: "Balanced Living",
        subtitle: "Nourishment, fresh air & rest",
        icon: "compass-outline",
        tasks: ["Wake Up", "Stretch", "Breakfast", "Walk", "Wind Down", "Sleep"],
    },
];

const TEMPLATES: ActivityTemplate[] = [
    // Morning
    { task: "Wake Up", description: "Start your day with a clear mind.", imageKey: "wakeup", defaultTime: "07:00 AM", category: "morning" },
    { task: "Hydrate", description: "Refresh your body with water.", imageKey: "water", defaultTime: "07:15 AM", category: "morning" },
    { task: "Stretch", description: "Gentle movement to wake up your muscles.", imageKey: "yoga", defaultTime: "07:30 AM", category: "morning" },
    { task: "Cold Shower", description: "Invigorate your senses and boost circulation.", imageKey: "cold_shower", defaultTime: "07:20 AM", category: "morning" },
    { task: "Skincare", description: "Take care of your skin, take care of yourself.", imageKey: "skincare", defaultTime: "07:25 AM", category: "morning" },
    { task: "Affirmations", description: "Set powerful intentions for the day.", imageKey: "affirmations", defaultTime: "07:10 AM", category: "morning" },

    // Meals
    { task: "Breakfast", description: "Nourish your body for the day ahead.", imageKey: "breakfast", defaultTime: "08:30 AM", category: "meals" },
    { task: "Lunch", description: "Pause and refuel for the afternoon.", imageKey: "lunch", defaultTime: "01:00 PM", category: "meals" },
    { task: "Dinner", description: "Enjoy a mindful meal with loved ones.", imageKey: "dinner", defaultTime: "07:00 PM", category: "meals" },
    { task: "Snack", description: "A healthy bite to keep your energy up.", imageKey: "snack", defaultTime: "04:00 PM", category: "meals" },
    { task: "Meal Prep", description: "Prepare tomorrow's fuel today.", imageKey: "meal_prep", defaultTime: "06:00 PM", category: "meals" },
    { task: "Tea", description: "A moment of calm and reflection.", imageKey: "tea_journal", defaultTime: "08:00 AM", category: "meals" },
    { task: "Coffee", description: "Your daily dose of clarity.", imageKey: "coffee", defaultTime: "08:15 AM", category: "meals" },

    // Fitness
    { task: "Gym", description: "Build strength and discipline.", imageKey: "gym", defaultTime: "06:30 AM", category: "fitness" },
    { task: "Yoga", description: "Flow through mind-body harmony.", imageKey: "yoga", defaultTime: "07:00 AM", category: "fitness" },
    { task: "Run", description: "Clear your head with every stride.", imageKey: "run", defaultTime: "06:00 AM", category: "fitness" },
    { task: "Walk", description: "Step outside and connect with nature.", imageKey: "walk", defaultTime: "05:00 PM", category: "fitness" },
    { task: "Swim", description: "Dive in and wash away stress.", imageKey: "swim", defaultTime: "07:00 AM", category: "fitness" },
    { task: "Sports", description: "Play hard, reset harder.", imageKey: "sports", defaultTime: "05:30 PM", category: "fitness" },
    { task: "Home Workout", description: "No gym needed — just you and your will.", imageKey: "home_workout", defaultTime: "06:30 AM", category: "fitness" },
    { task: "Cycling", description: "Pedal your way to peace.", imageKey: "cycling", defaultTime: "06:00 AM", category: "fitness" },

    // Productivity
    { task: "Study", description: "Focus on learning and growth.", imageKey: "study", defaultTime: "09:00 AM", category: "productivity" },
    { task: "Deep Work", description: "Dive deep into focused creation.", imageKey: "deep_work", defaultTime: "10:00 AM", category: "productivity" },
    { task: "Read", description: "Expand your mind one page at a time.", imageKey: "read", defaultTime: "08:00 PM", category: "productivity" },
    { task: "Side Project", description: "Build something you believe in.", imageKey: "side_project", defaultTime: "07:00 PM", category: "productivity" },
    { task: "Emails", description: "Clear your inbox, clear your mind.", imageKey: "emails", defaultTime: "09:30 AM", category: "productivity" },
    { task: "Planning", description: "Map out your path forward.", imageKey: "planning", defaultTime: "08:00 AM", category: "productivity" },

    // Mindfulness
    { task: "Meditate", description: "Still your mind, find your center.", imageKey: "meditate", defaultTime: "07:00 AM", category: "mindfulness" },
    { task: "Breathe", description: "Conscious breathing for inner calm.", imageKey: "breathe", defaultTime: "12:00 PM", category: "mindfulness" },
    { task: "Journal", description: "Pour your thoughts onto the page.", imageKey: "journal", defaultTime: "09:00 PM", category: "mindfulness" },
    { task: "Reflect", description: "Acknowledge your progress and intentions.", imageKey: "reflect", defaultTime: "06:00 PM", category: "mindfulness" },
    { task: "Gratitude", description: "Count your blessings, big and small.", imageKey: "gratitude", defaultTime: "09:30 PM", category: "mindfulness" },
    { task: "Prayer", description: "Connect with something greater.", imageKey: "prayer", defaultTime: "06:00 AM", category: "mindfulness" },

    // Creative
    { task: "Draw", description: "Express yourself through lines and color.", imageKey: "draw", defaultTime: "04:00 PM", category: "creative" },
    { task: "Music Practice", description: "Let rhythm move through you.", imageKey: "music_practice", defaultTime: "05:00 PM", category: "creative" },
    { task: "Write", description: "Give your ideas a voice.", imageKey: "write", defaultTime: "08:00 PM", category: "creative" },
    { task: "Photography", description: "Capture moments worth remembering.", imageKey: "photography", defaultTime: "05:00 PM", category: "creative" },
    { task: "Craft", description: "Create something with your hands.", imageKey: "craft", defaultTime: "03:00 PM", category: "creative" },

    // Social
    { task: "Family Time", description: "Be present with those who matter most.", imageKey: "family_time", defaultTime: "06:30 PM", category: "social" },
    { task: "Call a Friend", description: "Stay connected to the people you love.", imageKey: "call_friend", defaultTime: "07:00 PM", category: "social" },
    { task: "Date Night", description: "Nurture your relationship.", imageKey: "date_night", defaultTime: "07:30 PM", category: "social" },
    { task: "Volunteer", description: "Give back and grow through service.", imageKey: "volunteer", defaultTime: "10:00 AM", category: "social" },

    // Evening
    { task: "Wind Down", description: "Slow down and prepare for rest.", imageKey: "prepare_sleep", defaultTime: "09:00 PM", category: "evening" },
    { task: "Screen Off", description: "Disconnect to recharge.", imageKey: "screen_off", defaultTime: "09:30 PM", category: "evening" },
    { task: "Night Walk", description: "A peaceful stroll under the stars.", imageKey: "night_walk", defaultTime: "09:00 PM", category: "evening" },
    { task: "Sleep", description: "Rest deeply and recharge.", imageKey: "sleep", defaultTime: "10:00 PM", category: "evening" },
];

type DraftItem = Omit<RoutineItem, "id" | "insertionOrder"> & { id: string; duration?: number };

// ─── Step 0: Welcome / Manifesto Screen ───────────────────────────────────────
function StepWelcome({
    onStart,
    onSkip,
}: {
    onStart: () => void;
    onSkip: () => void;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 2400,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2400,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <View style={styles.welcomeContainer}>
            <View style={[styles.stepHeader, { paddingBottom: 0 }]}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }} />
                    <Pressable
                        onPress={onSkip}
                        style={styles.skipBtn}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Skip setup and use defaults"
                    >
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.welcomeCenter}>
                <View style={styles.welcomeAuraWrap}>
                    <Animated.View
                        style={[
                            styles.welcomeAuraRing,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    />
                    <View style={styles.welcomeIconCard}>
                        <Ionicons name="sparkles-outline" size={48} color={theme.colors.primary} />
                    </View>
                </View>

                <Text style={styles.welcomeBrand}>ZEN</Text>
                <Text style={styles.welcomeHeadline}>
                    Design your days with calm, intentional momentum.
                </Text>
                <Text style={styles.welcomeSubtitle}>
                    Anchor your biological clock, build friction-free rituals, and experience calm productivity.
                </Text>

                <View style={styles.welcomeHighlights}>
                    <View style={styles.welcomeHighlightItem}>
                        <View style={styles.welcomeHighlightIconCircle}>
                            <Ionicons name="sunny-outline" size={15} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.welcomeHighlightText}>Circadian rhythm anchors</Text>
                    </View>
                    <View style={styles.welcomeHighlightItem}>
                        <View style={styles.welcomeHighlightIconCircle}>
                            <Ionicons name="flash-outline" size={15} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.welcomeHighlightText}>Fluid daily rituals</Text>
                    </View>
                    <View style={styles.welcomeHighlightItem}>
                        <View style={styles.welcomeHighlightIconCircle}>
                            <Ionicons name="notifications-outline" size={15} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.welcomeHighlightText}>Quiet, mindful reminders</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bottomBar}>
                <Pressable
                    style={styles.nextBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStart();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Begin interactive setup"
                >
                    <Text style={styles.nextBtnText}>Begin Setup</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
            </View>
        </View>
    );
}

// ─── Step 1 & 2: Day & Night Anchor Screens are imported from ../components/SetupTimeSteps ──

// ─── Step 3: Redesigned Clean Activity Picker ────────────────────────────────
function StepPick({
    selected,
    onToggle,
    onSelectStarterPack,
    onAddCustom,
    onNext,
    onBack,
    onSkip,
    customActivities,
}: {
    selected: string[];
    onToggle: (task: string) => void;
    onSelectStarterPack: (pack: StarterPack) => void;
    onAddCustom: (activity: ActivityTemplate) => void;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    customActivities: ActivityTemplate[];
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState("");

    const ICON_CHOICES = [
        "wakeup", "water", "yoga", "breakfast", "study", "walk",
        "gym", "run", "meditate", "breathe", "journal", "draw",
        "music_practice", "read", "coffee", "cycling", "photography", "emails",
    ];
    const [selectedIcon, setSelectedIcon] = useState("breathe");

    const allTemplates = useMemo(
        () => [...TEMPLATES, ...customActivities],
        [customActivities]
    );

    const filteredTemplates = useMemo(() => {
        let list = allTemplates;
        if (activeCategory !== "all") {
            list = list.filter((t) => t.category === activeCategory);
        }
        if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (t) =>
                    t.task.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allTemplates, activeCategory, searchQuery]);

    const handleAddCustom = () => {
        const name = customName.trim();
        if (!name) return;
        if (allTemplates.some((t) => t.task.toLowerCase() === name.toLowerCase())) {
            Alert.alert("Already exists", "An activity with this name already exists.");
            return;
        }
        const newActivity: ActivityTemplate = {
            task: name,
            description: `Custom ritual: ${name}`,
            imageKey: selectedIcon,
            defaultTime: "09:00 AM",
            category: activeCategory === "all" ? "morning" : activeCategory,
        };
        onAddCustom(newActivity);
        setCustomName("");
        setSelectedIcon("breathe");
        setShowCustomModal(false);
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.stepHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>Step 3 of 4 · Habits</Text>
                    <Pressable onPress={onSkip} style={styles.skipBtn} hitSlop={10}>
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
                <Text style={styles.stepTitle}>Curate Your Habits</Text>
                <Text style={styles.stepSubtitle}>
                    Choose 3 or more habits to build your daily momentum.
                </Text>
            </View>

            {/* Main Scrollable Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.pickScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 1-Tap Starter Kits */}
                <View style={styles.kitsContainer}>
                    <Text style={styles.kitsHeaderLabel}>QUICK STARTER PACKS</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.kitsScrollRow}
                    >
                        {STARTER_PACKS.map((pack) => {
                            const isAllSelected = pack.tasks.every((t) => selected.includes(t));
                            return (
                                <Pressable
                                    key={pack.id}
                                    style={[
                                        styles.kitCard,
                                        isAllSelected && styles.kitCardSelected,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        onSelectStarterPack(pack);
                                    }}
                                >
                                    <View style={styles.kitCardHeader}>
                                        <View style={[styles.kitIconCircle, isAllSelected && styles.kitIconCircleSelected]}>
                                            <Ionicons
                                                name={pack.icon}
                                                size={18}
                                                color={isAllSelected ? theme.colors.white : theme.colors.primary}
                                            />
                                        </View>
                                        {isAllSelected && (
                                            <View style={styles.kitCheckPill}>
                                                <Ionicons name="checkmark" size={11} color={theme.colors.white} />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.kitTitle, isAllSelected && { color: theme.colors.primary }]}>
                                        {pack.title}
                                    </Text>
                                    <Text style={styles.kitSub} numberOfLines={1}>
                                        {pack.subtitle}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarBox}>
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        style={styles.searchTextInput}
                        placeholder="Search all habits…"
                        placeholderTextColor={`${theme.colors.textSecondary}80`}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery !== "" && (
                        <Pressable onPress={() => setSearchQuery("")}>
                            <Ionicons
                                name="close-circle"
                                size={18}
                                color={theme.colors.textSecondary}
                            />
                        </Pressable>
                    )}
                </View>

                {/* Category Filter Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesRow}
                    style={{ flexGrow: 0, marginBottom: 16 }}
                >
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.key;
                        const catCount =
                            cat.key === "all"
                                ? selected.length
                                : allTemplates.filter(
                                      (t) => t.category === cat.key && selected.includes(t.task)
                                  ).length;

                        return (
                            <Pressable
                                key={cat.key}
                                style={[styles.catPill, isActive && styles.catPillActive]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setActiveCategory(cat.key);
                                }}
                            >
                                <Ionicons
                                    name={cat.icon}
                                    size={14}
                                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.catPillLabel,
                                        isActive && styles.catPillLabelActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                                {catCount > 0 && (
                                    <View style={styles.catCountBadge}>
                                        <Text style={styles.catCountBadgeText}>{catCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* 2-Column Habit Cards */}
                <View style={styles.twoColumnGrid}>
                    {filteredTemplates.map((item) => {
                        const isSelected = selected.includes(item.task);
                        const isMandatory = item.task === "Wake Up" || item.task === "Sleep";

                        return (
                            <Pressable
                                key={item.task}
                                style={[
                                    styles.habitCard,
                                    isSelected && styles.habitCardSelected,
                                ]}
                                onPress={() => {
                                    if (isMandatory) return;
                                    Haptics.selectionAsync();
                                    onToggle(item.task);
                                }}
                            >
                                <View style={styles.habitCardTop}>
                                    <View style={[styles.habitIconBox, isSelected && styles.habitIconBoxSelected]}>
                                        <Ionicons
                                            name={getRoutineIcon(item.imageKey)}
                                            size={22}
                                            color={isSelected ? theme.colors.primary : theme.colors.text}
                                        />
                                    </View>
                                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                        {isSelected && (
                                            <Ionicons name="checkmark-sharp" size={12} color={theme.colors.white} />
                                        )}
                                    </View>
                                </View>

                                <Text
                                    style={[styles.habitCardTitle, isSelected && styles.habitCardTitleSelected]}
                                    numberOfLines={1}
                                >
                                    {item.task}
                                </Text>
                                <Text style={styles.habitCardTime}>{item.defaultTime}</Text>
                            </Pressable>
                        );
                    })}

                    {/* Add Custom Habit Card */}
                    <Pressable
                        style={styles.addCustomCard}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowCustomModal(true);
                        }}
                    >
                        <View style={styles.addCustomIconCircle}>
                            <Ionicons name="add" size={24} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.addCustomCardText}>Custom Habit</Text>
                        <Text style={styles.addCustomCardSub}>Create new</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Custom Habit Modal */}
            {showCustomModal && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
                    <Pressable
                        style={styles.previewBackdrop}
                        onPress={() => setShowCustomModal(false)}
                    >
                        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : undefined}
                            style={{ width: "100%", alignItems: "center", justifyContent: "center" }}
                        >
                            <Pressable style={styles.customModalCard} onPress={(e) => e.stopPropagation()}>
                                <Text style={styles.customModalTitle}>Create Custom Habit</Text>
                                <TextInput
                                    style={styles.customModalInput}
                                    placeholder="Habit name (e.g., Cold Plunge)"
                                    placeholderTextColor={`${theme.colors.textSecondary}80`}
                                    value={customName}
                                    onChangeText={setCustomName}
                                    maxLength={28}
                                    autoFocus
                                    accessibilityLabel="Habit name"
                                />

                                <Text style={styles.customModalLabel}>SELECT AN ICON</Text>
                                <View style={styles.iconChoicesGrid}>
                                    {ICON_CHOICES.map((key) => {
                                        const isIconChosen = selectedIcon === key;
                                        return (
                                            <Pressable
                                                key={key}
                                                style={[
                                                    styles.iconChoiceItem,
                                                    isIconChosen && styles.iconChoiceItemSelected,
                                                ]}
                                                onPress={() => setSelectedIcon(key)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Select icon ${key}`}
                                            >
                                                <Ionicons
                                                    name={getRoutineIcon(key)}
                                                    size={20}
                                                    color={isIconChosen ? theme.colors.white : theme.colors.primary}
                                                />
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                                    <Pressable
                                        style={styles.customModalCancelBtn}
                                        onPress={() => {
                                            setShowCustomModal(false);
                                            setCustomName("");
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Cancel custom habit"
                                    >
                                        <Text style={styles.customModalCancelText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.customModalSubmitBtn,
                                            !customName.trim() && { opacity: 0.4 },
                                        ]}
                                        onPress={handleAddCustom}
                                        disabled={!customName.trim()}
                                        accessibilityRole="button"
                                        accessibilityLabel="Add custom habit"
                                    >
                                        <Text style={styles.customModalSubmitText}>Add Habit</Text>
                                    </Pressable>
                                </View>
                            </Pressable>
                        </KeyboardAvoidingView>
                    </Pressable>
                </View>
            )}

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onBack();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Back to Sleep anchor"
                >
                    <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable
                    style={styles.nextBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onNext();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Continue to schedule with ${selected.length} habits`}
                >
                    <Text style={styles.nextBtnText}>
                        Continue ({selected.length})
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
            </View>
        </View>
    );
}

// ─── Step 4: Finalize Times & Schedule ────────────────────────────────────────
function StepTimes({
    routines,
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

    const DURATION_CHOICES = [15, 30, 45, 60];

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>Step 4 of 4 · Schedule</Text>
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

                        return (
                            <View key={item.id} style={styles.timelineRow}>
                                <View style={styles.timelineConnector}>
                                    <View style={styles.timelineDot} />
                                    {index < routines.length - 1 && (
                                        <View style={styles.timelineLine} />
                                    )}
                                </View>

                                <View style={[styles.timelineCard, isOpen && styles.timelineCardOpen]}>
                                    <Pressable
                                        style={styles.timelineCardTop}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setExpandedId(isOpen ? null : item.id);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${item.task} at ${item.time}, ${duration} minutes. Tap to ${isOpen ? "collapse" : "expand"}`}
                                    >
                                        <View style={styles.timelineCardLeft}>
                                            <View style={styles.timelineCardIconWrap}>
                                                <Ionicons
                                                    name={getRoutineIcon(item.imageKey)}
                                                    size={24}
                                                    color={theme.colors.primary}
                                                />
                                            </View>
                                            <View>
                                                <Text style={styles.timelineTask}>{item.task}</Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                    <Text style={styles.timelineTime}>{item.time}</Text>
                                                    <Text style={styles.timelineDurationDot}>·</Text>
                                                    <Text style={styles.timelineDurationText}>{duration}m</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.timelineCardRight}>
                                            <Ionicons
                                                name={isOpen ? "chevron-up" : "chevron-down"}
                                                size={18}
                                                color={`${theme.colors.text}60`}
                                            />
                                        </View>
                                    </Pressable>

                                    {isOpen && (
                                        <View style={styles.timelineExpanded}>
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
                                                placeholderTextColor={`${theme.colors.textSecondary}80`}
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
                                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
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
                        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
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
                                    {[1, 2, 3, 4].map((hours) => (
                                        <Pressable
                                            key={hours}
                                            style={styles.recurringOptionBtn}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onMakeRecurring(recurringModalItem.id, hours);
                                                setRecurringModalItem(null);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Repeat every ${hours} hour${hours > 1 ? "s" : ""}`}
                                        >
                                            <Text style={[styles.recurringOptionText, { color: theme.colors.white }]}>
                                                Every {hours} hour{hours > 1 ? "s" : ""}
                                            </Text>
                                        </Pressable>
                                    ))}
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
                    accessibilityLabel="Back to Habits selection"
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
                    accessibilityLabel={saving ? "Creating Rhythm" : "Step Into Zen"}
                >
                    <Text style={styles.saveBtnText}>
                        {saving ? "Creating Rhythm…" : "Step Into Zen"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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

    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [saving, setSaving] = useState(false);
    const skyProgress = useRef(new Animated.Value(0)).current;

    // Android hardware back button handler
    useEffect(() => {
        const onBackPress = () => {
            if (step > 0) {
                setStep((prev) => (prev - 1) as 0 | 1 | 2 | 3 | 4);
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
    const [selectedTasks, setSelectedTasks] = useState<string[]>([
        "Wake Up",
        "Hydrate",
        "Meditate",
        "Sleep",
    ]);
    const [routines, setRoutines] = useState<DraftItem[]>([]);
    const [customActivities, setCustomActivities] = useState<ActivityTemplate[]>([]);

    const addCustomActivity = (activity: ActivityTemplate) => {
        setCustomActivities((prev) => [...prev, activity]);
        setSelectedTasks((prev) => [...prev, activity.task]);
    };

    const toggleTask = (task: string) => {
        setSelectedTasks((prev) =>
            prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
        );
    };

    const handleSelectStarterPack = (pack: StarterPack) => {
        const nonMandatoryTasks = pack.tasks.filter((t) => t !== "Wake Up" && t !== "Sleep");
        const isAllSelected = nonMandatoryTasks.every((t) => selectedTasks.includes(t));

        if (isAllSelected) {
            // Cancel / deselect the starter pack
            setSelectedTasks((prev) => prev.filter((t) => !nonMandatoryTasks.includes(t)));
        } else {
            // Select all tasks from this pack
            setSelectedTasks((prev) => {
                const set = new Set([...prev, ...pack.tasks]);
                return Array.from(set);
            });
        }
    };

    const handleSkipAll = async () => {
        setSaving(true);
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

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(minimalItems));
            await AsyncStorage.setItem(SETUP_KEY, "true");


            await scheduleRoutineNotifications(minimalItems);
            router.replace("/(tabs)");
        } catch (e) {
            console.error("Failed to skip setup", e);
            router.replace("/(tabs)");
        } finally {
            setSaving(false);
        }
    };

    const goToStep3 = () => {
        setStep(3);
    };

    const goToStep4 = () => {
        const allTemplates = [...TEMPLATES, ...customActivities];
        const merged: DraftItem[] = selectedTasks.map((t, idx) => {
            const tmpl = allTemplates.find((x) => x.task === t) || {
                task: t,
                description: "",
                imageKey: "breathe",
                defaultTime: "09:00 AM",
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
                duration: 30,
            };
        });

        // Chronologically sort routines
        merged.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        setRoutines(merged);
        setStep(4);
    };

    const updateRoutineTime = (id: string, val: string) => {
        const next = routines.map((r) => (r.id === id ? { ...r, time: val } : r));
        const updated = next.find((r) => r.id === id);
        if (updated?.task === "Wake Up") setWakeTime(val);
        if (updated?.task === "Sleep") setSleepTime(val);
        next.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
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
        const items: RoutineItem[] = routines.map((r, idx) => ({
            ...r,
            id: Date.now().toString() + idx,
            insertionOrder: idx + 1,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            duration: r.duration || 30,
        }));

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(SETUP_KEY, "true");


            await scheduleRoutineNotifications(items);
            router.replace("/(tabs)");
        } catch (e) {
            console.error("Failed to save setup data", e);
            Alert.alert("Setup Error", "Failed to save your routine. Please try again.");
            setSaving(false);
        }
    };

    return (
        <SafeAreaView
            style={[
                styles.safeArea,
            ]}
        >
            {(step === 1 || step === 2) && (
                <SkyBackground progress={skyProgress} />
            )}

            <Animated.View
                style={[
                    styles.progressBar,
                    step === 0 && { backgroundColor: "transparent" },
                    (step === 1 || step === 2) && { backgroundColor: skyTrackColor(skyProgress) },
                    (step === 3 || step === 4) && { backgroundColor: `${theme.colors.primary}18` },
                ]}
            >
                <View
                    style={[
                        styles.progressFill,
                        { width: `${(step / 4) * 100}%` },
                        (step === 1 || step === 2) && { backgroundColor: "#FF3B30" },
                    ]}
                />
            </Animated.View>

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
                            goToStep3();
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
                    selected={selectedTasks}
                    onToggle={toggleTask}
                    onSelectStarterPack={handleSelectStarterPack}
                    onAddCustom={addCustomActivity}
                    onNext={goToStep4}
                    onBack={() => setStep(2)}
                    onSkip={handleSkipAll}
                    customActivities={customActivities}
                />
            )}

            {step === 4 && (
                <StepTimes
                    routines={routines}
                    onUpdateTime={updateRoutineTime}
                    onUpdateDesc={updateRoutineDesc}
                    onUpdateDuration={updateRoutineDuration}
                    onRemove={removeItem}
                    onMakeRecurring={handleMakeRecurring}
                    onSave={handleSave}
                    onBack={() => setStep(3)}
                    onSkip={handleSkipAll}
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

        progressBar: {
            height: 4,
            marginHorizontal: 22,
            marginTop: 8,
            marginBottom: 6,
            borderRadius: 2,
            backgroundColor: `${theme.colors.primary}18`,
            overflow: "hidden",
        },
        progressFill: {
            height: 4,
            backgroundColor: theme.colors.primary,
            borderRadius: 2,
        },

        // ─── Welcome (Step 0) ────────────────────
        welcomeContainer: {
            flex: 1,
            justifyContent: "space-between",
        },
        welcomeCenter: {
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 8,
        },
        welcomeAuraWrap: {
            width: 110,
            height: 110,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        welcomeAuraRing: {
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: `${theme.colors.primary}12`,
        },
        welcomeIconCard: {
            width: 82,
            height: 82,
            borderRadius: 26,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: `${theme.colors.primary}25`,
            ...theme.glows.card,
        },
        welcomeBrand: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            letterSpacing: 4,
            color: theme.colors.primary,
            marginBottom: 8,
        },
        welcomeHeadline: {
            fontSize: 27,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            textAlign: "center",
            lineHeight: 33,
            marginBottom: 10,
        },
        welcomeSubtitle: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
            paddingHorizontal: 8,
        },
        welcomeHighlights: {
            width: "100%",
            gap: 10,
            marginTop: 6,
            paddingHorizontal: 8,
        },
        welcomeHighlightItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: `${theme.colors.primary}08`,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}12`,
        },
        welcomeHighlightIconCircle: {
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: `${theme.colors.primary}12`,
            alignItems: "center",
            justifyContent: "center",
        },
        welcomeHighlightText: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.text,
        },

        // ─── Common Step Header ──────────────────
        stepHeader: {
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 8,
        },
        headerTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            height: 24,
            marginBottom: 10,
        },
        stepEyebrow: {
            fontSize: 12,
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
            fontSize: 14,
            lineHeight: 18,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
        stepTitle: {
            fontSize: 30,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            lineHeight: 36,
            marginBottom: 4,
        },
        stepSubtitle: {
            fontSize: 14,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
            lineHeight: 19,
        },

        // ─── Step 3 (Redesigned Habit Picker) ────
        pickScrollContent: {
            paddingBottom: 40,
        },
        kitsContainer: {
            marginBottom: 16,
        },
        kitsHeaderLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
            letterSpacing: 1.2,
            paddingHorizontal: 20,
            marginBottom: 10,
        },
        kitsScrollRow: {
            paddingHorizontal: 20,
            gap: 10,
        },
        kitCard: {
            width: 154,
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}15`,
        },
        kitCardSelected: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}0C`,
        },
        kitCardHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
        },
        kitIconCircle: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: `${theme.colors.primary}12`,
            alignItems: "center",
            justifyContent: "center",
        },
        kitIconCircleSelected: {
            backgroundColor: theme.colors.primary,
        },
        kitCheckPill: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        kitTitle: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        kitSub: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
        },

        // Search Bar
        searchBarBox: {
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 20,
            marginBottom: 12,
            backgroundColor: theme.colors.card,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}15`,
        },
        searchTextInput: {
            flex: 1,
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.text,
            padding: 0,
        },

        // Category Pills
        categoriesRow: {
            paddingHorizontal: 20,
            gap: 8,
        },
        catPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 16,
            backgroundColor: theme.colors.card,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}12`,
        },
        catPillActive: {
            backgroundColor: `${theme.colors.primary}15`,
            borderColor: theme.colors.primary,
        },
        catPillLabel: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
        catPillLabelActive: {
            color: theme.colors.primary,
            fontFamily: theme.fonts.bold,
        },
        catCountBadge: {
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
            marginLeft: 2,
        },
        catCountBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
        },

        // 2-Column Habit Cards
        twoColumnGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 20,
            justifyContent: "space-between",
            rowGap: 10,
        },
        habitCard: {
            width: "48%",
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}15`,
        },
        habitCardSelected: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}0C`,
        },
        habitCardTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
        },
        habitIconBox: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: `${theme.colors.primary}10`,
            alignItems: "center",
            justifyContent: "center",
        },
        habitIconBoxSelected: {
            backgroundColor: `${theme.colors.primary}20`,
        },
        radioCircle: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}35`,
            alignItems: "center",
            justifyContent: "center",
        },
        radioCircleSelected: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        habitCardTitle: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        habitCardTitleSelected: {
            color: theme.colors.primary,
        },
        habitCardTime: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
        },

        // Add Custom Habit Card
        addCustomCard: {
            width: "48%",
            borderRadius: 16,
            padding: 12,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}25`,
            borderStyle: "dashed",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 100,
        },
        addCustomIconCircle: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: `${theme.colors.primary}10`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
        },
        addCustomCardText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            marginBottom: 2,
        },
        addCustomCardSub: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            color: theme.colors.textSecondary,
        },

        // Custom Modal
        customModalCard: {
            width: "100%",
            maxWidth: 340,
            backgroundColor: theme.colors.card,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}25`,
            ...theme.glows.card,
        },
        customModalTitle: {
            fontSize: 18,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 14,
        },
        customModalInput: {
            backgroundColor: `${theme.colors.primary}08`,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.text,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}15`,
            marginBottom: 16,
        },
        customModalLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textSecondary,
            letterSpacing: 1,
            marginBottom: 10,
        },
        iconChoicesGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        iconChoiceItem: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: `${theme.colors.primary}15`,
        },
        iconChoiceItemSelected: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        customModalCancelBtn: {
            flex: 1,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${theme.colors.primary}0D`,
        },
        customModalCancelText: {
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.textSecondary,
        },
        customModalSubmitBtn: {
            flex: 1,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
        },
        customModalSubmitText: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
        },

        // ─── Notification Primer Card (Step 4) ───
        notificationPrimerCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: theme.colors.card,
            padding: 16,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}18`,
            marginBottom: 18,
        },
        notificationPrimerIconWrap: {
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: `${theme.colors.primary}12`,
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
            backgroundColor: `${theme.colors.primary}20`,
            marginTop: 4,
            minHeight: 40,
        },
        timelineCard: {
            flex: 1,
            backgroundColor: theme.colors.card,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}15`,
            overflow: "hidden",
        },
        timelineCardOpen: {
            borderColor: theme.colors.primary,
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
            backgroundColor: `${theme.colors.primary}0D`,
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
            color: `${theme.colors.textSecondary}80`,
        },
        timelineDurationText: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
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
            backgroundColor: `${theme.colors.primary}12`,
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
            backgroundColor: `${theme.colors.primary}06`,
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
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: `${theme.colors.primary}12`,
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
            color: theme.colors.white,
        },
        notesInput: {
            backgroundColor: `${theme.colors.primary}06`,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            color: theme.colors.text,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}12`,
            minHeight: 52,
        },
        actionBtnSecondary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${theme.colors.primary}0D`,
        },
        actionBtnSecondaryText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
        },
        actionBtnDestructive: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#EF444412",
        },
        actionBtnDestructiveText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: "#EF4444",
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
            backgroundColor: theme.colors.card,
            borderRadius: 24,
            padding: 24,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}20`,
            ...theme.glows.card,
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
            height: 48,
            borderRadius: 14,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            ...theme.glows.primary,
        },
        recurringOptionText: {
            fontSize: 14,
            fontFamily: theme.fonts.bold,
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
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: `${theme.colors.text}18`,
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
            shadowRadius: 18,
            elevation: 5,
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
            shadowRadius: 18,
            elevation: 5,
        },
        saveBtnDisabled: {
            opacity: 0.6,
        },
        saveBtnText: {
            fontSize: 17,
            fontFamily: theme.fonts.bold,
            color: "#FFFFFF",
        },
    });