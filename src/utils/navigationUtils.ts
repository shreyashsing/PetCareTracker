import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for navigation state
const NAVIGATION_STORAGE_KEY = 'pet-care-navigation-state';

/**
 * Clear navigation state from storage on logout
 * This prevents the app from trying to restore to authenticated routes when not logged in
 */
export const clearNavigationStateOnLogout = async (): Promise<void> => {
  try {
    console.log('[NavigationUtils] Clearing navigation state due to logout');
    await AsyncStorage.removeItem(NAVIGATION_STORAGE_KEY);
  } catch (error) {
    console.error('[NavigationUtils] Error clearing navigation state:', error);
  }
};

/**
 * Check if a route requires authentication
 */
export const isAuthenticatedRoute = (route: string): boolean => {
  const authRoutes = [
    'Home',
    'Health', 
    'Schedule',
    'Feeding',
    'Exercise',
    'PetProfile',
    'Settings',
    'ManagePets',
    'AddMedication',
    'AddPet',
    'EditPet',
    'AddHealthRecord',
    'ChatAssistant',
    'FullAnalytics',
    'FeedbackForm',
    'WeightTrend',
    'AddTask',
    'AddMeal',
    'AddFoodItem',
    'AddActivity'
  ];
  
  return authRoutes.includes(route);
}; 