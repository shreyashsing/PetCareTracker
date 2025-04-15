import { supabase } from '../services/supabase';
import { Alert } from 'react-native';

/**
 * Send a confirmation email to a user's email address
 * @param email The email address to send confirmation to
 * @returns True if successful, false otherwise
 */
export const sendConfirmationEmail = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      Alert.alert('Error', 'Failed to send confirmation email. Please try again later.');
      return false;
    }

    Alert.alert(
      'Email Sent',
      'A confirmation email has been sent to your email address. Please check your inbox and follow the link to verify your account.',
      [{ text: 'OK' }]
    );
    
    return true;
  } catch (error) {
    console.error('Error in sendConfirmationEmail:', error);
    Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    return false;
  }
};

/**
 * Attempt to manually confirm a user's email 
 * (For development purposes only - requires admin rights in Supabase)
 * @param userId The ID of the user to confirm
 * @param email The email address to confirm
 */
export const manuallyConfirmEmail = async (userId: string, email: string): Promise<boolean> => {
  try {
    // First approach - try admin API (requires admin rights)
    try {
      const { error: adminError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );
      
      if (!adminError) {
        console.log('Successfully confirmed email via admin API');
        return true;
      }
      
      console.log('Admin confirmation method failed (expected if not admin):', adminError);
    } catch (adminError) {
      console.log('Admin API not available (expected):', adminError);
    }
    
    // Second approach - try updating user data
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { email_confirmed: true }
      });
      
      if (!updateError) {
        console.log('Successfully confirmed email via updateUser');
        return true;
      }
      
      console.log('updateUser confirmation method failed:', updateError);
    } catch (updateError) {
      console.log('updateUser method failed:', updateError);
    }
    
    // In development, we can attempt a workaround by creating a profile record
    if (__DEV__) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            { 
              id: userId, 
              email, 
              email_confirmed: true,
              username: email.split('@')[0]
            }
          ]);
          
        if (!profileError) {
          console.log('Created/updated profile with confirmed status');
          return true;
        }
        
        console.log('Profile update failed:', profileError);
      } catch (profileError) {
        console.log('Profile update method failed:', profileError);
      }
    }
    
    // Last resort - notify user to check email
    Alert.alert(
      'Email Verification Required',
      'Please check your email for a verification link. You need to verify your email before you can log in.',
      [
        { 
          text: 'Resend Email', 
          onPress: () => sendConfirmationEmail(email) 
        },
        { text: 'OK' }
      ]
    );
    
    return false;
  } catch (error) {
    console.error('Error in manuallyConfirmEmail:', error);
    return false;
  }
}; 