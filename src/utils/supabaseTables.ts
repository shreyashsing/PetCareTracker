import { supabase } from '../services/supabase';

/**
 * Utility script to diagnose table issues
 * This can be used to check if pets table exists and if chat tables reference it correctly
 */
export async function checkSupabaseTables() {
  console.log('=== Supabase Table Check Tool ===');
  
  try {
    // Check if pets table exists
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('count')
      .limit(1);
      
    if (petsError) {
      console.log('❌ Pets table error:', petsError.message);
      console.log('   Error code:', petsError.code);
      
      if (petsError.code === '42P01') {
        console.log('   Pets table does not exist. This is likely causing the foreign key constraint issues.');
      }
    } else {
      console.log('✅ Pets table exists');
      
      // Check table structure
      const { data: petsColumns, error: columnsError } = await supabase
        .from('pets')
        .select()
        .limit(1);
        
      if (columnsError) {
        console.log('   Could not check pets table structure:', columnsError.message);
      } else {
        console.log('   Sample record keys:', Object.keys(petsColumns?.[0] || {}).join(', '));
      }
      
      // Count pets
      const { count } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });
        
      console.log(`   Found ${count} pets in the database`);
    }
    
    // Check if chat_sessions table exists
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
      
    if (sessionsError) {
      console.log('❌ Chat sessions table error:', sessionsError.message);
      console.log('   Error code:', sessionsError.code);
      
      if (sessionsError.code === '42P01') {
        console.log('   Chat sessions table does not exist.');
      }
    } else {
      console.log('✅ Chat sessions table exists');
      
      // Check for foreign key constraint on pet_id
      console.log('   Checking foreign key constraint...');
      
      // Direct check to see if creating a session with non-existent pet_id fails
      const testUuid = '00000000-0000-0000-0000-000000000000'; // Non-existent UUID
      const { error: constraintError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          pet_id: testUuid
        })
        .select();
        
      if (constraintError && constraintError.message.includes('foreign key constraint')) {
        console.log('❌ Foreign key constraint is enforced and pet_id must exist in pets table');
        console.log('   Error:', constraintError.message);
      } else if (constraintError) {
        console.log('⚠️ Other error creating session:', constraintError.message);
      } else {
        console.log('✅ Foreign key constraint either doesn\'t exist or allows nulls');
        
        // Clean up test record
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('pet_id', testUuid);
      }
    }
    
    // Check if chat_messages table exists
    const { data: messagesData, error: messagesError } = await supabase
      .from('chat_messages')
      .select('count')
      .limit(1);
      
    if (messagesError) {
      console.log('❌ Chat messages table error:', messagesError.message);
      console.log('   Error code:', messagesError.code);
    } else {
      console.log('✅ Chat messages table exists');
    }
    
    // Provide a solution
    if (petsError && petsError.code === '42P01') {
      console.log('\n=== Solution ===');
      console.log('1. The pets table does not exist. You need to create it first.');
      console.log('2. Run the SQL script from src/services/sql/create_pets_table.sql in your Supabase SQL Editor.');
      console.log('3. After creating the pets table, run the script from src/services/sql/create_chat_tables.sql');
    } else if (sessionsError && sessionsError.code === '42P01') {
      console.log('\n=== Solution ===');
      console.log('1. The chat_sessions table does not exist.');
      console.log('2. Run the SQL script from src/services/sql/create_chat_tables.sql in your Supabase SQL Editor.');
    }
    
    console.log('\n=== Check Complete ===');
  } catch (error) {
    console.error('Error checking tables:', error);
  }
} 