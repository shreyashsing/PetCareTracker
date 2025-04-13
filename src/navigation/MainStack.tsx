import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import type { ComponentType } from 'react';

// Import screens from correct locations
import HomeScreen from '../pages/Home';
import PetProfileScreen from '../screens/PetProfileScreen';
import AddPetScreen from '../pages/AddPet';
import AddHealthRecordScreen from '../pages/AddHealthRecord';
import AddMedicationScreen from '../pages/AddMedication';
import AddTaskScreen from '../pages/AddTask';
import AddMealScreen from '../pages/AddMeal';
import SettingsScreen from '../pages/Settings';
import FullAnalyticsScreen from '../pages/FullAnalytics';
// Import the missing screens
import HealthScreen from '../pages/Health';
import ScheduleScreen from '../pages/Schedule';
import FeedingScreen from '../pages/Feeding';

// Use Stack with 'any' to resolve type incompatibilities
const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen as ComponentType<any>} />
      <Stack.Screen name="PetProfile" component={PetProfileScreen as ComponentType<any>} />
      <Stack.Screen name="AddPet" component={AddPetScreen as ComponentType<any>} />
      <Stack.Screen name="AddHealthRecord" component={AddHealthRecordScreen as ComponentType<any>} />
      <Stack.Screen name="AddMedication" component={AddMedicationScreen as ComponentType<any>} />
      <Stack.Screen name="AddTask" component={AddTaskScreen as ComponentType<any>} />
      <Stack.Screen name="AddMeal" component={AddMealScreen as ComponentType<any>} />
      <Stack.Screen name="Settings" component={SettingsScreen as ComponentType<any>} />
      <Stack.Screen name="FullAnalytics" component={FullAnalyticsScreen as ComponentType<any>} />
      <Stack.Screen name="Health" component={HealthScreen as ComponentType<any>} />
      <Stack.Screen name="Schedule" component={ScheduleScreen as ComponentType<any>} />
      <Stack.Screen name="Feeding" component={FeedingScreen as ComponentType<any>} />
    </Stack.Navigator>
  );
};

export default MainStack; 