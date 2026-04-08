import { LogBox } from 'react-native';

// Suppress known Expo SDK 53/54 dev client warnings that run on module initialization
LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    '`expo-notifications` functionality is not fully supported in Expo Go',
    '[expo-av]: Expo AV has been deprecated',
    'setLayoutAnimationEnabledExperimental is currently a no-op'
]);

const originalConsoleError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string') {
        if (args[0].includes('expo-notifications: Android Push notifications') || 
            args[0].includes('expo-notifications` functionality is not fully supported in Expo Go')) {
            return; // completely silent
        }
    }
    originalConsoleError(...args);
};
