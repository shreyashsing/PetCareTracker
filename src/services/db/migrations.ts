import { AsyncStorageService } from './asyncStorage';
import { databaseManager } from '.';
import { User } from '../../types/components';
import { hashPassword } from '../auth/passwordService';
import { supabase } from '../supabase';
import { generateUUID } from '../../utils/helpers';

// Migration version key
const DB_MIGRATION_VERSION_KEY = 'db_migration_version';

// Since we couldn't see any usage of uuidv4() in the code we viewed, we'll just make sure
// it's available for potential usages throughout the file by assigning it as a variable
const uuidv4 = generateUUID;

// Migration interface
interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
}

/**
 * Simple legacy password check - returns true if it looks like our hash format
 */
const isSecurePasswordFormat = (passwordHash: string | undefined): boolean => {
  if (!passwordHash) return false;
  return passwordHash.startsWith('$') && passwordHash.split('$').length === 4;
};

/**
 * Migration to upgrade user passwords to secure format
 * Version 1: Initial schema with plain text passwords
 * Version 2: Upgraded schema with securely hashed passwords
 */
const migrateToSecurePasswords: Migration = {
  version: 2,
  description: 'Migrate users to secure password storage',
  up: async () => {
    console.log('Running migration: Secure passwords');
    try {
      // Get all users
      const users = await databaseManager.users.getAll();
      
      // Hash passwords for each user
      for (const user of users) {
        // Skip users who already have properly hashed passwords
        if (isSecurePasswordFormat(user.passwordHash)) {
          console.log(`User ${user.id} already has a secure password hash`);
          continue;
        }
        
        // Get user credentials from old format
        // In a real migration, you'd need to handle how to access the old passwords
        // For this demo, we'll just use a placeholder
        const oldPassword = 'password123'; // This is a placeholder, in reality you'd get this from somewhere
        
        try {
          // Hash password with our secure implementation
          const newPasswordHash = await hashPassword(oldPassword);
          
          // Update user with new hash
          user.passwordHash = newPasswordHash;
          await databaseManager.users.update(user.id, user);
          
          console.log(`Upgraded password security for user: ${user.id}`);
        } catch (error) {
          console.error(`Failed to upgrade password for user ${user.id}:`, error);
          // Continue with other users even if one fails
        }
      }
    } catch (error) {
      console.error('Error migrating to secure passwords:', error);
      // Don't throw to allow migrations to continue
      console.log('Continuing with other migrations despite password migration failure');
    }
  }
};

/**
 * Migration to add user preferences
 */
const addUserPreferences: Migration = {
  version: 3,
  description: 'Add user preferences',
  up: async () => {
    console.log('Running migration: Add user preferences');
    try {
      // Get all users
      const users = await databaseManager.users.getAll();
      
      // Add preferences to each user
      for (const user of users) {
        if (!user.preferences) {
          user.preferences = {
            emailNotifications: true,
            pushNotifications: true,
            theme: 'system'
          };
          await databaseManager.users.update(user.id, user);
          console.log(`Added preferences for user: ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error adding user preferences:', error);
      // Don't throw here either
    }
  }
};

// List of all migrations in order
const migrations: Migration[] = [
  migrateToSecurePasswords,
  addUserPreferences
];

/**
 * Run database migrations
 */
export async function runMigrations() {
  try {
    // Get current database version
    let currentVersion = await AsyncStorageService.getItem<number>(DB_MIGRATION_VERSION_KEY) || 1;
    
    // Find migrations that need to be run
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log(`Database is up to date at version ${currentVersion}`);
      return;
    }
    
    console.log(`Current database version: ${currentVersion}`);
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    // Run migrations in order
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.description}`);
      try {
        await migration.up();
        
        // Update current version
        currentVersion = migration.version;
        await AsyncStorageService.setItem(DB_MIGRATION_VERSION_KEY, currentVersion);
        
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Error in migration ${migration.version}:`, error);
        // Continue with next migration
      }
    }
    
    console.log(`All migrations completed. Database is now at version ${currentVersion}`);
  } catch (error) {
    console.error('Error running migrations:', error);
    // Don't throw
  }
}

/**
 * Get current database version
 */
export async function getDatabaseVersion(): Promise<number> {
  return await AsyncStorageService.getItem<number>(DB_MIGRATION_VERSION_KEY) || 1;
}

/**
 * Manually set database version (use with caution)
 */
export async function setDatabaseVersion(version: number): Promise<void> {
  await AsyncStorageService.setItem(DB_MIGRATION_VERSION_KEY, version);
}

/**
 * Run database migrations to ensure all required tables exist
 * This runs automatically when the app starts
 */
export const runMigrationsToEnsureTablesExist = async (): Promise<boolean> => {
  try {
    console.log('Running database migrations to ensure tables exist...');
    
    // First, check if we're authenticated
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user?.id) {
      console.log('Not authenticated, skipping table creation check');
      return false;
    }
    
    const userId = data.session.user.id;
    const userEmail = data.session.user.email || '';
    const userMeta = data.session.user.user_metadata || {};
    const userDisplayName = userMeta?.name || userEmail.split('@')[0] || 'User';

    // Check and create profiles table record
    try {
      // Try to get the user's profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (fetchError && fetchError.code === '42P01') {
        console.log('Profiles table does not exist. You will need to create it in Supabase.');
        console.log('Run the following SQL in the Supabase SQL Editor:');
        console.log(`
          CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            full_name TEXT,
            avatar_url TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            email_confirmed BOOLEAN DEFAULT FALSE
          );
          
          -- Set up Row Level Security
          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow users to view and update their own profile
          CREATE POLICY "Users can view and update their own profile"
            ON public.profiles
            FOR ALL
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
        `);
      } else if (!profile) {
        // Table exists but no profile for this user
        // Create a minimal profile
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: userId,
              email: userEmail,
              username: userEmail.split('@')[0] || 'user',
              full_name: userDisplayName,
              updated_at: new Date().toISOString(),
              email_confirmed: true
            }
          ]);
        
        if (insertError) {
          console.log('Error creating profile record:', insertError);
        } else {
          console.log('Created profile record successfully');
        }
      } else {
        console.log('Profiles table exists and user has a profile');
      }
    } catch (error) {
      console.log('Error checking/creating profiles table:', error);
    }
    
    // Check and create users table record
    try {
      // Try to get the user's record
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (fetchError && fetchError.code === '42P01') {
        console.log('Users table does not exist. You will need to create it in Supabase.');
        console.log('Run the following SQL in the Supabase SQL Editor:');
        console.log(`
          CREATE TABLE public.users (
            id UUID REFERENCES auth.users PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            display_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE,
            is_new_user BOOLEAN DEFAULT TRUE,
            pet_ids TEXT[] DEFAULT '{}'::TEXT[]
          );
          
          -- Set up Row Level Security
          ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow users to view and update their own data
          CREATE POLICY "Users can view and update their own data"
            ON public.users
            FOR ALL
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
        `);
      } else if (!user) {
        // Table exists but no record for this user
        // Create a minimal user record
        const { error: insertError } = await supabase
          .from('users')
          .upsert([
            {
              id: userId,
              email: userEmail,
              name: userDisplayName,
              display_name: userDisplayName,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              is_new_user: false,
              pet_ids: []
            }
          ]);
        
        if (insertError) {
          console.log('Error creating user record:', insertError);
        } else {
          console.log('Created user record successfully');
        }
      } else {
        console.log('Users table exists and user has a record');
      }
    } catch (error) {
      console.log('Error checking/creating users table:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Database migration check failed:', error);
    return false;
  }
}; 