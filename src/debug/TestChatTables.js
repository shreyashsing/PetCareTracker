/**
 * TestChatTables.js
 * 
 * This script helps diagnose issues with the chat tables in Supabase.
 * Run it to check if tables exist and try to create a test chat session.
 * 
 * To run: node src/debug/TestChatTables.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('=== Checking Chat Tables ===');
  
  try {
    // Check if the pets table exists
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('count')
      .limit(1);
      
    if (petsError) {
      console.log('❌ Pets table error:', petsError.message);
      console.log('   Error code:', petsError.code);
    } else {
      console.log('✅ Pets table exists');
      
      // Count pets
      const { count } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });
        
      console.log(`   Found ${count} pets in the database`);
      
      // Get first pet to test
      const { data: firstPet } = await supabase
        .from('pets')
        .select('id, user_id, name')
        .limit(1)
        .single();
        
      if (firstPet) {
        console.log(`   First pet: ${firstPet.name} (ID: ${firstPet.id})`);
        console.log(`   User ID: ${firstPet.user_id}`);
        
        // Store for later use
        global.testPetId = firstPet.id;
        global.testUserId = firstPet.user_id;
      }
    }
    
    // Check if chat_sessions table exists
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
      
    if (sessionsError) {
      console.log('❌ Chat sessions table error:', sessionsError.message);
      console.log('   Error code:', sessionsError.code);
    } else {
      console.log('✅ Chat sessions table exists');
      
      // Check schema
      try {
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('*')
          .limit(1);
          
        if (sessionData && sessionData.length > 0) {
          console.log('   Chat session schema:', Object.keys(sessionData[0]).join(', '));
        }
      } catch (err) {
        console.log('   Could not check schema:', err.message);
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
    
    return !petsError && !sessionsError && !messagesError;
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}

async function testCreateSession() {
  console.log('\n=== Testing Chat Session Creation ===');
  
  try {
    if (!global.testUserId) {
      console.log('❌ No test user ID available. Skipping session test.');
      return false;
    }
    
    // Try to create a chat session
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: global.testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.log('❌ Failed to create chat session:', error.message);
      console.log('   Error code:', error.code);
      return false;
    }
    
    console.log('✅ Successfully created chat session');
    console.log('   Session ID:', session.id);
    
    // Now try with pet_id
    if (global.testPetId) {
      const { data: petSession, error: petSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: global.testUserId,
          pet_id: global.testPetId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (petSessionError) {
        console.log('❌ Failed to create chat session with pet ID:', petSessionError.message);
        console.log('   This suggests a foreign key constraint issue');
        return false;
      }
      
      console.log('✅ Successfully created chat session with pet ID');
      console.log('   Session ID:', petSession.id);
      
      // Try to add a message
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: petSession.id,
          content: 'Test message',
          role: 'system',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
        
      if (messageError) {
        console.log('❌ Failed to create chat message:', messageError.message);
        return false;
      }
      
      console.log('✅ Successfully created chat message');
      console.log('   Message ID:', message.id);
      
      // Clean up test data
      await supabase
        .from('chat_messages')
        .delete()
        .eq('id', message.id);
        
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', petSession.id);
        
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', session.id);
        
      console.log('✅ Cleaned up test data');
    }
    
    return true;
  } catch (error) {
    console.error('Error testing chat session creation:', error);
    return false;
  }
}

async function runDiagnostics() {
  console.log('=== Chat Tables Diagnostics ===');
  console.log('Checking database connection...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('✅ Authenticated as', user.email);
    } else {
      console.log('❗ Not authenticated. Using anon key.');
    }
    
    const tablesOk = await checkTables();
    
    if (tablesOk) {
      const sessionTest = await testCreateSession();
      if (sessionTest) {
        console.log('\n✅ All checks passed! The chat tables appear to be working correctly.');
      } else {
        console.log('\n❌ Session creation test failed. Please check the errors above.');
      }
    } else {
      console.log('\n❌ Table checks failed. You may need to run the SQL scripts to create the tables.');
    }
  } catch (error) {
    console.error('Error running diagnostics:', error);
  }
}

runDiagnostics(); 