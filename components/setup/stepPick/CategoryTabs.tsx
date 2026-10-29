import React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate, CategoryDef, CategoryKey } from "./types";
import { useTheme } from "../../../context/ThemeContext";
import { themeTokens } from "../../../constants/themeTokens";
import * as Haptics from "../../../utils/haptics";

export const CATEGORIES: CategoryDef[] = [
    { key: "morning", label: "Morning", icon: "sunny-outline" },
    { key: "meals", label: "Meals", icon: "restaurant-outline" },
    { key: "fitness", label: "Fitness", icon: "barbell-outline" },
    { key: "productivity", label: "Productivity", icon: "briefcase-outline" },
    { key: "mindfulness", label: "Mindfulness", icon: "leaf-outline" },
    { key: "creative", label: "Creative", icon: "brush-outline" },
    { key: "social", label: "Social", icon: "people-outline" },
    { key: "evening", label: "Evening", icon: "moon-outline" },
];

interface CategoryTabsProps {
    activeCategory: CategoryKey | null;
    isSearchActive: boolean;
    templates: ActivityTemplate[];
    selected: string[];
    onSelectCategory: (category: CategoryKey) => void;
    onToggleSearch: () => void;
}

export function CategoryTabs({
    activeCategory,
    isSearchActive,
    templates,
    selected,
    onSelectCategory,
    onToggleSearch,
}: CategoryTabsProps) {
    const { theme } = useTheme();

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {CATEGORIES.map((cat) => {
                    const isTabActive = !isSearchActive && activeCategory === cat.key;
                    const catCount = templates.filter(
                        (t) => t.category === cat.key && selected.includes(t.task)
                    ).length;

                    return (
                        <Pressable
                            key={cat.key}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onSelectCategory(cat.key);
                            }}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isTabActive }}
                            accessibilityLabel={`${cat.label} category, ${catCount} selected`}
                            style={({ pressed }) => [
                                styles.pill,
                                {
                                    backgroundColor: isTabActive
                                        ? theme.colors.primary
                                        : theme.colors.surface,
                                    borderColor: isTabActive
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                },
                                pressed && styles.pillPressed,
                            ]}
                        >
                            <Ionicons
                                name={cat.icon}
                                size={14}
                                color={
                                    isTabActive
                                        ? theme.colors.onPrimary
                                        : theme.colors.textSecondary
                                }
                            />
                            <Text
                                style={[
                                    styles.pillLabel,
                                    {
                                        color: isTabActive
                                            ? theme.colors.onPrimary
                                            : theme.colors.text,
                                        fontFamily: isTabActive
                                            ? theme.fonts.bold
                                            : theme.fonts.medium,
                                    },
                                ]}
                            >
                                {cat.label}
                            </Text>

                            {catCount > 0 && (
                                <View
                                    style={[
                                        styles.badge,
                                        {
                                            backgroundColor: isTabActive
                                                ? theme.isDarkMode
                                                    ? "rgba(255, 255, 255, 0.28)"
                                                    : "rgba(0, 0, 0, 0.18)"
                                                : theme.colors.primarySoft,
                                            borderColor: isTabActive
                                                ? theme.isDarkMode
                                                    ? "rgba(255, 255, 255, 0.35)"
                                                    : "rgba(0, 0, 0, 0.22)"
                                                : theme.colors.primary,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.badgeText,
                                            {
                                                color: isTabActive
                                                    ? theme.colors.onPrimary
                                                    : theme.colors.primary,
                                                fontFamily: theme.fonts.bold,
                                            },
                                        ]}
                                    >
                                        {catCount}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}

                {/* Search Icon Button at the end */}
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        onToggleSearch();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                        isSearchActive ? "Close search" : "Search habits"
                    }
                    style={({ pressed }) => [
                        styles.searchBtn,
                        {
                            backgroundColor: isSearchActive
                                ? theme.colors.primary
                                : theme.colors.surface,
                            borderColor: isSearchActive
                                ? theme.colors.primary
                                : theme.colors.border,
                        },
                        pressed && styles.pillPressed,
                    ]}
                >
                    <Ionicons
                        name={isSearchActive ? "search" : "search-outline"}
                        size={16}
                        color={
                            isSearchActive
                                ? theme.colors.onPrimary
                                : theme.colors.textSecondary
                        }
                    />
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingVertical: 10,
    },
    scrollContent: {
        paddingHorizontal: 18,
        gap: 8,
        alignItems: "center",
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1.5,
        minHeight: 40,
        gap: 6,
    },
    pillPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
    pillLabel: {
        fontSize: 13,
    },
    badge: {
        minWidth: 19,
        height: 19,
        borderRadius: themeTokens.borderRadius.full,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10.5,
    },
    searchBtn: {
        width: 40,
        height: 40,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
});
