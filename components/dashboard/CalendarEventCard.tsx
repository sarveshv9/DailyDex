import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme } from "../constants/shared";
import { CalendarEvent } from "../utils/calendar";

type Props = {
    event: CalendarEvent;
    theme: Theme;
};

export default function CalendarEventCard({ event, theme }: Props) {
    return (
        <View style={[styles.card, {
            backgroundColor: `${theme.colors.secondary}10`,
            borderLeftColor: theme.colors.secondary,
        }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.secondary}18` }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.secondary} />
            </View>
            <View style={styles.info}>
                <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]} numberOfLines={1}>
                    {event.title}
                </Text>
                <Text style={[styles.time, { color: theme.colors.secondary, fontFamily: theme.fonts.medium }]}>
                    {event.startTime} → {event.endTime}
                </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${theme.colors.secondary}20` }]}>
                <Text style={[styles.badgeText, { color: theme.colors.secondary }]}>Calendar</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderLeftWidth: 3,
        gap: 12,
        marginBottom: 8,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 15,
    },
    time: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "600",
    },
});
