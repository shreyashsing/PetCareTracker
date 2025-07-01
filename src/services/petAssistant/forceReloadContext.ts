/**
 * Utility to force reload pet context in the Pet Assistant
 * Use this when the assistant isn't getting the latest pet data
 */

import { petAssistantService } from './index';
import { AsyncStorageService } from '../db/asyncStorage';
import { STORAGE_KEYS } from '../db/constants';

export const forceReloadPetContext = async (userId: string) => {
  try {
    console.log('🔄 Force reloading Pet Assistant context...');
    
    // 1. Clear current session to force reload
    petAssistantService.clearCurrentSession();
    console.log('✅ Cleared current session');
    
    // 2. Get active pet ID
    const activePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
    console.log('Active Pet ID:', activePetId);
    
    if (!activePetId) {
      console.log('❌ No active pet found');
      return false;
    }
    
    // 3. Start new session with pet context
    const sessionId = await petAssistantService.startNewSession(userId, activePetId);
    console.log('✅ Started new session with pet context:', sessionId);
    
    if (sessionId) {
      console.log('✅ Pet Assistant context reloaded successfully!');
      console.log('💬 Try asking about your pet\'s food now');
      return true;
    } else {
      console.log('❌ Failed to start new session');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error reloading pet context:', error);
    return false;
  }
};

export const testPetAssistantContext = async (userId: string) => {
  console.log('🧪 Testing Pet Assistant Context...');
  
  // Force reload first
  const reloaded = await forceReloadPetContext(userId);
  
  if (reloaded) {
    console.log('🎯 Context reloaded. Now test with these prompts:');
    console.log('1. "What food am I giving to my pet?"');
    console.log('2. "Show me today\'s feeding schedule"');
    console.log('3. "What does my pet prefer to eat?"');
  }
  
  return reloaded;
}; 