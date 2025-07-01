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

// App feedback table SQL
export const createAppFeedbackTableSQL = `
-- Create app_feedback table to store user feedback, bug reports and feature requests
CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request', 'general_feedback', 'issue_report')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical', NULL)),
  app_version VARCHAR(20),
  device_info TEXT,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'in_progress', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT FALSE,
  contact_email VARCHAR(255),
  admin_notes TEXT
);

-- Add RLS policies
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new feedback (logged in users or anonymous)
CREATE POLICY "Users can submit feedback" ON app_feedback
  FOR INSERT 
  WITH CHECK (true);  -- Allow any authenticated user to submit feedback

-- Policy for users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON app_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for updating feedback status (only admins/service role)
CREATE POLICY "Only service role can update feedback" ON app_feedback
  FOR UPDATE
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Create index on feedback_type for faster queries
CREATE INDEX idx_app_feedback_type ON app_feedback(feedback_type);

-- Create index on user_id for faster user-specific queries
CREATE INDEX idx_app_feedback_user ON app_feedback(user_id);

-- Create index on status for faster filtering
CREATE INDEX idx_app_feedback_status ON app_feedback(status);

-- Add trigger to update updated_at field
CREATE OR REPLACE FUNCTION update_app_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_feedback_updated_at
BEFORE UPDATE ON app_feedback
FOR EACH ROW
EXECUTE FUNCTION update_app_feedback_updated_at();`;

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

/**
 * Create the app feedback table if it doesn't exist
 */
export async function createAppFeedbackTable(): Promise<boolean> {
  try {
    // Check if app_feedback table exists
    const { error: feedbackError } = await supabase.from('app_feedback').select('count').limit(1);
    
    if (feedbackError && feedbackError.code === '42P01') {
      console.log('App feedback table not found. You should create it in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createAppFeedbackTableSQL);
      
      return false;
    }
    
    // Table exists
    return !feedbackError;
  } catch (error) {
    console.error('Error checking for app feedback table:', error);
    return false;
  }
} 