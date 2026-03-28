import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InlineTimePicker } from "../components/common/InlineTimePicker";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { scheduleRoutineNotifications } from "../utils/notifications";
import { getRoutineIcon, RoutineItem, timeToMinutes } from "../utils/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STORAGE_KEY = "@zen_routine";
const SETUP_KEY = "@zen_setup_complete";

const CATEGORIES = [
    { key: "all", label: "All", emoji: "✨" },
    { key: "morning", label: "Morning", emoji: "🌅" },
    { key: "meals", label: "Meals", emoji: "🍽️" },
    { key: "fitness", label: "Fitness", emoji: "💪" },
    { key: "productivity", label: "Productivity", emoji: "📚" },
    { key: "mindfulness", label: "Mindfulness", emoji: "🧘" },
    { key: "creative", label: "Creative", emoji: "🎨" },
    { key: "social", label: "Social", emoji: "👥" },
    { key: "evening", label: "Evening", emoji: "🌙" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

interface ActivityTemplate {
    task: string;
    description: string;
    imageKey: string;
    emoji: string;
    defaultTime: string;
    category: CategoryKey;
}

const TEMPLATES: ActivityTemplate[] = [
    // Morning
    { task: "Wake Up", description: "Start your day with a clear mind.", imageKey: "wakeup", emoji: "🌅", defaultTime: "07:00 AM", category: "morning" },
    { task: "Hydrate", description: "Refresh your body with water.", imageKey: "water", emoji: "💧", defaultTime: "07:15 AM", category: "morning" },
    { task: "Stretch", description: "Gentle movement to wake up your muscles.", imageKey: "yoga", emoji: "🧘", defaultTime: "07:30 AM", category: "morning" },
    { task: "Cold Shower", description: "Invigorate your senses and boost circulation.", imageKey: "cold_shower", emoji: "🚿", defaultTime: "07:20 AM", category: "morning" },
    { task: "Skincare", description: "Take care of your skin, take care of yourself.", imageKey: "skincare", emoji: "✨", defaultTime: "07:25 AM", category: "morning" },
    { task: "Affirmations", description: "Set powerful intentions for the day.", imageKey: "affirmations", emoji: "💬", defaultTime: "07:10 AM", category: "morning" },

    // Meals
    { task: "Breakfast", description: "Nourish your body for the day ahead.", imageKey: "breakfast", emoji: "🥣", defaultTime: "08:30 AM", category: "meals" },
    { task: "Lunch", description: "Pause and refuel for the afternoon.", imageKey: "lunch", emoji: "🍱", defaultTime: "01:00 PM", category: "meals" },
    { task: "Dinner", description: "Enjoy a mindful meal with loved ones.", imageKey: "dinner", emoji: "🍽️", defaultTime: "07:00 PM", category: "meals" },
    { task: "Snack", description: "A healthy bite to keep your energy up.", imageKey: "snack", emoji: "🍎", defaultTime: "04:00 PM", category: "meals" },
    { task: "Meal Prep", description: "Prepare tomorrow's fuel today.", imageKey: "meal_prep", emoji: "🔪", defaultTime: "06:00 PM", category: "meals" },
    { task: "Tea", description: "A moment of calm and reflection.", imageKey: "tea_journal", emoji: "🍵", defaultTime: "08:00 AM", category: "meals" },
    { task: "Coffee", description: "Your daily dose of clarity.", imageKey: "coffee", emoji: "☕", defaultTime: "08:15 AM", category: "meals" },

    // Fitness
    { task: "Gym", description: "Build strength and discipline.", imageKey: "gym", emoji: "🏋️", defaultTime: "06:30 AM", category: "fitness" },
    { task: "Yoga", description: "Flow through mind-body harmony.", imageKey: "yoga", emoji: "🧘", defaultTime: "07:00 AM", category: "fitness" },
    { task: "Run", description: "Clear your head with every stride.", imageKey: "run", emoji: "🏃", defaultTime: "06:00 AM", category: "fitness" },
    { task: "Walk", description: "Step outside and connect with nature.", imageKey: "walk", emoji: "🚶", defaultTime: "05:00 PM", category: "fitness" },
    { task: "Swim", description: "Dive in and wash away stress.", imageKey: "swim", emoji: "🏊", defaultTime: "07:00 AM", category: "fitness" },
    { task: "Sports", description: "Play hard, reset harder.", imageKey: "sports", emoji: "⚽", defaultTime: "05:30 PM", category: "fitness" },
    { task: "Home Workout", description: "No gym needed — just you and your will.", imageKey: "home_workout", emoji: "💪", defaultTime: "06:30 AM", category: "fitness" },
    { task: "Cycling", description: "Pedal your way to peace.", imageKey: "cycling", emoji: "🚴", defaultTime: "06:00 AM", category: "fitness" },

    // Productivity
    { task: "Study", description: "Focus on learning and growth.", imageKey: "study", emoji: "📚", defaultTime: "09:00 AM", category: "productivity" },
    { task: "Deep Work", description: "Dive deep into focused creation.", imageKey: "deep_work", emoji: "🖥️", defaultTime: "10:00 AM", category: "productivity" },
    { task: "Read", description: "Expand your mind one page at a time.", imageKey: "read", emoji: "📖", defaultTime: "08:00 PM", category: "productivity" },
    { task: "Side Project", description: "Build something you believe in.", imageKey: "side_project", emoji: "🚀", defaultTime: "07:00 PM", category: "productivity" },
    { task: "Emails", description: "Clear your inbox, clear your mind.", imageKey: "emails", emoji: "📧", defaultTime: "09:30 AM", category: "productivity" },
    { task: "Planning", description: "Map out your path forward.", imageKey: "planning", emoji: "📋", defaultTime: "08:00 AM", category: "productivity" },

    // Mindfulness
    { task: "Meditate", description: "Still your mind, find your center.", imageKey: "meditate", emoji: "🪷", defaultTime: "07:00 AM", category: "mindfulness" },
    { task: "Breathe", description: "Conscious breathing for inner calm.", imageKey: "breathe", emoji: "🌿", defaultTime: "12:00 PM", category: "mindfulness" },
    { task: "Journal", description: "Pour your thoughts onto the page.", imageKey: "journal", emoji: "📝", defaultTime: "09:00 PM", category: "mindfulness" },
    { task: "Reflect", description: "Acknowledge your progress and intentions.", imageKey: "reflect", emoji: "📓", defaultTime: "06:00 PM", category: "mindfulness" },
    { task: "Gratitude", description: "Count your blessings, big and small.", imageKey: "gratitude", emoji: "🙏", defaultTime: "09:30 PM", category: "mindfulness" },
    { task: "Prayer", description: "Connect with something greater.", imageKey: "prayer", emoji: "🕊️", defaultTime: "06:00 AM", category: "mindfulness" },

    // Creative
    { task: "Draw", description: "Express yourself through lines and color.", imageKey: "draw", emoji: "🎨", defaultTime: "04:00 PM", category: "creative" },
    { task: "Music Practice", description: "Let rhythm move through you.", imageKey: "music_practice", emoji: "🎵", defaultTime: "05:00 PM", category: "creative" },
    { task: "Write", description: "Give your ideas a voice.", imageKey: "write", emoji: "✍️", defaultTime: "08:00 PM", category: "creative" },
    { task: "Photography", description: "Capture moments worth remembering.", imageKey: "photography", emoji: "📸", defaultTime: "05:00 PM", category: "creative" },
    { task: "Craft", description: "Create something with your hands.", imageKey: "craft", emoji: "🧶", defaultTime: "03:00 PM", category: "creative" },

    // Social
    { task: "Family Time", description: "Be present with those who matter most.", imageKey: "family_time", emoji: "👨‍👩‍👧", defaultTime: "06:30 PM", category: "social" },
    { task: "Call a Friend", description: "Stay connected to the people you love.", imageKey: "call_friend", emoji: "📞", defaultTime: "07:00 PM", category: "social" },
    { task: "Date Night", description: "Nurture your relationship.", imageKey: "date_night", emoji: "❤️", defaultTime: "07:30 PM", category: "social" },
    { task: "Volunteer", description: "Give back and grow through service.", imageKey: "volunteer", emoji: "🤝", defaultTime: "10:00 AM", category: "social" },

    // Evening
    { task: "Wind Down", description: "Slow down and prepare for rest.", imageKey: "prepare_sleep", emoji: "🌙", defaultTime: "09:00 PM", category: "evening" },
    { task: "Screen Off", description: "Disconnect to recharge.", imageKey: "screen_off", emoji: "📵", defaultTime: "09:30 PM", category: "evening" },
    { task: "Night Walk", description: "A peaceful stroll under the stars.", imageKey: "night_walk", emoji: "🌃", defaultTime: "09:00 PM", category: "evening" },
    { task: "Sleep", description: "Rest deeply and recharge.", imageKey: "sleep", emoji: "😴", defaultTime: "10:00 PM", category: "evening" },
];

type DraftItem = Omit<RoutineItem, "id" | "insertionOrder">;

// ─── Step 1 & 2: Time Set (Wake/Sleep) ────────────────────────────────────────
function StepTime({
    title,
    subtitle,
    imageKey,
    time,
    onUpdateTime,
    onNext,
    onBack,
    onSkip,
    stepLabel,
}: {
    title: string;
    subtitle: string;
    imageKey: string;
    time: string;
    onUpdateTime: (val: string) => void;
    onNext: () => void;
    onBack?: () => void;
    onSkip: () => void;
    stepLabel: string;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>{stepLabel}</Text>
                    <Pressable onPress={onSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepSubtitle}>{subtitle}</Text>
            </View>

            <View style={styles.timePickerContainer}>
                <View style={styles.largeIconWrap}>
                    <Ionicons
                        name={getRoutineIcon(imageKey)}
                        size={80}
                        color={theme.colors.primary}
                    />
                </View>
                <View style={styles.mainTimePicker}>
                    <InlineTimePicker
                        value={time}
                        onChange={onUpdateTime}
                    />
                </View>
            </View>

            <View style={styles.bottomBar}>
                {onBack ? (
                    <Pressable style={styles.backBtn} onPress={onBack}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </Pressable>
                ) : (
                    <View style={{ flex: 1 }} />
                )}
                <Pressable style={styles.nextBtn} onPress={onNext}>
                    <Text style={styles.nextBtnText}>Next Step →</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Step 3: Pick activities ─────────────────────────────────────────────────
function StepPick({
    selected,
    onToggle,
    onAddCustom,
    onNext,
    onBack,
    onSkip,
    customActivities,
}: {
    selected: string[];
    onToggle: (task: string) => void;
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
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customName, setCustomName] = useState("");
    const [previewTask, setPreviewTask] = useState<ActivityTemplate | null>(null);

    // Available icon keys for custom activity picker
    const ICON_CHOICES = [
        "wakeup", "water", "yoga", "breakfast", "study", "walk",
        "gym", "run", "meditate", "breathe", "journal", "draw",
        "music_practice", "read", "coffee", "cycling", "photography", "emails",
    ];
    const [selectedIcon, setSelectedIcon] = useState("breathe");

    // Merge built-in + custom
    const allTemplates = [...TEMPLATES, ...customActivities];

    // Filter templates by category and search
    const filtered = allTemplates.filter((tmpl) => {
        const matchesCategory = activeCategory === "all" || tmpl.category === activeCategory;
        const matchesSearch =
            searchQuery === "" ||
            tmpl.task.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (activeCategory === "all") {
        filtered.sort((a, b) => {
            // Force Wake Up to always be first, Sleep to always be last
            if (a.task === "Wake Up") return -1;
            if (b.task === "Wake Up") return 1;
            if (a.task === "Sleep") return 1;
            if (b.task === "Sleep") return -1;

            return timeToMinutes(a.defaultTime) - timeToMinutes(b.defaultTime);
        });
    }

    const handleAddCustom = () => {
        const name = customName.trim();
        if (!name) return;
        // Avoid duplicates
        if (allTemplates.some((t) => t.task.toLowerCase() === name.toLowerCase())) return;
        const newActivity: ActivityTemplate = {
            task: name,
            description: `Custom activity: ${name}`,
            imageKey: selectedIcon,
            emoji: "⭐",
            defaultTime: "09:00 AM",
            category: activeCategory === "all" ? "morning" : activeCategory,
        };
        onAddCustom(newActivity);
        setCustomName("");
        setSelectedIcon("breathe");
        setShowCustomForm(false);
    };

    // Count non-mandatory selected items
    const nonMandatoryCount = selected.filter(
        (t) => t !== "Wake Up" && t !== "Sleep"
    ).length;

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.stepHeader, { paddingBottom: 12 }]}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>Step 3 of 4</Text>
                    <Pressable onPress={onSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
                <Text style={styles.stepTitle}>Add your{"\n"}activities</Text>
                <Text style={styles.stepSubtitle}>
                    Browse or search from {allTemplates.length}+ activities.
                </Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchBarWrap}>
                <Ionicons
                    name="search-outline"
                    size={18}
                    color={theme.colors.primary}
                    style={{ opacity: 0.5, marginRight: 8 }}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search activities…"
                    placeholderTextColor={`${theme.colors.secondary}60`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery !== "" && (
                    <Pressable onPress={() => setSearchQuery("")}>
                        <Ionicons
                            name="close-circle"
                            size={18}
                            color={`${theme.colors.primary}50`}
                        />
                    </Pressable>
                )}
            </View>

            {/* Category pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
                style={{ flexGrow: 0, marginBottom: 6 }}
            >
                {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.key;
                    // Count how many selected items are in this category
                    const catCount =
                        cat.key === "all"
                            ? selected.length
                            : allTemplates.filter(
                                (t) => t.category === cat.key && selected.includes(t.task)
                            ).length;
                    return (
                        <Pressable
                            key={cat.key}
                            style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                            onPress={() => setActiveCategory(cat.key)}
                        >
                            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    isActive && styles.categoryLabelActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                            {catCount > 0 && (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryBadgeText}>{catCount}</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Activity grid */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
            >
                {filtered.map((tmpl) => {
                    const isMandatory = tmpl.task === "Wake Up" || tmpl.task === "Sleep";
                    const isOn = selected.includes(tmpl.task);
                    return (
                        <Pressable
                            key={tmpl.task}
                            style={[
                                styles.gridCard,
                                isOn && styles.gridCardOn,
                                isMandatory && styles.gridCardMandatory,
                            ]}
                            onPress={() => !isMandatory && onToggle(tmpl.task)}
                            onLongPress={() => setPreviewTask(tmpl)}
                            delayLongPress={300}
                        >
                            <View style={[styles.gridIconWrap, isOn && styles.gridIconWrapOn]}>
                                <Ionicons
                                    name={getRoutineIcon(tmpl.imageKey)}
                                    size={28}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <Text style={[styles.gridLabel, isOn && styles.gridLabelOn]} numberOfLines={1}>
                                {tmpl.task}
                            </Text>
                            <Text style={styles.gridDescription} numberOfLines={1}>
                                {tmpl.description}
                            </Text>
                            {isOn && (
                                <View style={styles.checkBadge}>
                                    <Ionicons name="checkmark" size={12} color={theme.colors.white} />
                                </View>
                            )}
                            {isMandatory && (
                                <View style={styles.mandatoryBadge}>
                                    <Ionicons name="lock-closed" size={10} color={theme.colors.primary} />
                                </View>
                            )}
                        </Pressable>
                    );
                })}

                {/* Create Custom card */}
                {!showCustomForm ? (
                    <Pressable
                        style={styles.createCustomCard}
                        onPress={() => setShowCustomForm(true)}
                    >
                        <View style={styles.createCustomIconWrap}>
                            <Ionicons name="add" size={28} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.createCustomLabel}>Create{"\n"}Custom</Text>
                    </Pressable>
                ) : (
                    <View style={styles.customFormCard}>
                        <Text style={styles.customFormTitle}>New Activity</Text>
                        <TextInput
                            style={styles.customNameInput}
                            placeholder="Activity name"
                            placeholderTextColor={`${theme.colors.secondary}60`}
                            value={customName}
                            onChangeText={setCustomName}
                            maxLength={24}
                            autoFocus
                        />
                        <Text style={styles.customFormIconLabel}>Pick an icon</Text>
                        <View style={styles.iconPickerGrid}>
                            {ICON_CHOICES.map((key) => (
                                <Pressable
                                    key={key}
                                    style={[
                                        styles.iconPickerItem,
                                        selectedIcon === key && styles.iconPickerItemActive,
                                    ]}
                                    onPress={() => setSelectedIcon(key)}
                                >
                                    <Ionicons
                                        name={getRoutineIcon(key)}
                                        size={20}
                                        color={
                                            selectedIcon === key
                                                ? theme.colors.white
                                                : theme.colors.primary
                                        }
                                    />
                                </Pressable>
                            ))}
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                            <Pressable
                                style={styles.customCancelBtn}
                                onPress={() => {
                                    setShowCustomForm(false);
                                    setCustomName("");
                                }}
                            >
                                <Text style={styles.customCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.customAddBtn,
                                    !customName.trim() && { opacity: 0.4 },
                                ]}
                                onPress={handleAddCustom}
                                disabled={!customName.trim()}
                            >
                                <Text style={styles.customAddText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Floating selected count badge */}
            {nonMandatoryCount > 0 && (
                <View style={styles.floatingBadge}>
                    <Text style={styles.floatingBadgeText}>
                        {nonMandatoryCount} activit{nonMandatoryCount === 1 ? "y" : "ies"} selected
                    </Text>
                </View>
            )}

            {/* Task Preview Modal */}
            {!!previewTask && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
                    <Pressable
                        style={styles.previewBackdrop}
                        onPress={() => setPreviewTask(null)}
                    >
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.previewCard}>
                            <View style={styles.previewIconWrap}>
                                <Ionicons
                                    name={getRoutineIcon(previewTask.imageKey)}
                                    size={42}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <Text style={styles.previewTitle}>{previewTask.task}</Text>
                            <Text style={styles.previewDescription}>
                                {previewTask.description}
                            </Text>
                            <View style={styles.previewCategoryWrap}>
                                <Text style={styles.previewCategoryEmoji}>
                                    {previewTask.emoji}
                                </Text>
                                <Text style={styles.previewCategoryLabel}>
                                    {CATEGORIES.find(c => c.key === previewTask.category)?.label || previewTask.category}
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

            <View style={styles.bottomBar}>
                <Pressable style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                    style={styles.nextBtn}
                    onPress={onNext}
                >
                    <Text style={styles.nextBtnText}>Next ({selected.length}) →</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Step 4: Set times (inline timeline) ─────────────────────────────────────
function StepTimes({
    routines,
    onUpdateTime,
    onUpdateDesc,
    onRemove,
    onMakeRecurring,
    onSave,
    onBack,
    onSkip,
    saving,
}: {
    routines: DraftItem[];
    onUpdateTime: (index: number, val: string) => void;
    onUpdateDesc: (index: number, val: string) => void;
    onRemove: (index: number) => void;
    onMakeRecurring: (index: number, hoursInterval: number) => void;
    onSave: () => void;
    onBack: () => void;
    onSkip: () => void;
    saving: boolean;
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [recurringModalIdx, setRecurringModalIdx] = useState<number | null>(null);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.stepHeader}>
                <View style={styles.headerTop}>
                    <Text style={styles.stepEyebrow}>Step 4 of 4</Text>
                    <Pressable onPress={onSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip All</Text>
                    </Pressable>
                </View>
                <Text style={styles.stepTitle}>Your Zen{"\n"}Routine</Text>
                <Text style={styles.stepSubtitle}>
                    Review your schedule carefully. Precision is peace.
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeline */}
                <View style={styles.timeline}>
                    {routines.map((item, index) => {
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
                                            <Ionicons
                                                name={getRoutineIcon(item.imageKey)}
                                                size={32}
                                                color={theme.colors.primary}
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
                                            <Text style={[styles.expandedLabel, { marginTop: 30 }]}>
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
                                            {item.task !== "Wake Up" && item.task !== "Sleep" && (
                                                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                                                    <Pressable
                                                        style={[styles.removeBtn, { flex: 1, alignItems: "center", backgroundColor: `${theme.colors.primary}0D` }]}
                                                        onPress={() => setRecurringModalIdx(index)}
                                                    >
                                                        <Text style={[styles.removeBtnText, { color: theme.colors.primary }]}>
                                                            🔁 Repeat
                                                        </Text>
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.removeBtn, { flex: 1, alignItems: "center" }]}
                                                        onPress={() => {
                                                            setExpanded(null);
                                                            onRemove(index);
                                                        }}
                                                    >
                                                        <Text style={styles.removeBtnText}>Remove</Text>
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
            {recurringModalIdx !== null && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 200, elevation: 200 }]}>
                    <Pressable style={styles.previewBackdrop} onPress={() => setRecurringModalIdx(null)}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.previewCard}>
                            <Text style={styles.previewTitle}>Repeat Activity</Text>
                            <Text style={styles.previewDescription}>
                                Automatically schedule this activity repeatedly until you sleep.
                            </Text>

                            <View style={{ width: '100%', gap: 12 }}>
                                {[1, 2, 3, 4].map((hours) => (
                                    <Pressable
                                        key={hours}
                                        style={styles.recurringOptionBtn}
                                        onPress={() => {
                                            onMakeRecurring(recurringModalIdx as number, hours);
                                            setRecurringModalIdx(null);
                                        }}
                                    >
                                        <Text style={[styles.recurringOptionText, { color: theme.colors.white }]}>
                                            Every {hours} hour{hours > 1 ? 's' : ''}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

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

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [saving, setSaving] = useState(false);

    // Initial state with default wake/sleep times
    const [wakeTime, setWakeTime] = useState("07:00 AM");
    const [sleepTime, setSleepTime] = useState("10:00 PM");
    const [selectedTasks, setSelectedTasks] = useState<string[]>(["Wake Up", "Sleep"]);
    const [routines, setRoutines] = useState<DraftItem[]>([]);
    const [customActivities, setCustomActivities] = useState<ActivityTemplate[]>([]);

    const addCustomActivity = (activity: ActivityTemplate) => {
        setCustomActivities((prev) => [...prev, activity]);
        // Auto-select it
        setSelectedTasks((prev) => [...prev, activity.task]);
    };

    const toggleTask = (task: string) => {
        setSelectedTasks((prev) =>
            prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
        );
    };

    const handleSkipAll = async () => {
        setSaving(true);
        // Save minimal routine if skipped (just Wake Up and Sleep)
        const minimalItems: RoutineItem[] = [
            { task: "Wake Up", description: "Start your day with a clear mind.", imageKey: "wakeup", time: wakeTime, id: "skip-wakeup", insertionOrder: 1, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
            { task: "Sleep", description: "Rest deeply and recharge.", imageKey: "sleep", time: sleepTime, id: "skip-sleep", insertionOrder: 2, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
        ];
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(minimalItems));
            await AsyncStorage.setItem(SETUP_KEY, "true");
            await scheduleRoutineNotifications(minimalItems);
            router.replace("/(tabs)");
        } catch (e) {
            console.error("Failed to skip setup", e);
            setSaving(false);
        }
    };

    const goToStep3 = () => {
        setStep(3);
    };

    const goToStep4 = () => {
        const allTemplates = [...TEMPLATES, ...customActivities];
        const ordered = allTemplates.filter((t) => selectedTasks.includes(t.task));
        const merged: DraftItem[] = ordered.map((tmpl) => {
            let time = tmpl.defaultTime;
            if (tmpl.task === "Wake Up") time = wakeTime;
            if (tmpl.task === "Sleep") time = sleepTime;

            return {
                task: tmpl.task,
                description: tmpl.description,
                imageKey: tmpl.imageKey,
                time: time,
            };
        });
        setRoutines(merged);
        setStep(4);
    };

    const updateRoutineTime = (index: number, val: string) => {
        const next = [...routines];
        next[index] = { ...next[index], time: val };
        // Sync back to local wake/sleep state if applicable
        if (next[index].task === "Wake Up") setWakeTime(val);
        if (next[index].task === "Sleep") setSleepTime(val);
        setRoutines(next);
    };

    const updateRoutineDesc = (index: number, val: string) => {
        const next = [...routines];
        next[index] = { ...next[index], description: val };
        setRoutines(next);
    };

    const removeItem = (index: number) => {
        const task = routines[index].task;
        setRoutines(routines.filter((_, i) => i !== index));
        setSelectedTasks((prev) => prev.filter((t) => t !== task));
    };

    const handleMakeRecurring = (index: number, hoursInterval: number) => {
        if (hoursInterval <= 0) return;
        const item = routines[index];
        const sleepTimeMinutes = timeToMinutes(sleepTime);
        let currentTimeMinutes = timeToMinutes(item.time) + (hoursInterval * 60);

        const newItems: DraftItem[] = [];

        while (currentTimeMinutes < sleepTimeMinutes) {
            let h = Math.floor(currentTimeMinutes / 60);
            const m = currentTimeMinutes % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';

            if (h === 0) h = 12;
            else if (h > 12) h -= 12;

            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;

            newItems.push({
                ...item,
                time: timeStr
            });

            currentTimeMinutes += (hoursInterval * 60);
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
        }));
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            await AsyncStorage.setItem(SETUP_KEY, "true");
            await scheduleRoutineNotifications(items);
            router.replace("/(tabs)");
        } catch (e) {
            console.error("Failed to save setup data", e);
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>

            {step === 1 && (
                <StepTime
                    stepLabel="Step 1 of 4"
                    title={"When do you\nwake up?"}
                    subtitle="Setting a consistent wake time is the foundation of zen."
                    imageKey="wakeup"
                    time={wakeTime}
                    onUpdateTime={setWakeTime}
                    onNext={() => setStep(2)}
                    onSkip={handleSkipAll}
                />
            )}

            {step === 2 && (
                <StepTime
                    stepLabel="Step 2 of 4"
                    title={"When do you\nsleep?"}
                    subtitle="Rest is where your potential recharges."
                    imageKey="sleep"
                    time={sleepTime}
                    onUpdateTime={setSleepTime}
                    onNext={goToStep3}
                    onBack={() => setStep(1)}
                    onSkip={handleSkipAll}
                />
            )}

            {step === 3 && (
                <StepPick
                    selected={selectedTasks}
                    onToggle={toggleTask}
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
            height: 3,
            backgroundColor: `${theme.colors.primary}18`,
        },
        progressFill: {
            height: 3,
            backgroundColor: theme.colors.primary,
            borderRadius: 2,
        },
        stepHeader: {
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
        },
        headerTop: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
        },
        stepEyebrow: {
            fontSize: 12,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            opacity: 0.45,
            letterSpacing: 1.5,
            textTransform: "uppercase",
        },
        skipBtn: {
            padding: 8,
            marginRight: -8,
        },
        skipText: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            opacity: 0.6,
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
        timePickerContainer: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 80,
        },
        largeIconWrap: {
            width: 140,
            height: 140,
            borderRadius: 36,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
        },
        largeIcon: {
            width: 90,
            height: 90,
        },
        mainTimePicker: {
            width: "80%",
            height: 180,
            backgroundColor: `${theme.colors.background}`,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: `${theme.colors.primary}10`,
            overflow: "hidden",
            justifyContent: "center",
        },
        gridContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            paddingBottom: 140,
            gap: 12,
        },
        gridCard: {
            width: "31%",
            minWidth: 105,
            maxWidth: 160,
            aspectRatio: 0.82,
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: `${theme.colors.primary}10`,
            padding: 8,
            position: "relative",
        },
        gridCardOn: {
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}08`,
        },
        gridCardMandatory: {
            opacity: 0.8,
            backgroundColor: `${theme.colors.primary}05`,
        },
        gridIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
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
            opacity: 0.8,
            textAlign: "center",
        },
        gridLabelOn: {
            opacity: 1,
            fontFamily: theme.fonts.bold,
        },
        gridDescription: {
            fontSize: 9,
            fontFamily: theme.fonts.regular,
            color: theme.colors.secondary,
            opacity: 0.5,
            textAlign: "center",
            marginTop: 2,
            paddingHorizontal: 2,
        },
        checkBadge: {
            position: "absolute",
            top: 6,
            right: 6,
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
        mandatoryBadge: {
            position: "absolute",
            top: 6,
            left: 6,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: `${theme.colors.primary}15`,
            alignItems: "center",
            justifyContent: "center",
        },

        // ─── Search bar ──────────────────────────
        searchBarWrap: {
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 20,
            marginBottom: 10,
            backgroundColor: `${theme.colors.primary}08`,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}10`,
        },
        searchInput: {
            flex: 1,
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            padding: 0,
        },

        // ─── Category pills ──────────────────────
        categoryRow: {
            paddingHorizontal: 16,
            gap: 8,
            paddingVertical: 4,
        },
        categoryPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: `${theme.colors.primary}08`,
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}10`,
        },
        categoryPillActive: {
            backgroundColor: `${theme.colors.primary}18`,
            borderColor: theme.colors.primary,
        },
        categoryEmoji: {
            fontSize: 14,
        },
        categoryLabel: {
            fontSize: 12,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            opacity: 0.6,
        },
        categoryLabelActive: {
            opacity: 1,
            fontFamily: theme.fonts.bold,
        },
        categoryBadge: {
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
            marginLeft: 2,
        },
        categoryBadgeText: {
            fontSize: 10,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
        },

        // ─── Create Custom card ──────────────────
        createCustomCard: {
            width: "31%",
            minWidth: 105,
            maxWidth: 160,
            aspectRatio: 0.82,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: `${theme.colors.primary}25`,
            borderStyle: "dashed" as any,
            padding: 8,
        },
        createCustomIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
        },
        createCustomLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            opacity: 0.5,
            textAlign: "center",
            lineHeight: 15,
        },

        // ─── Custom form (expanded card) ─────────
        customFormCard: {
            width: SCREEN_WIDTH - 40,
            backgroundColor: theme.colors.white,
            borderRadius: 20,
            padding: 16,
            borderWidth: 2,
            borderColor: `${theme.colors.primary}20`,
        },
        customFormTitle: {
            fontSize: 15,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            marginBottom: 10,
        },
        customNameInput: {
            backgroundColor: `${theme.colors.primary}08`,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            borderWidth: 1,
            borderColor: `${theme.colors.primary}10`,
            marginBottom: 10,
        },
        customFormIconLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            opacity: 0.5,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 8,
        },
        iconPickerGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        iconPickerItem: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${theme.colors.primary}0A`,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: `${theme.colors.primary}10`,
        },
        iconPickerItemActive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        customCancelBtn: {
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: `${theme.colors.primary}08`,
            alignItems: "center",
        },
        customCancelText: {
            fontSize: 13,
            fontFamily: theme.fonts.medium,
            color: theme.colors.primary,
            opacity: 0.6,
        },
        customAddBtn: {
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
        },
        customAddText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
        },

        // ─── Floating badge ──────────────────────
        floatingBadge: {
            position: "absolute",
            bottom: 100,
            alignSelf: "center",
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 18,
            paddingVertical: 8,
            borderRadius: 20,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        floatingBadgeText: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.white,
        },

        // ─── Preview Modal ───────────────────────
        previewBackdrop: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
        },
        previewCard: {
            width: "80%",
            maxWidth: 320,
            backgroundColor: theme.colors.white,
            borderRadius: 28,
            padding: 24,
            alignItems: "center",
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 10,
        },
        previewIconWrap: {
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: `${theme.colors.primary}0D`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        previewTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            textAlign: "center",
            marginBottom: 8,
        },
        previewDescription: {
            fontSize: 15,
            fontFamily: theme.fonts.medium,
            color: theme.colors.secondary,
            textAlign: "center",
            lineHeight: 22,
            opacity: 0.8,
            marginBottom: 20,
        },
        previewCategoryWrap: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: `${theme.colors.primary}08`,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            gap: 6,
        },
        previewCategoryEmoji: {
            fontSize: 14,
        },
        previewCategoryLabel: {
            fontSize: 13,
            fontFamily: theme.fonts.bold,
            color: theme.colors.primary,
            opacity: 0.7,
        },

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

        // ─── Recurring Action Sheet ────────────────
        recurringOptionBtn: {
            width: "100%",
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        recurringOptionText: {
            fontSize: 16,
            fontFamily: theme.fonts.bold,
        },
    });