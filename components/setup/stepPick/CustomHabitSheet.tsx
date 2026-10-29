import React, { useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate, CategoryKey } from "./types";
import { CATEGORIES } from "./CategoryTabs";
import { useTheme } from "../../../context/ThemeContext";
import { themeTokens } from "../../../constants/themeTokens";
import { getRoutineIcon } from "../../../utils/utils";
import * as Haptics from "../../../utils/haptics";

const ICON_CHOICES = [
    "star",
    "sparkles",
    "meditate",
    "breathe",
    "journal",
    "yoga",
    "gym",
    "walk",
    "run",
    "water",
    "coffee",
    "breakfast",
    "read",
    "study",
    "deep_work",
    "draw",
    "music_practice",
    "cycling",
];

interface CustomHabitSheetProps {
    visible: boolean;
    initialCategory: CategoryKey;
    initialName?: string;
    existingTemplates: ActivityTemplate[];
    onClose: () => void;
    onSaveNew: (activity: ActivityTemplate) => void;
    onSelectExisting: (task: string, category: CategoryKey) => void;
}

export function CustomHabitSheet({
    visible,
    initialCategory,
    initialName = "",
    existingTemplates,
    onClose,
    onSaveNew,
    onSelectExisting,
}: CustomHabitSheetProps) {
    const { theme } = useTheme();
    const [name, setName] = useState(initialName);
    const [category, setCategory] = useState<CategoryKey>(
        initialCategory || "morning"
    );
    const [selectedIcon, setSelectedIcon] = useState("star");

    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Check for duplicates (case-insensitive)
        const duplicate = existingTemplates.find(
            (t) =>
                t.task.toLowerCase() === trimmedName.toLowerCase() &&
                t.category === category
        );

        if (duplicate) {
            onSelectExisting(duplicate.task, duplicate.category);
            onClose();
            return;
        }

        const newActivity: ActivityTemplate = {
            task: trimmedName,
            description: `Custom ritual: ${trimmedName}`,
            imageKey: selectedIcon,
            defaultTime: "09:00 AM",
            category: category,
            minutes: 15,
        };

        onSaveNew(newActivity);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={[
                        styles.backdrop,
                        {
                            backgroundColor: theme.isDarkMode
                                ? "rgba(0, 0, 0, 0.75)"
                                : "rgba(0, 0, 0, 0.45)",
                        },
                    ]}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close custom habit sheet"
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.sheetContainer}
                >
                    <View
                        style={[
                            styles.sheetCard,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        {/* Drag Handle Bar matching TaskModal */}
                        <View
                            style={[
                                styles.dragHandle,
                                { backgroundColor: theme.colors.border },
                            ]}
                        />

                        {/* Header */}
                        <View style={styles.sheetHeader}>
                            <Text
                                style={[
                                    styles.sheetTitle,
                                    {
                                        color: theme.colors.text,
                                        fontFamily: theme.fonts.bold,
                                    },
                                ]}
                            >
                                Create Custom Habit
                            </Text>
                            <Pressable
                                onPress={onClose}
                                hitSlop={10}
                                style={[
                                    styles.closeCircleBtn,
                                    {
                                        backgroundColor:
                                            theme.colors.surfaceMuted,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.colors.textSecondary}
                                />
                            </Pressable>
                        </View>

                        {/* Name Input */}
                        <Text
                            style={[
                                styles.sectionLabel,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.bold,
                                },
                            ]}
                        >
                            HABIT NAME
                        </Text>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.colors.surfaceMuted,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                    fontFamily: theme.fonts.medium,
                                },
                            ]}
                            placeholder="e.g. Cold Plunge, Read 1 chapter..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                            maxLength={32}
                            autoFocus
                            accessibilityLabel="Habit name"
                        />

                        {/* Category Selector */}
                        <Text
                            style={[
                                styles.sectionLabel,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.bold,
                                    marginTop: 14,
                                },
                            ]}
                        >
                            CATEGORY
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryPillsRow}
                        >
                            {CATEGORIES.map((cat) => {
                                const isChosen = category === cat.key;
                                return (
                                    <Pressable
                                        key={cat.key}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setCategory(cat.key);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select category ${cat.label}`}
                                        style={[
                                            styles.categoryPill,
                                            {
                                                backgroundColor: isChosen
                                                    ? theme.colors.primary
                                                    : theme.colors.surfaceMuted,
                                                borderColor: isChosen
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={cat.icon}
                                            size={13}
                                            color={
                                                isChosen
                                                    ? theme.colors.onPrimary
                                                    : theme.colors.textSecondary
                                            }
                                            style={{ marginRight: 5 }}
                                        />
                                        <Text
                                            style={[
                                                styles.categoryPillText,
                                                {
                                                    color: isChosen
                                                        ? theme.colors.onPrimary
                                                        : theme.colors.text,
                                                    fontFamily: isChosen
                                                        ? theme.fonts.bold
                                                        : theme.fonts.medium,
                                                },
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Optional Icon Picker */}
                        <Text
                            style={[
                                styles.sectionLabel,
                                {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fonts.bold,
                                    marginTop: 14,
                                },
                            ]}
                        >
                            ICON (OPTIONAL)
                        </Text>
                        <View style={styles.iconsGrid}>
                            {ICON_CHOICES.map((key) => {
                                const isSelected = selectedIcon === key;
                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedIcon(key);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select icon ${key}`}
                                        style={[
                                            styles.iconChoice,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.colors.primary
                                                    : theme.colors.surfaceMuted,
                                                borderColor: isSelected
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={getRoutineIcon(key)}
                                            size={18}
                                            color={
                                                isSelected
                                                    ? theme.colors.onPrimary
                                                    : theme.colors.text
                                            }
                                        />
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Actions */}
                        <View style={styles.actionsRow}>
                            <Pressable
                                style={[
                                    styles.cancelBtn,
                                    {
                                        backgroundColor:
                                            theme.colors.surfaceMuted,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel"
                            >
                                <Text
                                    style={[
                                        styles.cancelBtnText,
                                        {
                                            color: theme.colors.textSecondary,
                                            fontFamily: theme.fonts.bold,
                                        },
                                    ]}
                                >
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.saveBtn,
                                    {
                                        backgroundColor: theme.colors.primary,
                                        opacity:
                                            name.trim().length > 0 ? 1 : 0.45,
                                    },
                                ]}
                                disabled={name.trim().length === 0}
                                onPress={handleSave}
                                accessibilityRole="button"
                                accessibilityLabel="Add Habit"
                            >
                                <Text
                                    style={[
                                        styles.saveBtnText,
                                        {
                                            color: theme.colors.onPrimary,
                                            fontFamily: theme.fonts.bold,
                                        },
                                    ]}
                                >
                                    Add Habit
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    sheetContainer: {
        width: "100%",
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === "android" ? 20 : 16,
    },
    sheetCard: {
        borderRadius: 28,
        borderWidth: 1.5,
        padding: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
        elevation: 8,
    },
    dragHandle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: "center",
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 19,
        letterSpacing: -0.2,
    },
    closeCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    sectionLabel: {
        fontSize: 11,
        letterSpacing: 1.1,
        marginBottom: 8,
    },
    textInput: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    categoryPillsRow: {
        gap: 8,
        paddingVertical: 2,
    },
    categoryPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1.5,
        minHeight: 38,
    },
    categoryPillText: {
        fontSize: 12.5,
    },
    iconsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 9,
        marginTop: 4,
    },
    iconChoice: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    actionsRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 22,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontSize: 15,
    },
    saveBtn: {
        flex: 2,
        height: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2,
    },
    saveBtnText: {
        fontSize: 15,
    },
});
