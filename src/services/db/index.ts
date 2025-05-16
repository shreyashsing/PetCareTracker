// Database services
export * from './asyncStorage';
export * from './constants';

// We're keeping the repository base class for backward compatibility but marking it as deprecated
export * from './repository';

// Export constants
export { STORAGE_KEYS } from './constants';

// Export AsyncStorageService
export { AsyncStorageService } from './asyncStorage';

// Import supabase for chat tables functions
import { supabase } from '../supabase';

// Export the unified database manager as the default database manager
import { unifiedDatabaseManager } from './UnifiedDatabaseManager';
export { unifiedDatabaseManager };

// Export the database manager interface
export { UnifiedDatabaseManager } from './UnifiedDatabaseManager';

// Export database migration utilities
import { createChatTablesSQL } from './migrations';
export { createChatTablesSQL };

/**
 * Migrates existing pets that don't have a userId to assign them to the given user
 * @param userId The ID of the user to assign pets to
 * @returns Promise that resolves when migration is complete
 */
export async function migratePetsToUser(userId: string): Promise<void> {
  try {
    console.log(`Migrating pets without userId to user: ${userId}`);
    const allPets = await unifiedDatabaseManager.pets.getAll();
    
    // Find pets without a userId field
    const petsToMigrate = allPets.filter(pet => !pet.userId);
    
    if (petsToMigrate.length > 0) {
      console.log(`Found ${petsToMigrate.length} pets without userId, assigning to current user`);
      
      // Update each pet with the user ID
      for (const pet of petsToMigrate) {
        // Create a new pet object with the userId added
        const updatedPet = {
          ...pet,
          userId: userId
        };
        
        await unifiedDatabaseManager.pets.update(pet.id, updatedPet);
      }
      
      console.log(`Migration complete: ${petsToMigrate.length} pets updated with userId: ${userId}`);
    } else {
      console.log('No pets need migration');
    }
  } catch (error) {
    console.error('Error migrating pets:', error);
  }
}

/**
 * Create the chat tables if they don't exist
 */
export async function createChatTables(): Promise<boolean> {
  try {
    // Check if chat_sessions table exists
    const { error: sessionsError } = await supabase.from('chat_sessions').select('count').limit(1);
    
    if (sessionsError && sessionsError.code === '42P01') {
      console.log('Chat tables not found. You need to create them in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createChatTablesSQL);
      
      // Alert the user
      alert(`The Pet Assistant requires database tables that don't exist yet. 
      
Please log into the Supabase dashboard and run the SQL shown in the console to create the required tables.`);
      
      return false;
    }
    
    // Check if chat_messages table exists 
    const { error: messagesError } = await supabase.from('chat_messages').select('count').limit(1);
    
    if (messagesError && messagesError.code === '42P01') {
      console.log('Chat messages table not found but sessions table exists. Running SQL to create it.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createChatTablesSQL);
      
      // Alert the user
      alert(`The Pet Assistant requires the chat_messages table. 
      
Please log into the Supabase dashboard and run the SQL shown in the console to create the required tables.`);
      
      return false;
    }
    
    // Both tables exist
    return !sessionsError && !messagesError;
  } catch (error) {
    console.error('Error checking for chat tables:', error);
    return false;
  }
} 