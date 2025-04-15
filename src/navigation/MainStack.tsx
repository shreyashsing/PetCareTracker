import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';

// Import screens from pages directory (our primary implementation)
import HomeScreen from '../pages/Home';
import PetProfileScreen from '../pages/PetProfile';
import AddPetScreen from '../pages/AddPet';
import AddHealthRecordScreen from '../pages/AddHealthRecord';
import AddMedicationScreen from '../pages/AddMedication';
import AddTaskScreen from '../pages/AddTask';
import AddMealScreen from '../pages/AddMeal';
import AddFoodItemScreen from '../pages/AddFoodItem';
import SettingsScreen from '../pages/Settings';
import FullAnalyticsScreen from '../pages/FullAnalytics';
import HealthScreen from '../pages/Health';
import ScheduleScreen from '../pages/Schedule';
import FeedingScreen from '../pages/Feeding';

// Create stack navigator with correct type
const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PetProfile" component={PetProfileScreen} />
      <Stack.Screen name="AddPet" component={AddPetScreen} />
      <Stack.Screen name="AddHealthRecord" component={AddHealthRecordScreen} />
      <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
      <Stack.Screen name="AddTask" component={AddTaskScreen} />
      <Stack.Screen name="AddMeal" component={AddMealScreen} />
      <Stack.Screen name="AddFoodItem" component={AddFoodItemScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="FullAnalytics" component={FullAnalyticsScreen} />
      <Stack.Screen name="Health" component={HealthScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Feeding" component={FeedingScreen} />
    </Stack.Navigator>
  );
};

export default MainStack; 