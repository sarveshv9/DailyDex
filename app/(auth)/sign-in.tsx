import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '../../utils/haptics';
import { SETUP_STORAGE_KEY } from '../../constants/storageKeys';

export default function SignInScreen() {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();

  const handleGetStarted = async () => {
    await Haptics.impactAsync();
    try {
      const setup = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
      if (setup === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/setup');
      }
    } catch {
      router.replace('/setup');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
            <Ionicons name="sparkles" size={36} color={theme.colors.primaryText} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to Zen</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your personal, offline-first sanctuary for habits, focus, and daily flow.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleGetStarted}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Get Started with Zen"
          >
            <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.onPrimary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={() => router.push('/terms')} hitSlop={8}>
              <Text style={[styles.legalLink, { color: theme.colors.textSecondary }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.colors.textSecondary, marginHorizontal: 8 }}>•</Text>
            <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
              <Text style={[styles.legalLink, { color: theme.colors.textSecondary }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontFamily: 'UbuntuBold',
    fontSize: 36,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'UbuntuRegular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 360,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  buttonText: {
    fontFamily: 'UbuntuMedium',
    fontSize: 18,
    color: '#FFFFFF',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLink: {
    fontFamily: 'UbuntuRegular',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
