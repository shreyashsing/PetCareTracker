import { AsyncStorageService } from '../db/asyncStorage';
import { STORAGE_KEYS } from '../db/constants';
import { databaseManager } from '../db';
import { User } from '../../types/components';
import { generateUUID } from '../../utils/helpers';
import { securityService, DataSensitivity } from '../security';
import { hashPassword, verifyPassword } from './passwordService';
import * as Crypto from 'expo-crypto';
import { supabase } from '../supabase';

// Secure storage keys
const SECURE_STORE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id'
};

/**
 * Generate an authentication token
 * @returns Authentication token
 */
const generateAuthToken = async (userId: string): Promise<string> => {
  // Generate a secure random string using the security service
  const randomStr = await securityService.generateSecureRandomString(32);
    
  // Return a token with userId and timestamp
  return `token_${userId}_${Date.now()}_${randomStr}`;
};

/**
 * Authentication service for user management
 */
export class AuthService {
  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param name User name
   * @returns User object if successful, null if failed
   */
  async register(email: string, password: string, name: string): Promise<User | null> {
    try {
      // Attempt to sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            display_name: name,
            // Auto-confirm email for development ease
            email_confirmed: true
          },
          // Skip email verification for development 
          emailRedirectTo: ''
        }
      });

      if (signUpError) {
        console.error('Error registering user with Supabase Auth:', signUpError);
        return null;
      }

      if (!authData.user) {
        console.error('No user returned from Supabase Auth after signup');
        return null;
      }

      // Try auto-confirming email for registered users
      try {
        // For development environments only - simulate email confirmation in Supabase
        const { error: adminError } = await supabase.auth.admin.updateUserById(
          authData.user.id,
          { email_confirm: true }
        );
        
        if (adminError) {
          console.log('Admin update failed, this is normal if you don\'t have admin rights:', adminError);
          // This is expected to fail if you don't have admin rights, it's just a development convenience
        }
      } catch (adminError) {
        console.log('Admin update not available (expected):', adminError);
        // Non-critical error, continue with registration
      }

      // Hash the password for local storage
      const passwordHash = await hashPassword(password);

      // Try inserting into profiles table first (Supabase default)
      try {
        const profileData = {
          id: authData.user.id,
          email,
          username: email.split('@')[0],
          full_name: name,
          avatar_url: null,
          updated_at: new Date().toISOString()
        };
        
        console.log('Trying to insert into profiles table:', JSON.stringify(profileData));
        
        await supabase
          .from('profiles')
          .upsert([profileData]);
          
        console.log('Profile created successfully');
      } catch (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway - the auth user is created
      }

      // Generate and store authentication token in secure storage
      const authToken = await generateAuthToken(authData.user.id);
      await securityService.setItem(SECURE_STORE_KEYS.AUTH_TOKEN, authToken, DataSensitivity.HIGH);
      
      // Store user ID in secure storage
      await securityService.setItem(SECURE_STORE_KEYS.USER_ID, authData.user.id, DataSensitivity.HIGH);

      // Return the user data in the format expected by the app
      return {
        id: authData.user.id,
        email,
        passwordHash,
        name,
        displayName: name,
        createdAt: new Date(),
        petIds: [],
        isNewUser: true
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  /**
   * Try to manually confirm a user's email
   * @param email User email
   * @param userId Optional user ID if known
   * @returns True if successful, false otherwise
   */
  async tryConfirmEmail(email: string, userId?: string): Promise<boolean> {
    console.log('Attempting to confirm email for:', email);
    
    try {
      // If we don't have the userId, try to get it
      if (!userId) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            userId = data.user.id;
          }
        } catch (error) {
          console.log('Could not get user ID via getUser:', error);
        }
      }
      
      // Try admin API first if we have userId
      if (userId) {
        try {
          const { error: adminError } = await supabase.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
          );
          
          if (!adminError) {
            console.log('Successfully confirmed email via admin API');
            return true;
          }
          
          console.log('Admin confirmation method failed:', adminError);
        } catch (adminError) {
          console.log('Admin API not available:', adminError);
        }
      }
      
      // Try updating user metadata as a workaround
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
      
      // Development-only workaround - create a profile with confirmed status
      if (__DEV__ && userId) {
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
      
      return false;
    } catch (error) {
      console.error('Error trying to confirm email:', error);
      return false;
    }
  }

  /**
   * Login user
   * @param email User email
   * @param password User password
   * @returns User object if successful, null if failed
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      // Sign in with Supabase Auth
      let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // Handle email not confirmed error
      if (signInError && signInError.message.includes('Email not confirmed')) {
        console.log('User email not confirmed. Attempting auto-confirmation...');
        
        // Try to confirm the email
        const confirmed = await this.tryConfirmEmail(email);
        
        if (confirmed) {
          console.log('Successfully confirmed email, trying to log in again');
          
          // Try to sign in again now that email is confirmed
          const { data: retryAuthData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (retryError) {
            console.error('Error signing in after email confirmation:', retryError);
            throw new Error('Email confirmation succeeded but login failed: ' + retryError.message);
          }
          
          if (!retryAuthData.user) {
            throw new Error('No user returned after email confirmation');
          }
          
          authData = retryAuthData;
        } else {
          // If we failed to confirm, use the last resort approach
          console.log('Auto-confirmation failed, trying last resort approach...');
          
          // Last resort: try signing up again
          try {
            const { data: signupData, error: signupError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  email_confirmed: true
                },
                emailRedirectTo: ''
              }
            });
            
            if (signupError) {
              console.error('Error in signup attempt:', signupError);
              throw new Error('Email not confirmed and automatic confirmation failed');
            }
            
            // Try one more login attempt
            const { data: finalAuthData, error: finalError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (finalError) {
              throw new Error('Email not confirmed: ' + finalError.message);
            }
            
            authData = finalAuthData;
          } catch (error) {
            throw new Error('Email not confirmed and automatic confirmation failed');
          }
        }
      } else if (signInError) {
        console.error('Error signing in with Supabase:', signInError);
        throw new Error(signInError.message);
      }

      if (!authData?.user) {
        console.error('No user returned from Supabase Auth after sign in');
        throw new Error('Authentication failed - no user data returned');
      }

      // Get user data from the users table
      let userData = null;
      try {
        // First try users table
        let { data: tableData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (fetchError) {
          console.log('Users table might not exist or other error:', fetchError);
          
          // Try profiles table as a fallback
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();
              
            if (!profileError && profileData) {
              userData = profileData;
            } else {
              console.log('Profiles table might not exist or other error:', profileError);
            }
          } catch (profileError) {
            console.log('Error checking profiles table:', profileError);
          }
        } else {
          userData = tableData;
        }
      } catch (dbError) {
        console.log('Database error during user data fetch:', dbError);
      }

      // If no user data from database, create minimal data from auth user
      if (!userData) {
        console.log('No user data found in database, creating from auth data');
        
        // Extract name from user metadata if available
        const userMeta = authData.user.user_metadata;
        const displayName = userMeta?.name || userMeta?.display_name || email.split('@')[0];
        
        userData = {
          id: authData.user.id,
          email: email,
          username: email.split('@')[0],
          name: displayName,
          display_name: displayName,
          created_at: authData.user.created_at || new Date().toISOString(),
          is_new_user: !authData.user.last_sign_in_at // Only new if never signed in before
        };
        
        // Try to create a profile, but don't fail login if it doesn't work
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert([{
              id: authData.user.id,
              email: email,
              username: email.split('@')[0],
              full_name: displayName
            }]);
            
          if (insertError) {
            console.log('Failed to create profile but continuing login:', insertError);
          } else {
            console.log('Created user profile successfully');
          }
        } catch (createError) {
          console.log('Error creating profile but continuing login:', createError);
        }
      }

      // Generate a password hash for local storage compatibility
      const passwordHash = await hashPassword(password);

      // Generate and store authentication token in secure storage
      const authToken = await generateAuthToken(authData.user.id);
      await securityService.setItem(SECURE_STORE_KEYS.AUTH_TOKEN, authToken, DataSensitivity.HIGH);
      
      // Store user ID in secure storage
      await securityService.setItem(SECURE_STORE_KEYS.USER_ID, authData.user.id, DataSensitivity.HIGH);

      // Create a User object with required fields
      const user: User = {
        id: authData.user.id,
        email: email,
        passwordHash,
        name: userData?.name || userData?.full_name || userData?.display_name || authData.user.user_metadata?.name || email.split('@')[0],
        displayName: userData?.display_name || userData?.full_name || userData?.name || authData.user.user_metadata?.display_name || email.split('@')[0],
        createdAt: new Date(userData?.created_at || authData.user.created_at || Date.now()),
        petIds: userData?.pet_ids || [],
        lastLogin: new Date(),
        isNewUser: userData?.is_new_user || false
      };

      // Update last login timestamp - but don't fail login if this fails
      try {
        // Try users table first
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
          
        if (updateUserError) {
          // Try profiles table
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', user.id);
            
          if (profileUpdateError) {
            console.log('Could not update last login in any table, but continuing');
          }
        }
      } catch (updateError) {
        console.log('Error updating login timestamp - non-critical:', updateError);
        // Non-critical, continue with login
      }

      return user;
    } catch (error: any) {
      console.error('Error logging in:', error);
      
      // If we still have authData from a previous step and encountered a database error
      try {
        const { data: lastAuthData } = await supabase.auth.getUser();
        
        if (lastAuthData?.user && error?.message?.includes('database')) {
          console.log('Database error, but continuing with auth user data');
          
          // Create a minimal user from auth data
          const userMeta = lastAuthData.user.user_metadata || {};
          return {
            id: lastAuthData.user.id,
            email: lastAuthData.user.email || email,
            passwordHash: await hashPassword(password),
            name: userMeta.name || email.split('@')[0],
            displayName: userMeta.display_name || userMeta.name || email.split('@')[0],
            createdAt: new Date(lastAuthData.user.created_at || Date.now()),
            petIds: [],
            lastLogin: new Date(),
            isNewUser: !lastAuthData.user.last_sign_in_at
          };
        }
      } catch (recoveryError) {
        console.log('Could not recover login after error:', recoveryError);
      }
      
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out of Supabase:', error);
      }
      
      // Clean up local storage
      await securityService.removeItem(SECURE_STORE_KEYS.AUTH_TOKEN);
      await securityService.removeItem(SECURE_STORE_KEYS.USER_ID);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Get current authenticated user
   * @returns User object if authenticated, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Check if security service is initialized
      if (!securityService.isInitialized()) {
        await securityService.initialize();
      }
      
      // Get the current user session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }
      
      if (!session || !session.user) {
        return null;
      }
      
      let userData = null;
      
      // Try to get user data from database
      try {
        // Get user data from the users table
        const { data: fetchedData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!fetchError && fetchedData) {
          userData = fetchedData;
        } else {
          // Try profiles table as a fallback
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && profileData) {
            userData = profileData;
          }
        }
      } catch (dbError) {
        console.log('Database error getting user data, continuing with session data:', dbError);
      }
      
      // If we couldn't get user data from database, use session data
      if (!userData) {
        console.log('Creating user from session data (no database data found)');
        const { user } = session;
        const userMeta = user.user_metadata || {};
        
        userData = {
          id: user.id,
          email: user.email || '',
          name: userMeta.name || userMeta.display_name || user.email?.split('@')[0] || 'User',
          display_name: userMeta.display_name || userMeta.name || user.email?.split('@')[0] || 'User',
          created_at: user.created_at,
          is_new_user: !user.last_sign_in_at
        };
      }
      
      // Create a User object with the data from the database or session
      const user: User = {
        id: session.user.id,
        email: userData.email || session.user.email || '',
        passwordHash: '', // We don't store actual password hash in memory for security
        name: userData.name || userData.display_name || userData.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        displayName: userData.display_name || userData.name || userData.full_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
        createdAt: new Date(userData.created_at || session.user.created_at || Date.now()),
        petIds: userData.pet_ids || [],
        lastLogin: userData.last_login ? new Date(userData.last_login) : new Date(session.user.last_sign_in_at || Date.now()),
        isNewUser: userData.is_new_user || false
      };
      
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Request password reset
   * @param email User email
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Use Supabase's built-in password reset functionality
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'petcaretracker://reset-password'
      });
      
      if (error) {
        console.error('Error requesting password reset:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return false;
    }
  }
  
  /**
   * Reset user password
   * @param token Reset token from URL/deep link
   * @param newPassword New password
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Use Supabase's password update functionality with token
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Error resetting password:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 