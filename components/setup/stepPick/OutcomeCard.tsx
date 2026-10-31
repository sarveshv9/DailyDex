import React from "react";
import {
    LayoutAnimation,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    UIManager,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate, OutcomePack } from "./types";
import { computePackCommitment } from "./outcomeData";
import { useTheme } from "../../../context/ThemeContext";
import { themeTokens } from "../../../constants/themeTokens";
import { getRoutineIcon } from "../../../utils/utils";
import * as Haptics from "../../../utils/haptics";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    const isNewArch =
        Boolean((globalThis as any).nativeFabricUIManager) ||
        Boolean((globalThis as any).__turboModuleProxy);
    if (!isNewArch) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface OutcomeCardProps {
    pack: OutcomePack;
    templates: ActivityTemplate[];
    isExpanded: boolean;
    checkedHabits: string[];
    onToggleExpand: () => void;
    onToggleHabit: (habitName: string) => void;
    onToggleAll: () => void;
}

export function OutcomeCard({
    pack,
    templates,
    isExpanded,
    checkedHabits,
    onToggleExpand,
    onToggleHabit,
    onToggleAll,
}: OutcomeCardProps) {
    const { theme } = useTheme();
    const isFullySelected = pack.habits.length > 0 && checkedHabits.length === pack.habits.length;
    const isPartiallySelected = checkedHabits.length > 0 && checkedHabits.length < pack.habits.length;
    const isChosen = checkedHabits.length > 0;
    const commitment = computePackCommitment(pack, templates);

    const handleHeaderPress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.selectionAsync();
        onToggleExpand();
    };

    const handleToggleAllPress = (e: any) => {
        e?.stopPropagation?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleAll();
    };

    const getHabitTemplate = (habitName: string) => {
        return templates.find(
            (t) => t.task.toLowerCase() === habitName.toLowerCase()
        );
    };

    return (
        <View
            style={[
                styles.cardContainer,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: isFullySelected
                        ? theme.colors.primary
                        : isPartiallySelected
                        ? theme.colors.primarySoft
                        : theme.colors.border,
                },
                pack.isHero && styles.heroContainer,
                isChosen && styles.cardChosen,
            ]}
        >
            {/* Header Pressable Area */}
            <Pressable
                onPress={handleHeaderPress}
                accessibilityRole="button"
                accessibilityLabel={`${pack.title} focus pack, ${
                    isFullySelected
                        ? "fully selected"
                        : isPartiallySelected
                        ? `${checkedHabits.length} of ${pack.habits.length} selected`
                        : "not selected"
                }, ${isExpanded ? "expanded" : "collapsed"}`}
                accessibilityState={{ expanded: isExpanded, selected: isChosen }}
                style={[
                    styles.headerPressable,
                    pack.isHero ? styles.heroHeader : styles.standardHeader,
                ]}
            >
                <View style={styles.headerLeft}>
                    {/* Badge / Eyebrow */}
                    {pack.badge && (
                        <View
                            style={[
                                styles.badge,
                                { backgroundColor: theme.colors.primarySoft },
                            ]}
                        >
                            <Ionicons
                                name="sparkles"
                                size={12}
                                color={theme.colors.primary}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                style={[
                                    styles.badgeText,
                                    {
                                        color: theme.colors.primary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                {pack.badge}
                            </Text>
                        </View>
                    )}

                    {/* Title */}
                    <Text
                        style={[
                            styles.packTitle,
                            pack.isHero && styles.heroTitle,
                            {
                                color: theme.colors.text,
                                fontFamily: theme.fonts.bold,
                            },
                        ]}
                    >
                        {pack.title}
                    </Text>

                    {/* One-line promise */}
                    <Text
                        style={[
                            styles.promiseText,
                            {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                        numberOfLines={2}
                    >
                        {pack.promise}
                    </Text>

                    {/* Commitment & Selection Status Line */}
                    <View style={styles.statusLineRow}>
                        <Text
                            style={[
                                styles.commitmentText,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.medium,
                                },
                            ]}
                        >
                            {commitment}
                        </Text>
                        {isFullySelected ? (
                            <View
                                style={[
                                    styles.packStateChip,
                                    { backgroundColor: theme.colors.primarySoft },
                                ]}
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={13}
                                    color={theme.colors.primary}
                                />
                                <Text
                                    style={[
                                        styles.packStateChipText,
                                        { color: theme.colors.primary, fontFamily: theme.fonts.bold },
                                    ]}
                                >
                                    All added
                                </Text>
                            </View>
                        ) : isPartiallySelected ? (
                            <View
                                style={[
                                    styles.packStateChip,
                                    { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.primary, borderWidth: 1 },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.packStateChipText,
                                        { color: theme.colors.primary, fontFamily: theme.fonts.bold },
                                    ]}
                                >
                                    {checkedHabits.length}/{pack.habits.length} selected
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Collapsed Icon Strip */}
                    {!isExpanded && (
                        <View style={styles.iconStrip}>
                            {pack.habits.slice(0, 3).map((habitName) => {
                                const tmpl = getHabitTemplate(habitName);
                                const iconName = getRoutineIcon(tmpl?.imageKey);
                                const isChecked = checkedHabits.includes(habitName);
                                return (
                                    <View
                                        key={habitName}
                                        style={[
                                            styles.iconStripBubble,
                                            {
                                                backgroundColor: isChecked
                                                    ? theme.colors.primarySoft
                                                    : theme.colors.surfaceMuted,
                                                borderColor: isChecked
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={iconName}
                                            size={14}
                                            color={theme.colors.primary}
                                        />
                                    </View>
                                );
                            })}
                            {pack.habits.length > 3 && (
                                <View
                                    style={[
                                        styles.iconStripMoreBubble,
                                        {
                                            backgroundColor:
                                                theme.colors.surfaceMuted,
                                            borderColor: theme.colors.border,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.iconStripMoreText,
                                            {
                                                color: theme.colors
                                                    .textSecondary,
                                                fontFamily: theme.fonts.bold,
                                            },
                                        ]}
                                    >
                                        +{pack.habits.length - 3}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Right Area: Dedicated Toggle-All Badge & expand chevron */}
                <View style={styles.headerRight}>
                    <Pressable
                        onPress={handleToggleAllPress}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isFullySelected
                                ? `Deselect all habits in ${pack.title}`
                                : `Select all habits in ${pack.title}`
                        }
                        style={[
                            styles.checkBadge,
                            {
                                borderColor: isFullySelected
                                    ? theme.colors.primary
                                    : isPartiallySelected
                                    ? theme.colors.primary
                                    : theme.colors.border,
                                backgroundColor: isFullySelected
                                    ? theme.colors.primary
                                    : isPartiallySelected
                                    ? theme.colors.primarySoft
                                    : theme.colors.surfaceMuted,
                            },
                        ]}
                    >
                        {isFullySelected ? (
                            <Ionicons
                                name="checkmark"
                                size={14}
                                color={theme.colors.onPrimary}
                            />
                        ) : isPartiallySelected ? (
                            <Ionicons
                                name="remove"
                                size={14}
                                color={theme.colors.primary}
                            />
                        ) : (
                            <Ionicons
                                name="add"
                                size={14}
                                color={theme.colors.textSecondary}
                            />
                        )}
                    </Pressable>
                    <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.colors.textSecondary}
                        style={{ marginTop: 10 }}
                    />
                </View>
            </Pressable>

            {/* Accordion Expanded Body */}
            {isExpanded && (
                <View
                    style={[
                        styles.expandedBody,
                        { borderTopColor: theme.colors.divider },
                    ]}
                >
                    <View style={styles.expandedHeaderBar}>
                        <Text
                            style={[
                                styles.expandedHint,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.medium,
                                },
                            ]}
                        >
                            {isFullySelected
                                ? `All ${pack.habits.length} habits selected`
                                : isPartiallySelected
                                ? `${checkedHabits.length} of ${pack.habits.length} habits selected`
                                : "Tap + or individual habits to select"}
                        </Text>
                        <Pressable
                            onPress={handleToggleAllPress}
                            hitSlop={8}
                            style={styles.toggleAllBtn}
                        >
                            <Text
                                style={[
                                    styles.toggleAllText,
                                    {
                                        color: theme.colors.primary,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                {isFullySelected ? "Clear pack" : "Select all"}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.habitRowsList}>
                        {pack.habits.map((habitName) => {
                            const isChecked = checkedHabits.includes(habitName);
                            const tmpl = getHabitTemplate(habitName);
                            const iconName = getRoutineIcon(tmpl?.imageKey);

                            return (
                                <Pressable
                                    key={habitName}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onToggleHabit(habitName);
                                    }}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: isChecked }}
                                    accessibilityLabel={`${habitName}, ${isChecked ? "selected" : "not selected"}`}
                                    style={[
                                        styles.habitRow,
                                        {
                                            backgroundColor: isChecked
                                                ? theme.colors.primarySoft
                                                : theme.colors.surfaceMuted,
                                            borderColor: isChecked
                                                ? theme.colors.primary
                                                : theme.colors.border,
                                        },
                                    ]}
                                >
                                    <View style={styles.habitRowLeft}>
                                        <View
                                            style={[
                                                styles.habitRowIconBubble,
                                                {
                                                    backgroundColor: isChecked
                                                        ? theme.colors.primary
                                                        : theme.colors.surface,
                                                    borderColor: isChecked
                                                        ? theme.colors.primary
                                                        : theme.colors.border,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={iconName}
                                                size={16}
                                                color={
                                                    isChecked
                                                        ? theme.colors.onPrimary
                                                        : theme.colors.primary
                                                }
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.habitRowName,
                                                    {
                                                        color: theme.colors.text,
                                                        fontFamily: isChecked
                                                            ? theme.fonts.bold
                                                            : theme.fonts.medium,
                                                    },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {habitName}
                                            </Text>
                                            {tmpl?.minutes ? (
                                                <Text
                                                    style={[
                                                        styles.habitRowMinutes,
                                                        {
                                                            color: theme.colors
                                                                .textSecondary,
                                                            fontFamily:
                                                                theme.fonts.regular,
                                                        },
                                                    ]}
                                                >
                                                    {tmpl.minutes} mins
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    {/* Checkbox box */}
                                    <View
                                        style={[
                                            styles.checkboxBox,
                                            {
                                                borderColor: isChecked
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                                backgroundColor: isChecked
                                                    ? theme.colors.primary
                                                    : theme.colors.surface,
                                            },
                                        ]}
                                    >
                                        {isChecked && (
                                            <Ionicons
                                                name="checkmark"
                                                size={13}
                                                color={theme.colors.onPrimary}
                                            />
                                        )}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 18,
        borderWidth: 1.5,
        marginBottom: 14,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    heroContainer: {
        borderWidth: 2,
    },
    cardChosen: {
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    headerPressable: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
    },
    standardHeader: {
        padding: 16,
    },
    heroHeader: {
        padding: 20,
    },
    headerLeft: {
        flex: 1,
        paddingRight: 12,
    },
    headerRight: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 2,
    },
    badge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: themeTokens.borderRadius.full,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    packTitle: {
        fontSize: 18,
        marginBottom: 4,
    },
    heroTitle: {
        fontSize: 22,
        letterSpacing: -0.3,
    },
    promiseText: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 6,
    },
    commitmentText: {
        fontSize: 12.5,
    },
    statusLineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        flexWrap: "wrap",
    },
    packStateChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    packStateChipText: {
        fontSize: 11,
    },
    expandedHeaderBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    toggleAllBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    toggleAllText: {
        fontSize: 12,
    },
    iconStrip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    iconStripBubble: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    iconStripMoreBubble: {
        paddingHorizontal: 8,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    iconStripMoreText: {
        fontSize: 11,
    },
    checkBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    expandedBody: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 12,
    },
    expandedHint: {
        fontSize: 12,
        marginBottom: 10,
    },
    habitRowsList: {
        gap: 8,
    },
    habitRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 48,
    },
    habitRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    habitRowIconBubble: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    habitRowName: {
        fontSize: 14,
    },
    habitRowMinutes: {
        fontSize: 11.5,
        marginTop: 1,
    },
    checkboxBox: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10,
    },
});
