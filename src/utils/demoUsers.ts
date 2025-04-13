import { User } from '../types/components';
import { hashPassword } from '../services/auth/passwordService';
import { databaseManager } from '../services/db';
import { generateUUID } from './helpers';

/**
 * Create a demo user if none exist
 */
export async function createDemoUserIfNeeded(): Promise<void> {
  try {
    // Check if any users exist
    const existingUsers = await databaseManager.users.getAll();
    
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
      
      // Save to database
      await databaseManager.users.create(demoUser);
      console.log('Demo user created successfully!');
    } else {
      console.log(`Found ${existingUsers.length} existing users, skipping demo user creation.`);
    }
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
} 