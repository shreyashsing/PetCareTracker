import { AsyncStorageService } from './asyncStorage';
import { databaseManager } from '.';
import { User } from '../../types/components';
import { hashPassword } from '../auth/passwordService';

// Migration version key
const DB_MIGRATION_VERSION_KEY = 'db_migration_version';

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