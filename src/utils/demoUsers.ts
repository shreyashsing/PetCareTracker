import { User } from '../types/components';
import { hashPassword } from '../services/auth/passwordService';
import {unifiedDatabaseManager} from "../services/db";
import { generateUUID } from './helpers';
import { supabase } from '../services/supabase';

/**
 * Create a demo user if none exist
 */
export async function createDemoUserIfNeeded(): Promise<void> {
  try {
    // Check if any users exist
    const existingUsers = await unifiedDatabaseManager.users.getAll();
    
    if (existingUsers.length === 0) {
      console.log('No users found. Creating demo user...');
      
      // Create hashed password for demo user
      const passwordHash = await hashPassword('password123');
      
      // Create demo user
      const demoUser: User = {
        id: generateUUID(),
        email: 'user@example.com',
        passwordHash,
        name: 'Demo User',
        displayName: 'Demo User',
        createdAt: new Date(),
        petIds: [],
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          theme: 'system'
        }
      };
      
      try {
        // Try to save to Supabase directly first
        const { error } = await supabase
          .from('users')
          .insert([{
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.name,
            display_name: demoUser.displayName,
            "createdAt": demoUser.createdAt.toISOString(),
            is_new_user: true,
            pet_ids: []
          }]);
          
        if (error) {
          console.log('Failed to create demo user in Supabase:', error.message);
          // Fall back to local storage only
          await unifiedDatabaseManager.users.create(demoUser);
        }
      } catch (supabaseError) {
        console.log('Error with Supabase, using local storage only:', supabaseError);
        // Fall back to local storage only
        await unifiedDatabaseManager.users.create(demoUser);
      }
      
      console.log('Demo user created successfully!');
    } else {
      console.log(`Found ${existingUsers.length} existing users, skipping demo user creation.`);
    }
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
} 