import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Theme, getSharedStyles } from '../constants/shared';

export default function TermsScreen() {
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
                <Text style={styles.title}>Terms of Service</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.paragraph}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                
                <Text style={styles.heading}>1. Acceptance of Terms</Text>
                <Text style={styles.paragraph}>
                    By using the Zen app, you agree to these Terms of Service. If you do not agree, please do not use the app.
                </Text>
                
                <Text style={styles.heading}>2. Use of Service</Text>
                <Text style={styles.paragraph}>
                    The app is provided "as is" to help you manage your daily routines and build mindfulness. We are not liable for any disruptions or inaccuracies in notification deliveries.
                </Text>
                
                <Text style={styles.heading}>3. User Data</Text>
                <Text style={styles.paragraph}>
                    Your data is stored locally. If you delete the app, your data will be permanently lost unless explicitly backed up by the operating system tools.
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
