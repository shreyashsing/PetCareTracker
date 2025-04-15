import { supabase } from '../services/supabase';
import { hashPassword } from '../services/auth/passwordService';

/**
 * Direct registration helper for debugging Supabase issues
 */
export const directRegister = async (email: string, password: string, name: string) => {
  console.log('Starting direct register process for:', email);

  try {
    // Step 1: Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      console.error('Direct auth signup error:', signUpError);
      return { success: false, error: signUpError, step: 'auth' };
    }

    if (!authData.user) {
      console.error('No user returned from direct auth signup');
      return { success: false, error: 'No user returned', step: 'auth' };
    }

    console.log('Auth user created with ID:', authData.user.id);

    // Step 2: Check if users table exists
    try {
      const { count, error: tableError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (tableError) {
        console.error('Error checking users table:', tableError);
        console.log('Trying alternative table name: profiles');
        
        // Try with profiles table instead
        const { count: profileCount, error: profileError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (!profileError) {
          console.log('Found profiles table with count:', profileCount);
          
          // Try creating user in profiles table
          const profileData = {
            id: authData.user.id,
            email: email,
            name: name,
            display_name: name,
            created_at: new Date().toISOString(),
            is_new_user: true
          };
          
          const { error: insertProfileError } = await supabase
            .from('profiles')
            .insert([profileData]);
          
          if (insertProfileError) {
            console.error('Error creating user in profiles table:', insertProfileError);
            return { success: false, error: insertProfileError, step: 'database-profiles' };
          }
          
          console.log('User created in profiles table successfully');
          return { success: true };
        }
      } else {
        console.log('Found users table with count:', count);
      }
    } catch (tableError) {
      console.error('Error checking tables:', tableError);
    }

    // Step 3: Try minimal user data (just ID and email)
    const minimalData = {
      id: authData.user.id,
      email: email
    };

    console.log('Attempting minimal user record creation:', JSON.stringify(minimalData));

    try {
      const { error: minimalError } = await supabase
        .from('users')
        .insert([minimalData]);

      if (minimalError) {
        console.error('Error with minimal user data:', minimalError);
      } else {
        console.log('Minimal user record created successfully');
        return { success: true };
      }
    } catch (minimalError) {
      console.error('Exception with minimal data:', minimalError);
    }

    // Step 4: Try complete user data as a last resort
    const userData = {
      id: authData.user.id,
      email: email,
      name: name,
      display_name: name,
      created_at: new Date().toISOString(),
      is_new_user: true
    };

    console.log('Attempting complete user record creation:', JSON.stringify(userData));

    const { error: insertError } = await supabase
      .from('users')
      .insert([userData]);

    if (insertError) {
      console.error('Error in direct user record creation:', insertError);
      return { success: false, error: insertError, step: 'database' };
    }

    console.log('User record created successfully');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in direct registration:', error);
    return { success: false, error, step: 'unknown' };
  }
}; 