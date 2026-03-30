import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';
import HomeScreen from '../screens/HomeScreen';
import RecapScreen from '../screens/RecapScreen';
import ProgressScreen from '../screens/ProgressScreen';
import { Typography } from '../theme';

export type TabParamList = {
  Today: undefined;
  Log: undefined;
  Progress: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3db88a',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarStyle: {
          backgroundColor: '#141b2d',
          borderTopColor: 'rgba(255, 255, 255, 0.15)',
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 60,
        },
        tabBarLabelStyle: {
          fontSize: Typography.caption1.fontSize,
          fontWeight: '600' as const,
          fontFamily: fontsLoaded ? 'Nunito_400Regular' : undefined,
          marginBottom: Platform.OS === 'ios' ? 4 : 8,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Today"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'sunny' : 'sunny-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Log"
        component={RecapScreen}
        options={{
          tabBarLabel: 'Log',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'trending-up' : 'trending-up-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
