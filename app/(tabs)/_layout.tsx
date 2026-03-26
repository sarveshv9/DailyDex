import { Ionicons } from '@expo/vector-icons';
import {
  MaterialTopTabBarProps,
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import {
  ParamListBase,
  TabNavigationState,
} from '@react-navigation/native';
import * as Haptics from '../../utils/haptics';
import { withLayoutContext } from 'expo-router';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureHandlerRootView,
  State as GestureState,
  PanGestureHandler
} from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

function CustomTabBar({
  state,
  descriptors,
  navigation,
  position,
}: MaterialTopTabBarProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const prevIndex = useRef(state.index);

  const tabBarWidth = width * 0.9;
  const tabWidth = tabBarWidth / state.routes.length;

  // Use interpolation to move the indicator
  const translateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabWidth),
  });

  // Reference to track gesture translation
  const gestureTranslationX = React.useRef(new Animated.Value(0)).current;

  // Add haptic feedback when screen swipe changes tabs
  useEffect(() => {
    if (prevIndex.current !== state.index) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      prevIndex.current = state.index;
    }
  }, [state.index]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: gestureTranslationX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { translationX, velocityX } = event.nativeEvent;

      // Determine if we should switch tabs based on swipe distance or velocity
      const shouldSwitch = Math.abs(translationX) > tabWidth / 3 || Math.abs(velocityX) > 500;

      if (shouldSwitch) {
        let targetIndex = state.index;

        if (translationX > 0 || velocityX > 0) {
          // Swipe right - go to previous tab
          targetIndex = Math.max(0, state.index - 1);
        } else if (translationX < 0 || velocityX < 0) {
          // Swipe left - go to next tab
          targetIndex = Math.min(state.routes.length - 1, state.index + 1);
        }

        if (targetIndex !== state.index) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate(state.routes[targetIndex].name, { merge: true });
        }
      }
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-15, 15]}
        failOffsetY={[-25, 25]}
      >
        <Animated.View
          style={[
            styles.tabBar,
            {
              width: tabBarWidth,
              borderWidth: 1,
              borderColor: theme.glass.borderColor,
            },
          ]}
        >
          {/* Blur background */}
          <BlurView
            intensity={100}
            tint={theme.colors.background === '#FFFFFF' || theme.colors.background.startsWith('#F') ? 'systemMaterialLight' : 'systemMaterialDark'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Glass tint overlay */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.cardBg }]} />
          {/* Background icons (outlined) - each in their own position */}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const icon = options.tabBarIcon as (props: {
              focused: boolean;
              color: string;
            }) => React.ReactNode;

            return (
              <View
                key={`bg-${route.key}`}
                style={[styles.backgroundIconContainer, { left: index * tabWidth, width: tabWidth }]}
              >
                <View style={styles.iconWrapper}>
                  {icon({
                    focused: false,
                    color: theme.colors.secondary,
                  })}
                </View>
              </View>
            );
          })}

          {/* The beautiful sliding pill indicator with foreground icons */}
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth,
                backgroundColor: theme.colors.primary,
                transform: [{ translateX }],
              },
            ]}
          >
            {/* Foreground icons (filled) - these are revealed as the indicator moves */}
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const icon = options.tabBarIcon as (props: {
                focused: boolean;
                color: string;
              }) => React.ReactNode;

              // Calculate the position of each icon relative to the indicator
              const iconTranslateX = position.interpolate({
                inputRange: state.routes.map((_, i) => i),
                outputRange: state.routes.map((_, i) => (i - index) * tabWidth),
              });

              return (
                <Animated.View
                  key={`fg-${route.key}`}
                  style={[
                    styles.foregroundIconContainer,
                    {
                      transform: [{ translateX: iconTranslateX }],
                    },
                  ]}
                >
                  <View style={styles.iconWrapper}>
                    {icon({
                      focused: true,
                      color: theme.colors.white,
                    })}
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* The pressable areas, layered on top */}
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              // Only fire haptic if we're actually switching tabs
              if (!isFocused) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, { merge: true });
              }
            };

            const onLongPress = () =>
              navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <Pressable
                key={`touch-${route.key}`}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [styles.tabBarButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.iconWrapper} />
              </Pressable>
            );
          })}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MaterialTopTabs
        tabBar={(props) => <CustomTabBar {...props} />}
        tabBarPosition="bottom"
        initialRouteName="index"
        screenOptions={{
          tabBarShowLabel: false,
          animationEnabled: true,
          swipeEnabled: true, // Enable swipe on screen content
        }}
      >
        <MaterialTopTabs.Screen
          name="todo"
          options={{
            tabBarLabel: 'Tasks',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'clipboard' : 'clipboard-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="profile"
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </MaterialTopTabs>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 99,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  tabBarButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2, // Ensure buttons are on top
  },
  iconWrapper: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: 99,
    flexDirection: 'row',
    zIndex: 1,
    overflow: 'hidden', // Clip the icons to the pill shape
  },
  backgroundIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    height: '100%',
    zIndex: 0,
  },
  foregroundIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
});