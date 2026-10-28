import { Ionicons } from '@expo/vector-icons';
import {
  MaterialTopTabBarProps,
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from 'expo-router/js-top-tabs';
import {
  ParamListBase,
  TabNavigationState,
} from 'expo-router/react-navigation';
import * as Haptics from '../../utils/haptics';
import { withLayoutContext } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  State as GestureState,
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
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
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(16, insets.bottom + 8);
  const prevIndex = useRef(state.index);

  const tabBarWidth = width * 0.9;
  const tabWidth = tabBarWidth / state.routes.length;
  type TabRoute = (typeof state.routes)[number];

  // Android hardware back button: return to 'index' (Home) tab if on another tab
  useEffect(() => {
    const onBackPress = () => {
      const currentRoute = state.routes[state.index]?.name;
      if (currentRoute !== 'index') {
        navigation.navigate('index');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [state.index, state.routes, navigation]);

  // Use interpolation to move the indicator
  const translateX = position.interpolate({
    inputRange: state.routes.map((_: TabRoute, i: number) => i),
    outputRange: state.routes.map((_: TabRoute, i: number) => i * tabWidth),
  });

  // Reference to track gesture translation
  const [gestureTranslationX] = React.useState(() => new Animated.Value(0));

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

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
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
    <View style={[styles.tabBarContainer, { bottom: bottomOffset }]}>
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
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Clean Flat solid background */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.colors.surface },
            ]}
            pointerEvents="none"
          />
          {/* Background icons (outlined) - each in their own position */}
          {state.routes.map((route: TabRoute, index: number) => {
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
                    color: theme.colors.textSecondary,
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
            {state.routes.map((route: TabRoute, index: number) => {
              const { options } = descriptors[route.key];
              const icon = options.tabBarIcon as (props: {
                focused: boolean;
                color: string;
              }) => React.ReactNode;

              // Calculate the position of each icon relative to the indicator
              const iconTranslateX = position.interpolate({
                inputRange: state.routes.map((_: TabRoute, i: number) => i),
                outputRange: state.routes.map((_: TabRoute, i: number) => (i - index) * tabWidth),
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
                      color: theme.colors.onPrimary,
                    })}
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* The pressable areas, layered on top */}
          {state.routes.map((route: TabRoute, index: number) => {
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
    <GestureHandlerRootView style={styles.root}>
      <MaterialTopTabs
        tabBar={(props: MaterialTopTabBarProps) => <CustomTabBar {...props} />}
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
  root: {
    flex: 1,
  },
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
    elevation: 0,
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
