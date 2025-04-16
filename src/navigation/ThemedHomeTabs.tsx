import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../pages/Home';
import PetProfileScreen from '../pages/PetProfile';
import SettingsScreen from '../pages/Settings';

// Define the tab navigator param list
type HomeTabParamList = {
  Home: undefined;
  PetProfile: { petId: string } | undefined;
  Settings: undefined;
};

// Default colors based on color scheme
const getLightColors = () => ({
  primary: '#4CAF50',
  background: '#ffffff',
  text: '#333333',
  border: '#e0e0e0',
});

const getDarkColors = () => ({
  primary: '#81C784',
  background: '#121212',
  text: '#ffffff',
  border: '#2c2c2c',
});

const Tab = createBottomTabNavigator<HomeTabParamList>();

const HomeTabs = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? getDarkColors() : getLightColors();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'PetProfile') {
            iconName = focused ? 'paw' : 'paw-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 5,
          paddingTop: 5,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="PetProfile" 
        component={PetProfileScreen as React.ComponentType<any>}
        options={{
          title: 'My Pet',
        }}
        initialParams={{ petId: '1' }} // Default pet ID
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeTabs; 