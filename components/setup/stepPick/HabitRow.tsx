import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityTemplate } from "./types";
import { useTheme } from "../../../context/ThemeContext";
import { getRoutineIcon } from "../../../utils/utils";
import * as Haptics from "../../../utils/haptics";

interface HabitRowProps {
    template: ActivityTemplate;
    isSelected: boolean;
    onToggle: (task: string) => void;
}

export function HabitRow({ template, isSelected, onToggle }: HabitRowProps) {
    const { theme } = useTheme();
    const iconName = getRoutineIcon(template.imageKey);

    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync();
                onToggle(template.task);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${template.task}, ${isSelected ? "selected" : "not selected"}`}
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor: isSelected
                        ? theme.colors.primarySoft
                        : theme.colors.surface,
                    borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                },
                pressed && styles.rowPressed,
            ]}
        >
            {/* Left: Icon bubble */}
            <View
                style={[
                    styles.iconBox,
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
                    name={iconName}
                    size={17}
                    color={
                        isSelected ? theme.colors.onPrimary : theme.colors.primary
                    }
                />
            </View>

            {/* Center: Info */}
            <View style={styles.contentWrap}>
                <Text
                    style={[
                        styles.taskName,
                        {
                            color: theme.colors.text,
                            fontFamily: isSelected
                                ? theme.fonts.bold
                                : theme.fonts.medium,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {template.task}
                </Text>
                {template.minutes ? (
                    <Text
                        style={[
                            styles.subText,
                            {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                    >
                        {template.minutes} mins · {template.defaultTime}
                    </Text>
                ) : (
                    <Text
                        style={[
                            styles.subText,
                            {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fonts.regular,
                            },
                        ]}
                    >
                        {template.defaultTime}
                    </Text>
                )}
            </View>

            {/* Right: Check indicator */}
            <View
                style={[
                    styles.checkIndicator,
                    {
                        borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                        backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                    },
                ]}
            >
                {isSelected && (
                    <Ionicons
                        name="checkmark"
                        size={13}
                        color={theme.colors.onPrimary}
                    />
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        minHeight: 56,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    rowPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    contentWrap: {
        flex: 1,
        paddingRight: 8,
    },
    taskName: {
        fontSize: 14.5,
        marginBottom: 2,
    },
    subText: {
        fontSize: 12,
    },
    checkIndicator: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
