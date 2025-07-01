/**
 * Test script to validate that the pet assistant loads active pet context correctly
 * This can be used during development to test the enhanced pet context functionality
 */
import { petAssistantService } from './index';
import { AsyncStorageService } from '../db/asyncStorage';
import { STORAGE_KEYS } from '../db/constants';
import { unifiedDatabaseManager } from '../db';

export async function testPetAssistantContext(): Promise<{
  success: boolean;
  message: string;
  petInfo?: any;
}> {
  try {
    console.log('Testing Pet Assistant Context Loading...');
    
    // 1. Check if there's an active pet in storage
    const activePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
    
    if (!activePetId) {
      return {
        success: false,
        message: 'No active pet found in storage. Please set an active pet first.'
      };
    }
    
    console.log('Found active pet ID:', activePetId);
    
    // 2. Check if the pet exists in the database
    const pet = await unifiedDatabaseManager.pets.getById(activePetId);
    
    if (!pet) {
      return {
        success: false,
        message: `Pet with ID ${activePetId} not found in database.`
      };
    }
    
    console.log('Found pet in database:', pet.name, pet.type, pet.breed);
    
    // 3. Test sending a message to the pet assistant
    const testUserId = 'test-user-123'; // You can replace this with actual user ID
    
    // Clear any existing session to ensure fresh context loading
    petAssistantService.clearCurrentSession();
    
    console.log('Testing pet assistant response...');
    const response = await petAssistantService.sendMessage(
      testUserId, 
      "What should I know about my pet's health?"
    );
    
    if (!response) {
      return {
        success: false,
        message: 'Pet assistant did not return a response.'
      };
    }
    
    console.log('Pet assistant response:', response);
    
    // 4. Check if the response is personalized (contains the pet's name)
    const isPersonalized = response.toLowerCase().includes(pet.name.toLowerCase());
    
    // 5. Get the current session to check if pet info was loaded
    const currentMessages = petAssistantService.getCurrentSessionMessages();
    const systemMessages = currentMessages.filter(msg => msg.role === 'system');
    const hasPetContext = systemMessages.some(msg => 
      msg.content.includes(pet.name) || 
      msg.content.includes('IMPORTANT PET INFORMATION')
    );
    
    return {
      success: true,
      message: `Test completed successfully! 
Pet: ${pet.name} (${pet.type}, ${pet.breed})
Response personalized: ${isPersonalized ? 'Yes' : 'No'}
Pet context loaded: ${hasPetContext ? 'Yes' : 'No'}
Response length: ${response.length} characters`,
      petInfo: {
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        responsePersonalized: isPersonalized,
        contextLoaded: hasPetContext,
        responseLength: response.length
      }
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Quick test function that can be called from React Native debugger
 */
export async function quickTestPetContext() {
  const result = await testPetAssistantContext();
  console.log('=== PET ASSISTANT CONTEXT TEST RESULTS ===');
  console.log('Success:', result.success);
  console.log('Message:', result.message);
  if (result.petInfo) {
    console.log('Pet Info:', result.petInfo);
  }
  console.log('==========================================');
  return result;
} 