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
  Feeding: { refresh?: boolean; mealCompleted?: number };
  Schedule: undefined;
  Health: undefined;
  Exercise: undefined;
  AddActivity: { activityId?: string };
  AddFirstPet: undefined;
  ChatAssistant: { petId?: string; sessionId?: string };
  SupabaseSetup: undefined;
  SQLViewer: { scriptType: 'pets' | 'chat' };
  PetDebug: undefined;
  ChatDebug: undefined;
  PetSyncDebug: undefined;
  ManagePets: undefined;
  EditPet: { petId: string };
  WeightTrend: { petId?: string };
  FeedbackForm: { initialFeedbackType?: 'bug_report' | 'feature_request' | 'general_feedback' | 'issue_report' };
};

// Root stack combining all param lists (App-level navigation)
export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainStack: NavigatorScreenParams<MainStackParamList>;
  AddFirstPet: undefined;
};

// Extended param list for full app navigation (includes all screens)
export type AppStackParamList = {
  Home: undefined;
  Feeding: { refresh?: boolean; mealCompleted?: number };
  Schedule: undefined;
  Health: undefined;
  Exercise: undefined;
  Settings: undefined;
  AddPet: undefined;
  AddMeal: { petId?: string; mealId?: string };
  AddTask: { petId?: string; taskId?: string };
  AddFoodItem: { petId?: string; itemId?: string };
  AddMedication: { petId: string; medicationToEdit?: any };
  AddHealthRecord: { petId: string; recordToEdit?: any };
  FullAnalytics: { petId?: string };
  ViewPet: { petId: string };
  EnterMedication: undefined;
  AddActivity: { activityId?: string };
  Pet: { id: string };
  Profile: undefined;
  PetDetails: { petId: string };
  EditPet: { petId: string };
  PetAssistant: { petId?: string };
  FoodTracker: { petId?: string };
  CreateNote: { petId: string };
  VetVisits: { petId?: string };
  AddVetVisit: { petId: string };
  HealthMetrics: { petId?: string };
  LocalNotificationSettings: undefined;
  RecommendedFeeds: { petId?: string, petType?: string, breed?: string };
  SupabaseSetup: undefined;
  SQLViewer: { scriptType: 'pets' | 'chat' };
  ChatDebug: undefined;
  PetDebug: undefined;
  PetSyncDebug: undefined;
  ManagePets: undefined;
  OnboardingFeatures: undefined;
  PetProfile: { petId: string };
  WeightTrend: { petId?: string };
  StorageDiagnostic: undefined;
  DebugMenu: undefined;
  FeedbackForm: { initialFeedbackType?: 'bug_report' | 'feature_request' | 'general_feedback' | 'issue_report' };
};

// Export a custom navigation type for use in components
export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Legacy type for backward compatibility
export type NavigationProps = BottomTabNavigationProp<RootStackParamList>; 