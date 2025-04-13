import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { databaseManager } from './services/db';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Screens
import Home from './pages/Home';
import Feeding from './pages/Feeding';
import Schedule from './pages/Schedule';
import Health from './pages/Health';
import Settings from './pages/Settings';
import AddPet from './pages/AddPet';
import AddMeal from './pages/AddMeal';
import AddTask from './pages/AddTask';
import AddFoodItem from './pages/AddFoodItem';
import AddMedication from './pages/AddMedication';
import AddHealthRecord from './pages/AddHealthRecord';
import FullAnalytics from './pages/FullAnalytics';

import { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

type ExerciseScreenProps = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

// Simple exercise placeholder
const Exercise: React.FC<ExerciseScreenProps> = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Exercise Screen Coming Soon</Text>
    </View>
  );
};

export default function App() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Reset database to load the new comprehensive pet data
        await databaseManager.resetDatabase();
        console.log('Database initialized with comprehensive pet profile');
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    
    initializeDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Feeding" component={Feeding} />
          <Stack.Screen name="Schedule" component={Schedule} />
          <Stack.Screen name="Health" component={Health} />
          <Stack.Screen name="Exercise" component={Exercise} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="AddPet" component={AddPet} />
          <Stack.Screen name="AddMeal" component={AddMeal} />
          <Stack.Screen name="AddTask" component={AddTask} />
          <Stack.Screen name="AddFoodItem" component={AddFoodItem} />
          <Stack.Screen name="AddMedication" component={AddMedication} />
          <Stack.Screen name="AddHealthRecord" component={AddHealthRecord} />
          <Stack.Screen name="FullAnalytics" component={FullAnalytics} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
} 