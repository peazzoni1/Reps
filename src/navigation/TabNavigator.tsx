import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_400Regular } from '@expo-google-fonts/nunito';
import HomeScreen from '../screens/HomeScreen';
import RecapScreen from '../screens/RecapScreen';
import ChatScreen from '../screens/ChatScreen';
import { Typography } from '../theme';

export type TabParamList = {
  Today: undefined;
  Log: undefined;
  Coach: { initialMessage?: string } | undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3d7a8a',
        tabBarInactiveTintColor: '#9aafb5',
        tabBarStyle: {
          backgroundColor: '#faf8f6',
          borderTopColor: 'rgba(61, 122, 138, 0.1)',
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 60,
        },
        tabBarLabelStyle: {
          fontSize: Typography.caption1.fontSize,
          fontWeight: '500' as const,
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
        name="Coach"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
