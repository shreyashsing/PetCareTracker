import { isImagePickerActive } from './imageUpload';

/**
 * Navigation guard to prevent unwanted navigation during image picker operations
 * @param navigation The navigation object
 * @param screenName The name of the screen to navigate to
 * @param params Optional parameters for the navigation
 * @returns true if navigation was blocked, false if navigation proceeded
 */
export const guardedNavigation = (
  navigation: any, 
  screenName: string, 
  params?: any
): boolean => {
  // If image picker is active, block navigation to prevent unwanted transitions
  if (isImagePickerActive) {
    console.log(`[NavigationGuard] Blocked navigation to ${screenName} because image picker is active`);
    return true; // navigation was blocked
  }
  
  // Otherwise, allow normal navigation
  navigation.navigate(screenName, params);
  return false; // navigation proceeded normally
};

/**
 * Navigation guard for navigation.reset operations
 * @param navigation The navigation object
 * @param config The reset configuration
 * @returns true if reset was blocked, false if reset proceeded
 */
export const guardedReset = (
  navigation: any,
  config: any
): boolean => {
  // If image picker is active, block navigation reset
  if (isImagePickerActive) {
    console.log(`[NavigationGuard] Blocked navigation reset because image picker is active`);
    return true; // reset was blocked
  }
  
  // Otherwise, allow normal reset
  navigation.reset(config);
  return false; // reset proceeded normally
};

/**
 * Navigation guard for navigation.goBack operations
 * @param navigation The navigation object
 * @returns true if goBack was blocked, false if goBack proceeded
 */
export const guardedGoBack = (
  navigation: any
): boolean => {
  // If image picker is active, block navigation back
  if (isImagePickerActive) {
    console.log(`[NavigationGuard] Blocked navigation back because image picker is active`);
    return true; // goBack was blocked
  }
  
  // Otherwise, allow normal goBack
  navigation.goBack();
  return false; // goBack proceeded normally
}; 