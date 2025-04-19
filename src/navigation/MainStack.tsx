import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import type { ComponentType } from 'react';

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
import ChatAssistantScreen from '../pages/ChatAssistant';
import SupabaseSetup from '../pages/SupabaseSetup';
import SQLViewer from '../pages/SQLViewer';
import PetDebug from '../pages/PetDebug';
import ChatDebug from '../pages/ChatDebug';
import ManagePets from '../pages/ManagePets';
import EditPetScreen from '../pages/EditPet';
import ExerciseScreen from '../pages/Exercise';
import AddActivityScreen from '../pages/AddActivity';

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
      <Stack.Screen name="PetProfile" component={PetProfileScreen as ComponentType<any>} />
      <Stack.Screen name="AddPet" component={AddPetScreen} />
      <Stack.Screen name="AddHealthRecord" component={AddHealthRecordScreen as ComponentType<any>} />
      <Stack.Screen name="AddMedication" component={AddMedicationScreen as ComponentType<any>} />
      <Stack.Screen name="AddTask" component={AddTaskScreen as ComponentType<any>} />
      <Stack.Screen name="AddMeal" component={AddMealScreen as ComponentType<any>} />
      <Stack.Screen name="AddFoodItem" component={AddFoodItemScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="FullAnalytics" component={FullAnalyticsScreen} />
      <Stack.Screen name="Health" component={HealthScreen as ComponentType<any>} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Feeding" component={FeedingScreen} />
      <Stack.Screen name="ChatAssistant" component={ChatAssistantScreen} />
      <Stack.Screen name="SupabaseSetup" component={SupabaseSetup} />
      <Stack.Screen name="SQLViewer" component={SQLViewer} />
      <Stack.Screen name="PetDebug" component={PetDebug} />
      <Stack.Screen name="ChatDebug" component={ChatDebug} />
      <Stack.Screen name="ManagePets" component={ManagePets} />
      <Stack.Screen name="EditPet" component={EditPetScreen as ComponentType<any>} />
      <Stack.Screen name="Exercise" component={ExerciseScreen as ComponentType<any>} />
      <Stack.Screen name="AddActivity" component={AddActivityScreen as ComponentType<any>} />
    </Stack.Navigator>
  );
};

export default MainStack; 