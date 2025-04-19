import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

/**
 * Initialize deep link handling for the app
 * @param navigation Navigation object to use for redirects
 */
export const initializeDeepLinks = (navigation: any) => {
  // Handle links when the app is already open
  Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url, navigation);
  });

  // Handle links that opened the app
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url, navigation);
    }
  });
};

/**
 * Parse and handle deep links
 * @param url Deep link URL
 * @param navigation Navigation object
 */
const handleDeepLink = (url: string, navigation: any) => {
  console.log('Received deep link:', url);

  // Parse the URL
  const parsedUrl = Linking.parse(url);
  
  // Handle password reset links from Supabase
  if (parsedUrl.path === 'reset-password' || url.includes('reset-password')) {
    // Extract the token from the URL
    const token = parsedUrl.queryParams?.token || '';
    
    // Navigate to the password reset screen with the token
    if (token) {
      navigation.navigate('ResetPassword', { token });
    } else {
      Alert.alert('Error', 'Invalid password reset link. Please try again.');
    }
  }
};

/**
 * Handle password reset completion
 * @param token Reset token
 * @param newPassword New password
 * @returns Success status
 */
export const handlePasswordReset = async (token: string, newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error('Error updating password:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error handling password reset:', error);
    return false;
  }
}; 