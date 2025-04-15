import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Auth stack navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Onboarding: undefined;
  OnboardingFeatures: undefined;
};

// Main stack navigation types - simplified
export type MainStackParamList = {
  Home: undefined;
  PetProfile: { petId: string };
  AddPet: undefined;
  AddHealthRecord: { petId: string; recordToEdit?: any };
  AddMedication: { petId: string; medicationToEdit?: any };
  AddTask: { petId?: string; taskId?: string };
  AddMeal: { petId?: string; mealId?: string };
  AddFoodItem: { petId?: string; itemId?: string };
  Settings: undefined;
  FullAnalytics: { petId?: string };
  Feeding: { refresh?: boolean };
  Schedule: undefined;
  Health: undefined;
  Exercise: undefined;
  AddFirstPet: undefined;
};

// Root stack combining all param lists
export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainStack: NavigatorScreenParams<MainStackParamList>;
  // Include all screens from MainStackParamList for direct access
  Home: undefined;
  PetProfile: { petId: string };
  AddPet: undefined;
  AddHealthRecord: { petId: string; recordToEdit?: any };
  AddMedication: { petId: string; medicationToEdit?: any };
  AddTask: { petId?: string; taskId?: string };
  AddMeal: { petId?: string; mealId?: string };
  AddFoodItem: { petId?: string; itemId?: string };
  Settings: undefined;
  FullAnalytics: { petId?: string };
  Feeding: { refresh?: boolean };
  Schedule: undefined;
  Health: undefined;
  Exercise: undefined;
  AddFirstPet: undefined;
  // Add this placeholder for navigation.reset() to work
  Main: undefined;
  // Add onboarding screens
  Onboarding: undefined;
  OnboardingFeatures: undefined;
};

// Export a custom navigation type for use in components
export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Legacy type for backward compatibility
export type NavigationProps = BottomTabNavigationProp<RootStackParamList>; 