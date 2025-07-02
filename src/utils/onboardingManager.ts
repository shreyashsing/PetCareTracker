import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@PetCareTracker:OnboardingCompleted';
const FIRST_TIME_USER_KEY = '@PetCareTracker:FirstTimeUser';

export class OnboardingManager {
  /**
   * Check if the user has completed onboarding
   */
  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async markOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await AsyncStorage.setItem(FIRST_TIME_USER_KEY, 'false');
      console.log('Onboarding marked as completed');
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
    }
  }

  /**
   * Check if this is a first-time user
   */
  static async isFirstTimeUser(): Promise<boolean> {
    try {
      const firstTime = await AsyncStorage.getItem(FIRST_TIME_USER_KEY);
      // If the key doesn't exist, it's a first-time user
      return firstTime === null || firstTime === 'true';
    } catch (error) {
      console.error('Error checking first-time user status:', error);
      return true; // Default to first-time user if there's an error
    }
  }

  /**
   * Reset onboarding state (for testing purposes)
   */
  static async resetOnboardingState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      await AsyncStorage.removeItem(FIRST_TIME_USER_KEY);
      console.log('Onboarding state reset');
    } catch (error) {
      console.error('Error resetting onboarding state:', error);
    }
  }

  /**
   * Mark user as returning (not first-time)
   */
  static async markUserAsReturning(): Promise<void> {
    try {
      await AsyncStorage.setItem(FIRST_TIME_USER_KEY, 'false');
    } catch (error) {
      console.error('Error marking user as returning:', error);
    }
  }

  /**
   * Get onboarding state for debugging
   */
  static async getOnboardingState(): Promise<{
    hasCompleted: boolean;
    isFirstTime: boolean;
  }> {
    try {
      const hasCompleted = await this.hasCompletedOnboarding();
      const isFirstTime = await this.isFirstTimeUser();
      
      return {
        hasCompleted,
        isFirstTime
      };
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return {
        hasCompleted: false,
        isFirstTime: true
      };
    }
  }
}

export default OnboardingManager; 