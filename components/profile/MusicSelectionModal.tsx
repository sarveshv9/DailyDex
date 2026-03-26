// components/profile/MusicSelectionModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import React, { useMemo } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SONG_LIST } from "../../constants/songs";
import { Theme } from "../../constants/shared";
import { BottomSheet } from "./BottomSheet";

type MusicSelectionModalProps = {
    visible: boolean;
    onClose: () => void;
    currentTheme: Theme;
    activeSongId: number;
    onSelectSong: (id: number) => void;
};

export function MusicSelectionModal({
    visible, onClose, currentTheme,
    activeSongId, onSelectSong,
}: MusicSelectionModalProps) {
    const styles = useMemo(() => getStyles(currentTheme), [currentTheme]);

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            theme={currentTheme}
            title="Focus Music"
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.listContainer}>
                    {/* None Option */}
                    <Pressable
                        onPress={() => {
                            if (activeSongId === 0) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onSelectSong(0);
                            setTimeout(() => onClose(), 300);
                        }}
                        style={({ pressed }) => [
                            styles.songRow,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                         <View style={[styles.iconBox, { backgroundColor: `${currentTheme.colors.secondary}15` }]}>
                            <Ionicons name="volume-mute-outline" size={20} color={currentTheme.colors.secondary} />
                        </View>
                        <Text style={[styles.songLabel, activeSongId === 0 && { color: currentTheme.colors.primary, fontFamily: currentTheme.fonts.bold }]}>
                            None
                        </Text>
                        {activeSongId === 0 && (
                            <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primary} />
                        )}
                    </Pressable>
                    <View style={styles.separator} />

                    {SONG_LIST.map((song, index) => {
                        const isApplied = activeSongId === song.id;
                        return (
                            <View key={song.id}>
                                <Pressable
                                    onPress={() => {
                                        if (isApplied) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        onSelectSong(song.id);
                                        // Auto-close on selection
                                        setTimeout(() => onClose(), 300);
                                    }}
                                    style={({ pressed }) => [
                                        styles.songRow,
                                        pressed && { opacity: 0.7 },
                                    ]}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: `${currentTheme.colors.primary}15` }]}>
                                        <Ionicons name="musical-notes-outline" size={20} color={currentTheme.colors.primary} />
                                    </View>
                                    
                                    <Text style={[styles.songLabel, isApplied && { color: currentTheme.colors.primary, fontFamily: currentTheme.fonts.bold }]}>
                                        {song.title}
                                    </Text>

                                    {isApplied && (
                                        <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.primary} />
                                    )}
                                </Pressable>
                                {index < SONG_LIST.length - 1 && <View style={styles.separator} />}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    scrollContent: {
        paddingBottom: 24,
    },
    listContainer: {
        backgroundColor: `${theme.colors.secondary}0D`,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
    },
    songRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    songLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: `${theme.colors.secondary}20`,
    },
});
