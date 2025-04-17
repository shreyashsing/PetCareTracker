import { supabase } from '../services/supabase';

/**
 * Debug logging utilities for Supabase
 */

/**
 * Check if Supabase tables exist and log their structure
 */
export async function checkSupabaseTables(): Promise<void> {
  console.log('Checking Supabase tables...');
  
  try {
    // Check if pets table exists and has correct structure
    console.log('Checking pets table...');
    
    const { data: tableCheck, error: tableError } = await supabase.rpc(
      'check_table_exists',
      { table_name: 'pets' }
    );
    
    if (tableError) {
      console.error('Error checking if pets table exists:', tableError);
    } else {
      console.log('Pets table exists:', tableCheck);
      
      // If table exists, get its schema
      if (tableCheck) {
        console.log('Getting pets table schema...');
        
        const { data: schemaData, error: schemaError } = await supabase.rpc(
          'get_table_schema',
          { table_name: 'pets' }
        );
        
        if (schemaError) {
          console.error('Error getting pets table schema:', schemaError);
        } else {
          console.log('Pets table schema:', schemaData);
        }
      }
    }
    
    // Try to get data from pets table
    console.log('Checking pets table data...');
    
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('id, name, user_id')
      .limit(5);
    
    if (petsError) {
      console.error('Error getting pets from Supabase:', petsError);
    } else {
      console.log(`Found ${petsData.length} pets in Supabase:`, petsData);
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