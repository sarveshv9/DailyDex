import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Theme, getSharedStyles } from '../constants/shared';

export default function PrivacyScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);
    const sharedStyles = useMemo(() => getSharedStyles(theme), [theme]);
    
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={({ pressed }) => [
                        styles.backBtn,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }
                    ]}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.title}>Privacy Policy</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.paragraph}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                <Text style={styles.paragraph}>
                    Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use the Zen app.
                </Text>
                
                <Text style={styles.heading}>1. Data Collection</Text>
                <Text style={styles.paragraph}>
                    All your routine data, statistics, and preferences are stored locally on your device using AsyncStorage. We do not transmit your personal data to remote servers.
                </Text>
                
                <Text style={styles.heading}>2. Notifications</Text>
                <Text style={styles.paragraph}>
                    We request notification permissions solely to remind you of your daily routines locally on your device.
                </Text>

                <Text style={styles.heading}>3. Changes</Text>
                <Text style={styles.paragraph}>
                    We may update this Privacy Policy from time to time. Any changes will be reflected in this screen.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth, 
        borderBottomColor: theme.colors.secondary + '20' 
    },
    backBtn: { 
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.secondary + '15',
    },
    title: { 
        fontSize: 18, 
        fontFamily: theme.fonts.bold,
        color: theme.colors.text 
    },
    placeholder: { width: 40 },
    content: { 
        padding: theme.spacing.xl, 
        paddingBottom: 60 
    },
    heading: { 
        fontSize: 18, 
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginTop: 32, 
        marginBottom: 12 
    },
    paragraph: { 
        fontSize: 15, 
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary, 
        lineHeight: 24, 
        marginBottom: 16 
    },
});
