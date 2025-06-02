import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainStackParamList } from '../types/navigation';

// Import screens
import HomeScreen from '../pages/Home';
import HealthScreen from '../pages/Health';
import ScheduleScreen from '../pages/Schedule';
import FeedingScreen from '../pages/Feeding';
import SettingsScreen from '../pages/Settings';
import { ComponentType } from 'react';

const Tab = createBottomTabNavigator<MainStackParamList>();

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

const MainNavigator = () => {
  const colorScheme = useColorScheme();
  // Force light mode - always use light colors  
  const isDark = false; // Changed from: colorScheme === 'dark'
  const colors = isDark ? getDarkColors() : getLightColors();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Health') {
            iconName = 'hospital-box';
          } else if (route.name === 'Schedule') {
            iconName = 'calendar';
          } else if (route.name === 'Feeding') {
            iconName = 'food';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80', // 50% opacity
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
        name="Health" 
        component={HealthScreen as ComponentType<any>} 
        options={{
          title: 'Health',
        }}
      />
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleScreen} 
        options={{
          title: 'Schedule',
        }}
      />
      <Tab.Screen 
        name="Feeding" 
        component={FeedingScreen as ComponentType<any>} 
        options={{
          title: 'Feeding',
        }}
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

export default MainNavigator; 