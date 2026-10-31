import React, { useState, useMemo, useRef } from "react";
import {
    Animated,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate, CategoryKey, StepPickProps } from "./types";
import { OUTCOME_PACKS } from "./outcomeData";
import { TEMPLATES } from "./templates";
import { OutcomeCard } from "./OutcomeCard";
import { SelectedTray } from "./SelectedTray";
import { CategoryTabs, CATEGORIES } from "./CategoryTabs";
import { HabitRow } from "./HabitRow";
import { CustomHabitSheet } from "./CustomHabitSheet";
import { useTheme } from "../../../context/ThemeContext";
import { themeTokens } from "../../../constants/themeTokens";
import * as Haptics from "../../../utils/haptics";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    const isNewArch =
        Boolean((globalThis as any).nativeFabricUIManager) ||
        Boolean((globalThis as any).__turboModuleProxy);
    if (!isNewArch) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface ToastState {
    id: number;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function StepPick({
    selected,
    onToggle,
    onSetSelected,
    onAddCustom,
    onNext,
    onBack,
    onSkip,
    customActivities,
    phase: controlledPhase,
}: StepPickProps) {
    const { theme } = useTheme();

    // Internal Phase fallback: 'start' | 'refine'
    const [internalPhase, setInternalPhase] = useState<"start" | "refine">("start");
    const phase = controlledPhase ?? internalPhase;
    const setPhase = (newPhase: "start" | "refine") => {
        setInternalPhase(newPhase);
    };

    // --- Phase 1: Outcome Packs State ---
    const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
    const [packSelections, setPackSelections] = useState<Record<string, string[]>>({});

    // --- Phase 2: Refine / Library State ---
    const [activeCategory, setActiveCategory] = useState<CategoryKey>("morning");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCustomSheet, setShowCustomSheet] = useState(false);

    // Toast State
    const [toast, setToast] = useState<ToastState | null>(null);
    const [toastAnim] = useState(() => new Animated.Value(0));
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToastMessage = (
        message: string,
        actionLabel?: string,
        onAction?: () => void
    ) => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToast({ id: Date.now(), message, actionLabel, onAction });
        Animated.timing(toastAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
        }).start();

        toastTimeoutRef.current = setTimeout(() => {
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => setToast(null));
        }, 4500);
    };

    const dismissToast = () => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        Animated.timing(toastAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => setToast(null));
    };

    // All combined templates (excluding Wake Up and Sleep anchors which are configured in Steps 1 & 2)
    const allTemplates = useMemo(() => {
        return [...TEMPLATES, ...customActivities].filter(
            (t) =>
                t.task.toLowerCase() !== "wake up" &&
                t.task.toLowerCase() !== "sleep"
        );
    }, [customActivities]);

    // Unique habits across all packs in Phase 1
    const uniquePacksHabits = useMemo(() => {
        const allChecked = Object.values(packSelections).flat();
        return Array.from(new Set(allChecked));
    }, [packSelections]);

    // Accordion toggle in Phase 1 (expand/collapse preview without auto-selecting)
    const handleTogglePackExpand = (packId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.selectionAsync();
        setExpandedPackId((prev) => (prev === packId ? null : packId));
    };

    // Toggle all habits in an outcome pack
    const handleToggleAllPackHabits = (packId: string) => {
        const pack = OUTCOME_PACKS.find((p) => p.id === packId);
        if (!pack) return;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setPackSelections((prev) => {
            const current = prev[packId] || [];
            const isAllSelected = current.length === pack.habits.length;
            const updated = isAllSelected ? [] : [...pack.habits];
            return {
                ...prev,
                [packId]: updated,
            };
        });
    };

    // Toggle single habit within an outcome pack
    const handleToggleHabitInPack = (packId: string, habitName: string) => {
        setPackSelections((prev) => {
            const current = prev[packId] || [];
            const exists = current.includes(habitName);
            const updated = exists
                ? current.filter((h) => h !== habitName)
                : [...current, habitName];
            return {
                ...prev,
                [packId]: updated,
            };
        });
    };

    // Phase 1 Continue
    const handlePhase1Continue = () => {
        if (uniquePacksHabits.length === 0) {
            onNext();
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const previousSelection = [...selected];
        const newMergedSelection = Array.from(
            new Set([...selected, ...uniquePacksHabits])
        );

        if (onSetSelected) {
            onSetSelected(newMergedSelection);
        } else {
            uniquePacksHabits.forEach((task) => {
                if (!selected.includes(task)) {
                    onToggle(task);
                }
            });
        }

        const addedCount = newMergedSelection.length - previousSelection.length;
        if (addedCount > 0) {
            showToastMessage(
                `Added ${addedCount} habit${addedCount > 1 ? "s" : ""} from focus packs`,
                "Undo",
                () => {
                    if (onSetSelected) {
                        onSetSelected(previousSelection);
                    }
                    showToastMessage("Selection restored");
                }
            );
        }

        onNext();
    };

    // Filtered templates for Phase 2
    const filteredTemplates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query.length > 0) {
            return allTemplates.filter(
                (t) =>
                    t.task.toLowerCase().includes(query) ||
                    t.description.toLowerCase().includes(query)
            );
        }

        // Active category list
        return allTemplates.filter((t) => t.category === activeCategory);
    }, [allTemplates, searchQuery, activeCategory]);

    const isCategoryExpanded = !!expandedCategories[activeCategory];

    const displayedTemplates = useMemo(() => {
        if (searchQuery.trim().length > 0) {
            return filteredTemplates;
        }
        if (isCategoryExpanded) {
            return filteredTemplates;
        }
        return filteredTemplates.slice(0, 5);
    }, [filteredTemplates, searchQuery, isCategoryExpanded]);

    const toggleCategoryExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.selectionAsync();
        setExpandedCategories((prev) => ({
            ...prev,
            [activeCategory]: !prev[activeCategory],
        }));
    };

    // Custom habit save handlers
    const handleSaveNewCustom = (newHabit: ActivityTemplate) => {
        onAddCustom(newHabit);
        setActiveCategory(newHabit.category);
        setSearchQuery("");
        setIsSearchOpen(false);
        showToastMessage(`"${newHabit.task}" added`);
    };

    const handleSelectExistingCustom = (task: string, cat: CategoryKey) => {
        if (!selected.includes(task)) {
            onToggle(task);
        }
        setActiveCategory(cat);
        setSearchQuery("");
        setIsSearchOpen(false);
        showToastMessage(`"${task}" selected`);
    };

    const handleToggleHabitWithFeedback = (task: string) => {
        const isRemoving = selected.includes(task);
        onToggle(task);
        if (isRemoving) {
            showToastMessage(`Removed "${task}"`, "Undo", () => {
                onToggle(task);
            });
        } else {
            showToastMessage(`Added "${task}"`);
        }
    };


    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text
                        style={[
                            styles.stepEyebrow,
                            {
                                color: theme.colors.primary,
                                fontFamily: theme.fonts.bold,
                            },
                        ]}
                    >
                        {phase === "refine"
                            ? "Step 4 of 5 · Habits"
                            : "Step 3 of 5 · Focus"}
                    </Text>

                    <Pressable
                        onPress={onSkip}
                        style={styles.skipBtn}
                        hitSlop={10}
                    >
                        <Text
                            style={[
                                styles.skipText,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.medium,
                                },
                            ]}
                        >
                            Skip All
                        </Text>
                    </Pressable>
                </View>

                {phase === "start" ? (
                    <>
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: theme.colors.text,
                                    fontFamily: theme.fonts.bold,
                                },
                            ]}
                        >
                            What do you want more of?
                        </Text>
                        <Text
                            style={[
                                styles.subtitle,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.regular,
                                },
                            ]}
                        >
                            {"Choose one or two. Peek inside and drop anything you don't want."}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: theme.colors.text,
                                    fontFamily: theme.fonts.bold,
                                },
                            ]}
                        >
                            Curate your habits
                        </Text>
                        <Text
                            style={[
                                styles.subtitle,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.regular,
                                },
                            ]}
                        >
                            Choose habits to build your daily momentum. Start with as few as you like.
                        </Text>
                    </>
                )}
            </View>

            {/* PHASE 1: START (Outcome Packs) */}
            {phase === "start" && (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.phase1Scroll}
                        showsVerticalScrollIndicator={false}
                    >
                        {OUTCOME_PACKS.map((pack) => {
                            const isExpanded = expandedPackId === pack.id;
                            const checked = packSelections[pack.id] || [];
                            return (
                                <OutcomeCard
                                    key={pack.id}
                                    pack={pack}
                                    templates={allTemplates}
                                    isExpanded={isExpanded}
                                    checkedHabits={checked}
                                    onToggleExpand={() =>
                                        handleTogglePackExpand(pack.id)
                                    }
                                    onToggleHabit={(habit) =>
                                        handleToggleHabitInPack(pack.id, habit)
                                    }
                                    onToggleAll={() =>
                                        handleToggleAllPackHabits(pack.id)
                                    }
                                />
                            );
                        })}

                        {/* Quiet bottom text link to build from scratch */}
                        <Pressable
                            onPress={() => {
                                Haptics.selectionAsync();
                                onNext();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Build your own from scratch"
                            style={styles.buildScratchLink}
                        >
                            <Text
                                style={[
                                    styles.buildScratchText,
                                    {
                                        color: theme.colors.textSecondary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                {"I'll build my own from scratch"}
                            </Text>
                        </Pressable>
                    </ScrollView>

                    {/* Phase 1 Sticky Bottom CTA */}
                    <View
                        style={[
                            styles.bottomBar,
                            {
                                backgroundColor: theme.colors.surface,
                                borderTopColor: theme.colors.divider,
                            },
                        ]}
                    >
                        <Pressable
                            style={[
                                styles.backAnchorBtn,
                                {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                },
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                onBack();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Back to previous step"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={18}
                                color={theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.backBtnText,
                                    {
                                        color: theme.colors.text,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                Back
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.continueBtn,
                                {
                                    backgroundColor: theme.colors.primary,
                                    shadowColor: theme.colors.primary,
                                },
                            ]}
                            onPress={
                                uniquePacksHabits.length > 0
                                    ? handlePhase1Continue
                                    : onNext
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Next Step"
                        >
                            <Text
                                style={[
                                    styles.continueBtnText,
                                    {
                                        color: theme.colors.onPrimary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                Next Step
                            </Text>
                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={theme.colors.onPrimary}
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* PHASE 2: REFINE (Library, Search, Custom) */}
            {phase === "refine" && (
                <View style={{ flex: 1 }}>
                    {/* Sticky Tray at Top */}
                    <SelectedTray
                        selected={selected}
                        templates={allTemplates}
                        onRemove={handleToggleHabitWithFeedback}
                    />

                    {/* Category Tabs */}
                    <CategoryTabs
                        activeCategory={activeCategory}
                        isSearchActive={searchQuery.trim().length > 0}
                        templates={allTemplates}
                        selected={selected}
                        onSelectCategory={(cat) => {
                            setActiveCategory(cat);
                            setSearchQuery("");
                        }}
                        onToggleSearch={() => {
                            setIsSearchOpen((prev) => !prev);
                            if (isSearchOpen) {
                                setSearchQuery("");
                            }
                        }}
                    />

                    {/* Collapsible Search Input */}
                    {isSearchOpen && (
                        <View
                            style={[
                                styles.searchBox,
                                {
                                    backgroundColor: theme.colors.surfaceMuted,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="search-outline"
                                size={18}
                                color={theme.colors.textSecondary}
                                style={{ marginRight: 8 }}
                            />
                            <TextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        color: theme.colors.text,
                                        fontFamily: theme.fonts.medium,
                                    },
                                ]}
                                placeholder="Search all habits…"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <Pressable
                                    onPress={() => setSearchQuery("")}
                                    hitSlop={10}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={18}
                                        color={theme.colors.textSecondary}
                                    />
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Main Habits List */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.phase2Scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {displayedTemplates.length === 0 ? (
                            <View style={styles.emptySearchWrap}>
                                <Text
                                    style={[
                                        styles.emptySearchText,
                                        {
                                            color: theme.colors.textSecondary,
                                            fontFamily: theme.fonts.medium,
                                        },
                                    ]}
                                >
                                    No match. Add it as your own habit below.
                                </Text>
                                <Pressable
                                    style={[
                                        styles.addCustomFromSearchBtn,
                                        {
                                            backgroundColor:
                                                theme.colors.primarySoft,
                                            borderColor: theme.colors.primary,
                                        },
                                    ]}
                                    onPress={() => setShowCustomSheet(true)}
                                >
                                    <Ionicons
                                        name="add"
                                        size={16}
                                        color={theme.colors.primary}
                                    />
                                    <Text
                                        style={[
                                            styles.addCustomFromSearchText,
                                            {
                                                color: theme.colors.primary,
                                                fontFamily: theme.fonts.bold,
                                            },
                                        ]}
                                    >
                                        Add &quot;{searchQuery.trim()}&quot;
                                    </Text>
                                </Pressable>
                            </View>
                        ) : (
                            displayedTemplates.map((template) => {
                                const isSelected = selected.includes(
                                    template.task
                                );
                                return (
                                    <HabitRow
                                        key={template.task}
                                        template={template}
                                        isSelected={isSelected}
                                        onToggle={handleToggleHabitWithFeedback}
                                    />
                                );
                            })
                        )}

                        {/* See All N in Category Expand Row */}
                        {!isSearchOpen &&
                            filteredTemplates.length > 5 &&
                            !isCategoryExpanded && (
                                <Pressable
                                    style={[
                                        styles.seeAllBtn,
                                        {
                                            borderColor: theme.colors.border,
                                            backgroundColor:
                                                theme.colors.surfaceMuted,
                                        },
                                    ]}
                                    onPress={toggleCategoryExpand}
                                    accessibilityRole="button"
                                    accessibilityLabel={`See all ${filteredTemplates.length} habits in category`}
                                >
                                    <Text
                                        style={[
                                            styles.seeAllText,
                                            {
                                                color: theme.colors.primary,
                                                fontFamily: theme.fonts.bold,
                                            },
                                        ]}
                                    >
                                        See all {filteredTemplates.length} in{" "}
                                        {
                                            CATEGORIES.find(
                                                (c) => c.key === activeCategory
                                            )?.label
                                        }
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={16}
                                        color={theme.colors.primary}
                                    />
                                </Pressable>
                            )}

                        {/* Dashed "+ Add your own" Row */}
                        <Pressable
                            style={[
                                styles.addCustomRow,
                                {
                                    borderColor: theme.colors.primary,
                                    backgroundColor: theme.colors.primarySoft,
                                },
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                setShowCustomSheet(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Add custom habit"
                        >
                            <Ionicons
                                name="add-circle-outline"
                                size={20}
                                color={theme.colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <Text
                                style={[
                                    styles.addCustomText,
                                    {
                                        color: theme.colors.primary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                + Add your own
                            </Text>
                        </Pressable>
                    </ScrollView>

                    {/* Phase 2 Sticky Bottom CTA */}
                    <View
                        style={[
                            styles.bottomBar,
                            {
                                backgroundColor: theme.colors.surface,
                                borderTopColor: theme.colors.divider,
                            },
                        ]}
                    >
                        <Pressable
                            style={[
                                styles.backAnchorBtn,
                                {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                },
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                onBack();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Back to previous step"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={18}
                                color={theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.backBtnText,
                                    {
                                        color: theme.colors.text,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                Back
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.continueBtn,
                                {
                                    backgroundColor: theme.colors.primary,
                                    shadowColor: theme.colors.primary,
                                },
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                onNext();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Next Step"
                        >
                            <Text
                                style={[
                                    styles.continueBtnText,
                                    {
                                        color: theme.colors.onPrimary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                Next Step
                            </Text>
                            <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={theme.colors.onPrimary}
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Custom Habit Sheet Modal */}
            <CustomHabitSheet
                visible={showCustomSheet}
                initialCategory={activeCategory}
                initialName={searchQuery}
                existingTemplates={allTemplates}
                onClose={() => setShowCustomSheet(false)}
                onSaveNew={handleSaveNewCustom}
                onSelectExisting={handleSelectExistingCustom}
            />

            {/* Floating Toast Alert */}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [20, 0],
                                    }),
                                },
                            ],
                            backgroundColor: theme.isDarkMode
                                ? theme.colors.surface
                                : theme.colors.text,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.toastMessage,
                            {
                                color: theme.isDarkMode
                                    ? theme.colors.text
                                    : theme.colors.background,
                                fontFamily: theme.fonts.medium,
                            },
                        ]}
                    >
                        {toast.message}
                    </Text>
                    {toast.actionLabel && toast.onAction && (
                        <Pressable
                            onPress={() => {
                                toast.onAction?.();
                                dismissToast();
                            }}
                            hitSlop={8}
                            style={styles.toastActionBtn}
                        >
                            <Text
                                style={[
                                    styles.toastActionText,
                                    {
                                        color: theme.colors.primary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                {toast.actionLabel}
                            </Text>
                        </Pressable>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 22,
        paddingTop: 8,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        minHeight: 32,
    },
    backLink: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingRight: 10,
    },
    backLinkText: {
        fontSize: 14,
        marginLeft: 2,
    },
    stepEyebrow: {
        fontSize: 12,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    skipBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        minHeight: 44,
        justifyContent: "center",
    },
    skipText: {
        fontSize: 13,
    },
    title: {
        fontSize: 26,
        letterSpacing: -0.4,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
    },
    phase1Scroll: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    buildScratchLink: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        minHeight: 44,
        marginTop: 6,
    },
    buildScratchText: {
        fontSize: 14,
        textDecorationLine: "underline",
    },
    phase2Scroll: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 30,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        height: "100%",
    },
    emptySearchWrap: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptySearchText: {
        fontSize: 14,
        marginBottom: 14,
        textAlign: "center",
    },
    addCustomFromSearchBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1.5,
    },
    addCustomFromSearchText: {
        fontSize: 13,
        marginLeft: 6,
    },
    seeAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        marginVertical: 8,
        minHeight: 46,
        gap: 6,
    },
    seeAllText: {
        fontSize: 13,
    },
    addCustomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: "dashed",
        marginTop: 8,
        marginBottom: 16,
        minHeight: 52,
    },
    addCustomText: {
        fontSize: 14,
    },
    bottomBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 4,
    },
    backAnchorBtn: {
        height: 56,
        paddingHorizontal: 24,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    backBtnText: {
        fontSize: 16,
    },
    continueBtn: {
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
    continueBtnText: {
        fontSize: 17,
    },
    toastContainer: {
        position: "absolute",
        bottom: 84,
        left: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        zIndex: 900,
        elevation: 10,
    },
    toastMessage: {
        fontSize: 13.5,
        flex: 1,
    },
    toastActionBtn: {
        marginLeft: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    toastActionText: {
        fontSize: 13.5,
    },
});
