import React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate } from "./types";
import { useTheme } from "../../../context/ThemeContext";
import { themeTokens } from "../../../constants/themeTokens";
import { getRoutineIcon } from "../../../utils/utils";
import * as Haptics from "../../../utils/haptics";

interface SelectedTrayProps {
    selected: string[];
    templates: ActivityTemplate[];
    onRemove: (task: string) => void;
}

export function SelectedTray({
    selected,
    templates,
    onRemove,
}: SelectedTrayProps) {
    const { theme } = useTheme();
    const count = selected.length;
    const isMet = count >= 3;
    const statusNote =
        count >= 3
            ? "✓ strong rhythm"
            : count > 0
            ? "building momentum"
            : "recommended 3";

    const getIconKey = (task: string) => {
        const tmpl = templates.find(
            (t) => t.task.toLowerCase() === task.toLowerCase()
        );
        return tmpl?.imageKey;
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.divider,
                },
            ]}
        >
            {/* Header row: Count & status + 3-segment meter */}
            <View style={styles.headerRow}>
                <View style={styles.statusWrap}>
                    <Text
                        style={[
                            styles.statusText,
                            {
                                color: isMet
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                fontFamily: theme.fonts.bold,
                            },
                        ]}
                    >
                        {count}{" "}
                        <Text
                            style={{
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.regular,
                            }}
                        >
                            selected ·{" "}
                        </Text>
                        <Text
                            style={{
                                color: isMet
                                    ? theme.colors.primary
                                    : theme.colors.textSecondary,
                                fontFamily: theme.fonts.bold,
                            }}
                        >
                            {statusNote}
                        </Text>
                    </Text>
                </View>

                {/* 3-Segment Progress Meter */}
                <View style={styles.meterContainer}>
                    {[1, 2, 3].map((segIndex) => {
                        const isFilled = count >= segIndex;
                        return (
                            <View
                                key={segIndex}
                                style={[
                                    styles.meterSegment,
                                    {
                                        backgroundColor: isFilled
                                            ? theme.colors.primary
                                            : theme.colors.surfaceMuted,
                                        borderColor: isFilled
                                            ? theme.colors.primary
                                            : theme.colors.border,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>

            {/* Horizontally scrollable removable chips */}
            {count === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name="hand-left-outline"
                        size={16}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        style={[
                            styles.emptyText,
                            {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                    >
                        Nothing yet. Tap habits below.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContent}
                >
                    {selected.map((task) => {
                        const iconKey = getIconKey(task);
                        const iconName = getRoutineIcon(iconKey);

                        return (
                            <Pressable
                                key={task}
                                onPress={() => {
                                    Haptics.impactAsync(
                                        Haptics.ImpactFeedbackStyle.Light
                                    );
                                    onRemove(task);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${task}`}
                                hitSlop={6}
                                style={({ pressed }) => [
                                    styles.chip,
                                    {
                                        backgroundColor: theme.colors.primarySoft,
                                        borderColor: theme.colors.primary,
                                    },
                                    pressed && styles.chipPressed,
                                ]}
                            >
                                <Ionicons
                                    name={iconName}
                                    size={14}
                                    color={theme.colors.primary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text
                                    style={[
                                        styles.chipText,
                                        {
                                            color: theme.colors.primary,
                                            fontFamily: theme.fonts.bold,
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {task}
                                </Text>
                                <Ionicons
                                    name="close-circle"
                                    size={16}
                                    color={theme.colors.primary}
                                    style={{ marginLeft: 6 }}
                                />
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}

            {/* Gentle 10+ Nudge */}
            {count >= 10 && (
                <View
                    style={[
                        styles.nudgeBanner,
                        {
                            backgroundColor: theme.colors.surfaceMuted,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    <Ionicons
                        name="bulb-outline"
                        size={16}
                        color={theme.colors.primary}
                        style={{ marginRight: 8 }}
                    />
                    <Text
                        style={[
                            styles.nudgeText,
                            {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.medium,
                            },
                        ]}
                    >
                        Start with fewer for better consistency. Around 5 works
                        well.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderBottomWidth: StyleSheet.hairlineWidth,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    statusWrap: {
        flex: 1,
    },
    statusText: {
        fontSize: 13,
    },
    meterContainer: {
        flexDirection: "row",
        gap: 5,
        alignItems: "center",
    },
    meterSegment: {
        width: 24,
        height: 6,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1,
    },
    emptyContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
    },
    emptyText: {
        fontSize: 13,
        fontStyle: "italic",
    },
    chipsScrollContent: {
        gap: 8,
        paddingVertical: 4,
        alignItems: "center",
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: themeTokens.borderRadius.full,
        borderWidth: 1.5,
        minHeight: 36,
    },
    chipPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
    chipText: {
        fontSize: 12.5,
        maxWidth: 160,
    },
    nudgeBanner: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    nudgeText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
});
