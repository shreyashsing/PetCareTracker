import { supabase } from '../services/supabase';

/**
 * Creates the pets table directly in Supabase
 * This function should be called from a settings/debug screen
 */
export async function createPetsTable(): Promise<{ success: boolean, message: string }> {
  console.log('Attempting to create pets table in Supabase...');
  
  try {
    // First check if pets table already exists by trying to query it
    const { error: checkError } = await supabase
      .from('pets')
      .select('id')
      .limit(1);
    
    // If there's no error or error is not about missing table, the table likely exists
    if (!checkError || checkError.code !== '42P01') {
      return { 
        success: false, 
        message: 'Pets table appears to already exist or another error occurred'
      };
    }
    
    // Table doesn't exist - we can't create it directly from the client
    // We should provide instructions to run the SQL script
    console.log('Could not create pets table automatically.');
    console.log('Please run the create_pets_table.sql script in the Supabase SQL Editor.');
    
    return { 
      success: false, 
      message: 'Please run the create_pets_table.sql script manually in the Supabase SQL Editor' 
    };
  } catch (error) {
    console.error('Exception in createPetsTable:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Checks if the pet record was saved properly in Supabase
 */
export async function checkPetSaved(petId: string): Promise<{ exists: boolean, message: string }> {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select('id, name')
      .eq('id', petId)
      .single();
    
    if (error) {
      return { 
        exists: false, 
        message: `Error checking pet: ${error.message}` 
      };
    }
    
    return { 
      exists: !!data, 
      message: data ? `Pet "${data.name}" found in Supabase` : 'Pet not found in Supabase' 
    };
  } catch (error) {
    return { 
      exists: false, 
      message: `Exception: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
} 