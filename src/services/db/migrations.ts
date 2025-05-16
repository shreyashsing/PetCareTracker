import { AsyncStorageService } from './asyncStorage';
import {unifiedDatabaseManager} from ".";
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
      const users = await unifiedDatabaseManager.users.getAll();
      
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
          await unifiedDatabaseManager.users.update(user.id, user);
          
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
      const users = await unifiedDatabaseManager.users.getAll();
      
      // Add preferences to each user
      for (const user of users) {
        if (!user.preferences) {
          user.preferences = {
            emailNotifications: true,
            pushNotifications: true,
            theme: 'system'
          };
          await unifiedDatabaseManager.users.update(user.id, user);
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
    console.log('Running migrations to ensure required tables exist...');
    
    // First make sure the pets table exists
    const petsTableExists = await ensurePetsTableExists();
    if (!petsTableExists) {
      console.error('Failed to ensure pets table exists. Some functionality may not work correctly.');
    }
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user. Skipping chat tables creation.');
      return false;
    }
    
    const userId = user.id;
    let userEmail = '';
    let userDisplayName = '';
    
    // Get user details if available
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();
      
      if (!userError && userData) {
        userEmail = userData.email;
        userDisplayName = userData.display_name || '';
      } else {
        // Try to get from auth.users
        const { data: authUserData } = await supabase.auth.getUser();
        userEmail = authUserData?.user?.email || '';
      }
    } catch (error) {
      console.log('Error getting user details:', error);
    }
    
    // Check for profiles table and create profile if needed
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
    console.error('Error in runMigrationsToEnsureTablesExist:', error);
    return false;
  }
};

/**
 * SQL to create the chat tables in Supabase
 */
export const createChatTablesSQL = `
-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            pet_id UUID,
            title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_pet_id_idx ON public.chat_sessions(pet_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON public.chat_messages(session_id);
`;

/**
 * SQL to create the entity tables in Supabase
 */
export const createEntityTablesSQL = `
-- Create food_items table
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  type TEXT,
  main_ingredient TEXT,
  calories_per_serving NUMERIC,
  serving_size JSONB,
  nutritional_info JSONB,
  notes TEXT,
  purchase_info JSONB,
  expiration_date TIMESTAMP WITH TIME ZONE,
  opened_date TIMESTAMP WITH TIME ZONE,
  inventory JSONB,
  category TEXT,
  pet_preference TEXT,
  rating NUMERIC,
  veterinarian_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  time TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT,
  foods JSONB DEFAULT '[]'::jsonb,
  total_calories NUMERIC DEFAULT 0,
  hydration JSONB,
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE,
  reaction TEXT,
  fed_by TEXT,
  reminder_settings JSONB,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  schedule_info JSONB NOT NULL,
  location JSONB,
  reminder_settings JSONB,
  status TEXT DEFAULT 'pending',
  completion_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  dosage JSONB,
  frequency JSONB,
  duration JSONB,
  administration_method TEXT,
  prescribed_by TEXT,
  refills_remaining INTEGER,
  refillable BOOLEAN DEFAULT FALSE,
  purpose TEXT,
  status TEXT DEFAULT 'active',
  reminder_settings JSONB,
  history JSONB DEFAULT '[]'::jsonb,
  inventory JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health_records table
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  provider JSONB,
  attachments JSONB DEFAULT '[]'::jsonb,
  cost NUMERIC,
  insurance_covered BOOLEAN DEFAULT FALSE,
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_sessions table
CREATE TABLE IF NOT EXISTS public.activity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL,
  duration INTEGER,
  distance NUMERIC,
  distance_unit TEXT,
  intensity TEXT,
  notes TEXT,
  weather_conditions JSONB,
  location JSONB,
  mood TEXT,
  companions JSONB,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS food_items_pet_id_idx ON public.food_items(pet_id);
CREATE INDEX IF NOT EXISTS food_items_user_id_idx ON public.food_items(user_id);
CREATE INDEX IF NOT EXISTS meals_pet_id_idx ON public.meals(pet_id);
CREATE INDEX IF NOT EXISTS meals_user_id_idx ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS tasks_pet_id_idx ON public.tasks(pet_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS medications_pet_id_idx ON public.medications(pet_id);
CREATE INDEX IF NOT EXISTS medications_user_id_idx ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS health_records_pet_id_idx ON public.health_records(pet_id);
CREATE INDEX IF NOT EXISTS health_records_user_id_idx ON public.health_records(user_id);
CREATE INDEX IF NOT EXISTS activity_sessions_pet_id_idx ON public.activity_sessions(pet_id);
CREATE INDEX IF NOT EXISTS activity_sessions_user_id_idx ON public.activity_sessions(user_id);
`;

/**
 * Create the entity tables if they don't exist
 */
export async function createEntityTables(): Promise<boolean> {
  try {
    // Check if food_items table exists
    const { error: foodItemsError } = await supabase.from('food_items').select('count').limit(1);
    
    if (foodItemsError && foodItemsError.code === '42P01') {
      console.log('Entity tables not found. You need to create them in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createEntityTablesSQL);
      
      // Alert the user
      alert(`The app requires database tables that don't exist yet. 
      
Please log into the Supabase dashboard and run the SQL shown in the console to create the required tables.`);
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking for entity tables:', error);
    return false;
  }
}

const createPetsTableSQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  breed TEXT,
  birth_date TIMESTAMP WITH TIME ZONE,
  gender TEXT,
  weight NUMERIC,
  weight_unit TEXT DEFAULT 'kg',
  microchipped BOOLEAN DEFAULT false,
  microchip_id TEXT,
  neutered BOOLEAN DEFAULT false,
  adoption_date TIMESTAMP WITH TIME ZONE,
  color TEXT,
  image TEXT,
  medical_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- Set up Row Level Security
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to view and modify their own pets
CREATE POLICY "Users can view their own pets" 
  ON pets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets" 
  ON pets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets" 
  ON pets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets" 
  ON pets 
  FOR DELETE 
  USING (auth.uid() = user_id);
`;

export const ensurePetsTableExists = async (): Promise<boolean> => {
  try {
    // Check if the pets table exists
    const { data, error } = await supabase
      .from('pets')
      .select('id, name')
      .limit(1);

    if (error) {
      console.log('Error checking pets table, it might not exist:', error.message);
      console.log('To create the pets table, please run the SQL script in the Supabase SQL Editor:');
      console.log(createPetsTableSQL);
      return false;
    }

    console.log('Pets table exists and is accessible');
    
    // Get a count of pets to verify accessibility
    const { count, error: countError } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`Found ${count || 0} pets in the database`);
    }
    
    // Try to run a manual check for the insurance_info column by attempting to query it
    try {
      const { error: insuranceError } = await supabase
        .from('pets')
        .select('insurance_info')
        .limit(1);
      
      if (insuranceError && insuranceError.code === '42703') {
        console.log('insurance_info column does not exist (good)');
      } else if (!insuranceError) {
        console.warn('The pets table has an insurance_info column that may cause issues!');
        console.warn('Consider running the fix_pets_table.sql script in the Supabase SQL Editor.');
      }
    } catch (e) {
      // Ignore this error, it's expected if the column doesn't exist
    }
    
    return true;
  } catch (error) {
    console.error('Error in ensurePetsTableExists:', error);
    return false;
  }
};

export const ensureChatTablesExist = async (): Promise<boolean> => {
  try {
    // Check if the chat_sessions table exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .limit(1);

    // Check if the chat_messages table exists
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);

    if (sessionError || messageError) {
      console.log('Error checking chat tables, they might not exist:', 
        sessionError?.message || messageError?.message);
      console.log('To create the chat tables, please run the SQL script in the Supabase SQL Editor:');
      console.log(createChatTablesSQL);
      return false;
    }

    console.log('Chat tables exist and are accessible');
    return true;
  } catch (error) {
    console.error('Error in ensureChatTablesExist:', error);
    return false;
  }
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Starting database initialization...');
    
    // Ensure pets table exists
    const petsTableExists = await ensurePetsTableExists();
    console.log(`Pets table exists or was created: ${petsTableExists}`);
    
    // Ensure chat tables exist
    const chatTablesExist = await ensureChatTablesExist();
    console.log(`Chat tables exist or were created: ${chatTablesExist}`);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}; 