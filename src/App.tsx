import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {unifiedDatabaseManager} from "./services/db";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// Import App initialization
import { appInitialized } from './App.init';
// Import error boundary for wrapping the app
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppColors } from './hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';

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
import ChatDebug from './pages/ChatDebug';

import { MainStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<MainStackParamList>();

type ExerciseScreenProps = NativeStackScreenProps<MainStackParamList, 'Exercise'>;

// Exercise screen implementation
const Exercise: React.FC<ExerciseScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  
  // Redirect to add task with exercise category pre-selected
  const handleAddExercise = () => {
    // The AddTask screen will need to be updated separately to support defaultCategory
    // For now, navigate there and the user can select the exercise category
    navigation.navigate('AddTask', { 
      petId: undefined, 
      taskId: undefined
    });
  };
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 18, marginBottom: 20, color: colors.text }}>Manage your pet's exercise activities</Text>
      <View style={{ marginBottom: 30 }}>
        <Text style={{ textAlign: 'center', marginBottom: 10, color: colors.text }}>
          Regular exercise is essential for your pet's physical and mental health.
        </Text>
        <Text style={{ textAlign: 'center', color: colors.placeholder }}>
          Track walks, playtime, and training sessions to ensure your pet stays active and healthy.
        </Text>
      </View>
      <TouchableOpacity 
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: 25,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        onPress={handleAddExercise}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Add Exercise Activity</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function App() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Remove database reset that was causing flickering
    // Only log initialization status
    console.log('App component mounted, app initialized:', appInitialized);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
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
            <Stack.Screen 
              name="ChatDebug" 
              component={ChatDebug} 
              options={{ 
                headerShown: true, 
                title: 'Chat System Diagnostics' 
              }} 
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
} 