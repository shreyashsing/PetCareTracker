import { supabase } from '../services/supabase';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { STORAGE_KEYS } from '../services/db/constants';
import { generateUUID } from './helpers';
import { formatDateForSupabase } from './dateUtils';

/**
 * Debug logging utilities for Supabase
 */

/**
 * Check if Supabase tables exist and log their structure
 */
export async function checkSupabaseTables(): Promise<void> {
  console.log('Checking Supabase tables...');
  
  try {
    // Check if pets table exists by attempting to query it
    console.log('Checking pets table...');
    
    // Try to query the pets table directly (will fail if table doesn't exist)
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('id')
      .limit(1);
    
    if (petsError) {
      console.error('Error checking if pets table exists:', petsError);
      
      if (petsError.code === '42P01') {
        console.log('Pets table does not exist. Please create it using the SQL script.');
      }
    } else {
      console.log('Pets table exists and is accessible');
      
      // Now try to get the count of pets
      const { count, error: countError } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error getting pets count:', countError);
      } else {
        console.log(`Pets table contains ${count} records`);
      }
      
      // Try to get a sample of data
      const { data: sampleData, error: sampleError } = await supabase
        .from('pets')
        .select('id, name, user_id, type')
        .limit(5);
      
      if (sampleError) {
        console.error('Error getting sample data:', sampleError);
      } else {
        console.log('Sample pets data:', sampleData);
      }
    }
  } catch (error) {
    console.error('Exception in checkSupabaseTables:', error);
  }
}

/**
 * Check if the user has permission to insert into the pets table
 * 
 * @param userId The current user's ID to check
 */
export async function checkPetsInsertPermission(userId: string): Promise<boolean> {
  console.log(`Checking if user ${userId} has permission to insert into pets table...`);
  
  try {
    // Create a dummy pet to test insertion
    const testPet = {
      id: '00000000-0000-0000-0000-000000000000',
      user_id: userId,
      name: 'TEST_PERMISSION_CHECK',
      type: 'other',
      created_at: new Date().toISOString()
    };
    
    // Try to insert the pet
    const { data, error } = await supabase
      .from('pets')
      .insert([testPet])
      .select();
    
    if (error) {
      console.error('Permission check failed:', error);
      return false;
    }
    
    console.log('Permission check succeeded:', data);
    
    // Delete the test pet
    const { error: deleteError } = await supabase
      .from('pets')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error deleting test pet:', deleteError);
    }
    
    return true;
  } catch (error) {
    console.error('Exception checking permission:', error);
    return false;
  }
}

/**
 * Checks if there's a mismatch between AsyncStorage pet schema and Supabase pets table
 * This helps identify issues like the insurance_info column error
 */
export async function checkPetSchemaMismatch() {
  console.log('=== Checking Pet Schema Mismatch ===');
  
  try {
    // First, get a pet from AsyncStorage
    const petsJson = await AsyncStorageService.getItem<string>(STORAGE_KEYS.PETS);
    const localPets = petsJson ? JSON.parse(petsJson) : [];
    
    if (!localPets || localPets.length === 0) {
      console.log('No pets found in AsyncStorage');
      return;
    }
    
    const localPet = localPets[0];
    console.log('Local pet schema:', Object.keys(localPet).join(', '));
    
    // Check Supabase by directly trying to access the insurance_info column
    try {
      const { error } = await supabase
        .from('pets')
        .select('insurance_info')
        .limit(1);
      
      if (error && error.code === '42703') {
        console.log('✅ Confirmed insurance_info column does not exist in Supabase (good)');
      } else if (!error) {
        console.log('⚠️ Found insurance_info column in Supabase schema but it was removed in the app!');
        console.log('This is likely causing the error when creating pets');
        console.log('Consider running this SQL to remove the column:');
        console.log(`
ALTER TABLE pets 
DROP COLUMN IF EXISTS insurance_info;
        `);
      } else {
        console.log('Error trying to check for insurance_info column:', error.message);
      }
    } catch (e) {
      console.error('Error checking Supabase schema:', e);
    }
    
    // Try to create a simplified test pet
    console.log('\nAttempting to create a simplified test pet in Supabase...');
    const testPet = {
      id: '00000000-0000-0000-0000-000000000000',
      user_id: 'test-user',
      name: 'Test Pet',
      type: 'dog',
      breed: 'Test Breed',
      birth_date: new Date().toISOString(),
      gender: 'unknown',
      weight: 10,
      weight_unit: 'kg',
      microchipped: false,
      neutered: false,
      color: '',
      medical_conditions: [],
      allergies: [],
      status: 'healthy',
      created_at: new Date().toISOString()
    };
    
    const { error: createError } = await supabase
      .from('pets')
      .upsert([testPet])
      .select();
    
    if (createError) {
      console.log('❌ Error creating test pet:', createError.message);
      if (createError.message.includes('insurance_info')) {
        console.log('⚠️ This confirms the insurance_info column issue.');
      }
    } else {
      console.log('✅ Test pet created successfully!');
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('pets')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.log('Warning: Could not delete test pet:', deleteError.message);
      }
    }
  } catch (e) {
    console.error('Error in checkPetSchemaMismatch:', e);
  }
}

/**
 * Creates a test pet in Supabase to diagnose issues
 * @param userId The user ID to associate with the test pet
 */
export async function createTestPet(userId: string): Promise<{ success: boolean, petId?: string, error?: any }> {
  console.log(`Creating test pet for user ${userId}...`);
  
  try {
    const testPetId = generateUUID();
    const now = new Date();
    
    // Create a minimal test pet
    const testPet = {
      id: testPetId,
      user_id: userId,
      name: `Test Pet ${now.toISOString().substring(0, 10)}`,
      type: 'dog',
      breed: 'Test Breed',
      birth_date: formatDateForSupabase(now),
      gender: 'unknown',
      weight: 10,
      weight_unit: 'kg',
      microchipped: false,
      neutered: false,
      medical_conditions: [],
      allergies: [],
      status: 'healthy',
      created_at: now.toISOString()
    };
    
    // Attempt to insert directly to Supabase
    const { data, error } = await supabase
      .from('pets')
      .insert([testPet])
      .select();
    
    if (error) {
      console.error('Error creating test pet:', error);
      return { success: false, error };
    }
    
    console.log('Test pet created successfully:', data[0]);
    return { success: true, petId: testPetId };
  } catch (error) {
    console.error('Exception creating test pet:', error);
    return { success: false, error };
  }
}

/**
 * Ensures the pets table exists in Supabase
 * If it doesn't exist, provides instructions on how to create it
 */
export async function ensurePetsTable(): Promise<boolean> {
  console.log('Ensuring pets table exists in Supabase...');
  
  try {
    // Check if the table exists by querying it
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, type')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log('Pets table does not exist in Supabase.');
        console.log('Please run the following SQL in the Supabase SQL Editor:');
        console.log(`
-- First, create the UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the pets table with all required fields
CREATE TABLE IF NOT EXISTS public.pets (
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
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and modify their own pets
CREATE POLICY "Users can view their own pets" 
  ON public.pets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets" 
  ON public.pets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets" 
  ON public.pets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets" 
  ON public.pets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
        `);
        return false;
      } else {
        console.error('Error checking pets table:', error);
        return false;
      }
    }
    
    // Get a count of pets to verify accessibility
    console.log('Pets table exists in Supabase. Checking accessibility...');
    
    const { count, error: countError } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count of pets:', countError);
      return false;
    }
    
    console.log(`✅ Pets table is accessible, contains ${count || 0} pets`);
    
    // Try to run a manual check for the insurance_info column by attempting to query it
    try {
      const { error: insuranceError } = await supabase
        .from('pets')
        .select('insurance_info')
        .limit(1);
      
      if (insuranceError && insuranceError.code === '42703') { // Column doesn't exist
        console.log('✅ Confirmed insurance_info column does not exist (good!)');
      } else if (!insuranceError) {
        console.warn('⚠️ The pets table has an insurance_info column that may cause issues!');
        console.log('Consider running this SQL to remove it:');
        console.log(`
ALTER TABLE pets 
DROP COLUMN IF EXISTS insurance_info;
        `);
      }
    } catch (e) {
      // Ignore this error, it's expected if the column doesn't exist
    }
    
    return true;
  } catch (error) {
    console.error('Exception in ensurePetsTable:', error);
    return false;
  }
} 