import { GeminiService, ChatMessage as GeminiChatMessage } from './geminiService';
import { chatRepository } from './chatRepository';
import { securityService } from '../security';
import { supabase } from '../supabase';
import { ensureChatTablesExist } from '../db/migrations';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { API_URL, NetworkUtils } from '../../config/network';

// Create a singleton instance of the GeminiService
const geminiService = new GeminiService();

// Track if we're in offline mode
let isOfflineMode = false;
// Track when we last checked offline status to prevent rapid toggling
let lastOfflineCheck = 0;
const OFFLINE_CHECK_INTERVAL = 10000; // 10 seconds

// Function to check network connectivity
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Don't check too frequently
    const now = Date.now();
    if (now - lastOfflineCheck < OFFLINE_CHECK_INTERVAL) {
      return !isOfflineMode; // Return cached result
    }
    
    lastOfflineCheck = now;
    console.log('PetAssistant: Checking network connectivity...');
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
    console.log(`PetAssistant: Network connectivity: ${isConnected ? 'Connected' : 'Disconnected'}`);
    
    // Only update offline mode if there's a definite change to avoid flickering
    if (!isConnected && !isOfflineMode) {
      isOfflineMode = true;
    } else if (isConnected && isOfflineMode) {
      // Require multiple successful checks before switching back to online
      const doubleCheck = await NetInfo.fetch();
      if (doubleCheck.isConnected && doubleCheck.isInternetReachable) {
        isOfflineMode = false;
      }
    }
    
    return !isOfflineMode;
  } catch (error) {
    console.warn('PetAssistant: Error checking network connectivity:', error);
    return !isOfflineMode;
  }
}

export interface PetInfo {
  id: string;
  name: string;
  type: string;
  breed: string;
  age?: number;
  gender: string;
  weight?: number;
  weightUnit?: string;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
}

export interface ChatSession {
  id: string;
  messages: GeminiChatMessage[];
  petInfo?: PetInfo;
}

class PetAssistantService {
  private currentSession: ChatSession | null = null;
  
  constructor() {}
  
  /**
   * Initialize the chat service and ensure the backend API is available
   */
  async initialize(userId?: string): Promise<boolean> {
    try {
      // First check network connectivity with timeout using the robust check
      let isConnected = false;
      try {
        console.log('PetAssistantService: Checking network connectivity...');
        isConnected = await NetworkUtils.runRobustConnectivityCheck();
        console.log(`PetAssistantService: Network connectivity: ${isConnected ? 'Connected' : 'Disconnected'}`);
      } catch (netError) {
        console.warn('PetAssistantService: Error checking network:', netError);
        isConnected = false;
      }
      
      if (!isConnected) {
        console.log('PetAssistantService: Device is offline, setting offline mode');
        isOfflineMode = true;
        return true; // Return true to allow app to function in offline mode
      }
      
      // First, try to ensure the chat tables exist
      let tablesCreated = false;
      try {
        tablesCreated = await ensureChatTablesExist();
      } catch (dbError) {
        console.error('Error creating chat tables:', dbError);
        tablesCreated = false;
      }
      
      if (!tablesCreated) {
        console.warn('Failed to create chat tables. The Pet Assistant will work in limited mode.');
        isOfflineMode = true;
        return true; // Still return true to allow offline functionality
      }
      
      // Check if our secure backend API is available
      console.log('PetAssistantService: Checking if backend API is available...');
      
      // Use a timeout to prevent hanging on API check
      const apiCheckPromise = geminiService.checkApiAvailability();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8000);
      });
      
      const apiAvailable = await Promise.race([apiCheckPromise, timeoutPromise]);
      
      if (!apiAvailable) {
        console.warn('PetAssistantService: Backend API is not available, enabling offline mode');
        isOfflineMode = true;
        return true; // Still return true to allow offline functionality
      }
      
      console.log('PetAssistantService: Backend API is available');
      isOfflineMode = false;
      return true;
    } catch (error) {
      console.error('Error initializing Pet Assistant:', error);
      isOfflineMode = true;
      return true; // Still return true to allow offline functionality
    }
  }
  
  /**
   * This method is kept for backward compatibility, but API keys are now stored on the server
   * It no longer does anything with the key locally
   */
  async setApiKey(key: string): Promise<void> {
    console.log('PetAssistantService: API keys are now stored on the server');
    // Simply check if API is available
    await geminiService.checkApiAvailability();
  }
  
  /**
   * Check if the backend API is available and configured with a valid key
   */
  async hasApiKey(): Promise<boolean> {
    try {
      // Don't check too frequently
      const now = Date.now();
      if (now - lastOfflineCheck < OFFLINE_CHECK_INTERVAL) {
        return !isOfflineMode; // Return cached result
      }
      
      lastOfflineCheck = now;
      
      // First check network connectivity using robust method
      const isConnected = await NetworkUtils.runRobustConnectivityCheck();
      
      if (!isConnected) {
        isOfflineMode = true;
        return false;
      }
      
      // Added timeout to avoid long waits when server is unreachable
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(false);
        }, 5000);
      });
      
      // Race between the actual check and the timeout
      const result = await Promise.race([
        geminiService.checkApiAvailability(),
        timeoutPromise
      ]);
      
      // Only update offline mode if there's a definite change
      if (!result && !isOfflineMode) {
        isOfflineMode = true;
      } else if (result && isOfflineMode) {
        // Require confirmation before switching back to online
        const confirmResult = await geminiService.checkApiAvailability();
        if (confirmResult) {
          isOfflineMode = false;
        }
      }
      
      return !isOfflineMode;
    } catch (error) {
      console.error('Error checking API availability:', error);
      return !isOfflineMode;
    }
  }
  
  /**
   * Returns true if the app is currently in offline mode
   */
  isOffline(): boolean {
    return isOfflineMode;
  }
  
  /**
   * Start a new chat session
   */
  async startNewSession(userId: string, petId?: string): Promise<string | null> {
    try {
      // First check network connectivity with a timeout
      let isConnected = false;
      try {
        const netInfoPromise = NetInfo.fetch();
        const timeoutPromise = new Promise<any>((resolve) => {
          setTimeout(() => resolve({ isConnected: false, isInternetReachable: false }), 3000);
        });
        
        const netInfo = await Promise.race([netInfoPromise, timeoutPromise]);
        isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
        console.log(`PetAssistantService: Network connectivity: ${isConnected ? 'Connected' : 'Disconnected'}`);
      } catch (netError) {
        console.warn('PetAssistantService: Error checking network:', netError);
        isConnected = false;
      }
      
      if (!isConnected) {
        console.log('PetAssistantService: Device is offline, setting offline mode');
        isOfflineMode = true;
        // Create a temporary session
        const tempSessionId = 'temp-' + Date.now();
        this.currentSession = {
          id: tempSessionId,
          messages: [
            {
              role: 'system',
              content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
            }
          ]
        };
        return tempSessionId;
      }
      
      // Try to create new session in DB with timeout
      try {
        // Prepare for server timeout
        const createSessionPromise = chatRepository.createSession(userId, petId);
        const timeoutPromise = new Promise<string | null>((resolve) => {
          setTimeout(() => {
            console.warn('PetAssistantService: Session creation timed out');
            resolve(null);
          }, 10000); // Increased from 5000 to 10000 (10 seconds)
        });
        
        // Race between server response and timeout
        const sessionId = await Promise.race([createSessionPromise, timeoutPromise]);
        
        if (!sessionId) {
          console.warn('PetAssistantService: Failed to create chat session, using temporary session');
          // Create a fallback temporary session ID for offline mode
          isOfflineMode = true;
          const tempSessionId = 'temp-' + Date.now();
          this.currentSession = {
            id: tempSessionId,
            messages: [
              {
                role: 'system',
                content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
              }
            ]
          };
          return tempSessionId;
        }
        
        // Initialize messages array with system message
        this.currentSession = {
          id: sessionId,
          messages: [
            {
              role: 'system',
              content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
            }
          ]
        };
        
        // If pet ID is provided, fetch pet info to provide context
        if (petId) {
          try {
            await this.loadPetContext(petId);
          } catch (petError) {
            console.warn('PetAssistantService: Error loading pet context:', petError);
            // Continue without pet context
          }
        }
        
        return sessionId;
      } catch (error) {
        console.warn('PetAssistantService: Error creating session, continuing with temporary session:', error);
        
        // Create a fallback temporary session ID for offline mode
        isOfflineMode = true;
        const tempSessionId = 'temp-' + Date.now();
        this.currentSession = {
          id: tempSessionId,
          messages: [
            {
              role: 'system',
              content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
            }
          ]
        };
        return tempSessionId;
      }
    } catch (error) {
      console.error('Error starting new session:', error);
      // Create a fallback temporary session ID for offline mode
      isOfflineMode = true;
      const tempSessionId = 'temp-' + Date.now();
      this.currentSession = {
        id: tempSessionId,
        messages: [
          {
            role: 'system',
            content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
          }
        ]
      };
      return tempSessionId;
    }
  }
  
  /**
   * Load a previous chat session
   */
  async loadSession(sessionId: string): Promise<boolean> {
    try {
      // Get all messages for this session
      const messages = await chatRepository.getSessionMessages(sessionId);
      
      // Initialize the session even if there are no messages
      this.currentSession = {
        id: sessionId,
        messages: []
      };
      
      // If we have messages, convert and add them
      if (messages && messages.length > 0) {
        // Convert DB messages to Gemini format
        const geminiMessages: GeminiChatMessage[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Update current session messages
        this.currentSession.messages = geminiMessages;
      } else {
        // Add a system message for empty sessions
        this.currentSession.messages.push({
          role: 'system',
          content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
        });
        console.log('No messages found for session, initialized with system message');
      }
      
      return true;
    } catch (error) {
      console.error('Error loading session:', error);
      return false;
    }
  }
  
  /**
   * Load pet information to provide context for AI responses
   */
  private async loadPetContext(petId: string): Promise<void> {
    try {
      console.log(`Loading pet context for petId: ${petId}`);
      
      // Refresh auth if needed before database operations
      await this.refreshAuthIfNeeded();
      
      // First check if the pet exists
      const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // This is the "no rows returned" error
          console.log(`No pet found with ID ${petId} - continuing without pet context`);
          // Still create a session, just without pet info
          return;
        } else {
          // Some other error
          console.error('Error loading pet info:', error);
          return;
        }
      }
      
      if (!pet) {
        console.log(`Pet with ID ${petId} not found - continuing without pet context`);
        return;
      }
      
      // Get health records for medical conditions - this is optional data
      let healthRecords: any[] = [];
      try {
        await this.refreshAuthIfNeeded();
        const { data: records, error: recordsError } = await supabase
          .from('health_records')
          .select('type, title, symptoms, diagnosis')
          .eq('pet_id', petId)
          .order('date', { ascending: false })
          .limit(5);
        
        if (!recordsError && records) {
          healthRecords = records;
        }
      } catch (healthError) {
        console.log('Could not load health records, continuing without them');
      }
      
      // Get current medications - this is optional data
      let medications: any[] = [];
      try {
        await this.refreshAuthIfNeeded();
        const { data: meds, error: medsError } = await supabase
          .from('medications')
          .select('name, dosage, frequency')
          .eq('pet_id', petId)
          .eq('status', 'active');
        
        if (!medsError && meds) {
          medications = meds;
        }
      } catch (medsError) {
        console.log('Could not load medications, continuing without them');
      }
      
      // Create pet info object with available data
      const petInfo: PetInfo = {
        id: pet.id,
        name: pet.name,
        type: pet.type || 'pet', // Default if missing
        breed: pet.breed || 'unknown breed', // Default if missing
        gender: pet.gender || 'unknown gender', // Default if missing
        weight: pet.weight,
        weightUnit: pet.weight_unit,
        medicalConditions: pet.medical_conditions || [],
        allergies: pet.allergies || [],
        medications: medications?.map(m => `${m.name} (${m.dosage}, ${m.frequency})`) || []
      };
      
      // Calculate age from birth_date if available
      if (pet.birth_date) {
        try {
          const birthDate = new Date(pet.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          
          // Adjust age if birthday hasn't occurred yet this year
          if (
            today.getMonth() < birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          
          petInfo.age = age;
        } catch (dateError) {
          console.log('Could not calculate pet age, continuing without it');
        }
      }
      
      // Add pet context to current session
      if (this.currentSession) {
        this.currentSession.petInfo = petInfo;
        
        // Format pet info for system context message
        const petContextMessage = this.formatPetContext(petInfo, healthRecords || []);
        
        // Add as system message
        this.currentSession.messages.push({
          role: 'system',
          content: petContextMessage
        });
        
        console.log('Pet context loaded successfully');
      }
    } catch (error) {
      console.error('Error in loadPetContext:', error);
      // Continue without pet context
    }
  }
  
  /**
   * Format pet information into a context message for the AI
   */
  private formatPetContext(petInfo: PetInfo, healthRecords?: any[]): string {
    let context = `IMPORTANT PET INFORMATION - USE THIS DATA FOR PERSONALIZED ADVICE:\n\n`;
    context += `Pet Profile: ${petInfo.name} is a ${petInfo.gender} ${petInfo.breed} ${petInfo.type.toLowerCase()}`;
    
    if (petInfo.age !== undefined) {
      context += `, ${petInfo.age} years old`;
    }
    
    if (petInfo.weight !== undefined && petInfo.weightUnit) {
      context += `, weighing ${petInfo.weight} ${petInfo.weightUnit}`;
    }
    
    context += `\n\nYou MUST use this specific information about ${petInfo.name} to personalize your advice. Reference ${petInfo.name} by name in your responses and tailor your recommendations to ${petInfo.name}'s specific characteristics.`;
    
    // Add some breed-specific information if available
    const breedInfo = this.getBreedSpecificInfo(petInfo.type, petInfo.breed);
    if (breedInfo) {
      context += `\n\nBREED-SPECIFIC HEALTH PROFILE: ${breedInfo}`;
    }
    
    if (petInfo.medicalConditions && petInfo.medicalConditions.length > 0) {
      context += `\n\nDIAGNOSED MEDICAL CONDITIONS: ${petInfo.medicalConditions.join(', ')}`;
      context += `\nConsider these conditions when providing advice and mention specific management strategies for these conditions.`;
    }
    
    if (petInfo.allergies && petInfo.allergies.length > 0) {
      context += `\n\nDOCUMENTED ALLERGIES: ${petInfo.allergies.join(', ')}`;
      context += `\nAvoid recommending products or foods containing these allergens and suggest alternatives.`;
    }
    
    if (petInfo.medications && petInfo.medications.length > 0) {
      context += `\n\nCURRENT MEDICATIONS: ${petInfo.medications.join(', ')}`;
      context += `\nConsider potential drug interactions or side effects when giving recommendations.`;
    }
    
    if (healthRecords && healthRecords.length > 0) {
      context += '\n\nRECENT HEALTH HISTORY:';
      healthRecords.forEach(record => {
        context += `\n- ${record.type}: ${record.title}`;
        if (record.diagnosis) context += ` (Diagnosis: ${record.diagnosis})`;
        if (record.symptoms) context += ` (Symptoms: ${record.symptoms})`;
      });
      context += `\nReference this health history when appropriate in your responses.`;
    }
    
    // Add age-specific guidance
    if (petInfo.age !== undefined) {
      context += `\n\nAGE-SPECIFIC HEALTH CONSIDERATIONS: ${this.getAgeSpecificInfo(petInfo.type, petInfo.age)}`;
    }
    
    context += `\n\nYour role is to act as a knowledgeable veterinary professional. Provide detailed, accurate advice tailored to ${petInfo.name}'s specific situation. Include preventative care recommendations, nutrition advice, and behavioral guidance appropriate for ${petInfo.name}'s breed, age, and health status.`;
    
    return context;
  }
  
  /**
   * Get breed-specific information to enhance AI response
   */
  private getBreedSpecificInfo(petType: string, breed: string): string | null {
    // Convert to lowercase for easier comparison
    const type = petType.toLowerCase();
    const breedName = breed.toLowerCase();
    
    // Common dog breeds
    if (type === 'dog') {
      if (breedName.includes('golden retriever')) {
        return 'Golden Retrievers are prone to hip and elbow dysplasia, subvalvular aortic stenosis (heart condition), ' +
          'eye disorders including cataracts and progressive retinal atrophy, hypothyroidism, skin conditions (hot spots, allergies), ' +
          'and cancer (especially hemangiosarcoma and lymphoma). Recommended health screenings include hip/elbow evaluations, ' +
          'cardiac exam, eye exam, and thyroid testing. Their double coat requires regular brushing 2-3 times weekly. ' +
          'Diet should be monitored carefully as they\'re prone to obesity. They need 1-2 hours of daily exercise to maintain physical and mental health.';
      } else if (breedName.includes('labrador')) {
        return 'Labrador Retrievers are predisposed to hip and elbow dysplasia, exercise-induced collapse, progressive retinal atrophy, ' +
          'cataracts, obesity, and ear infections. Older Labs frequently develop arthritis and may suffer from laryngeal paralysis. ' +
          'Recommended health screenings include hip/elbow evaluations, eye exams, and EIC genetic testing. ' +
          'Labs need portion-controlled feeding as they often overeat, leading to obesity. They require at least 1 hour of vigorous exercise daily. ' +
          'Regular ear cleaning is essential to prevent infections due to their drop ears and love of water.';
      } else if (breedName.includes('german shepherd')) {
        return 'German Shepherds commonly develop hip and elbow dysplasia, degenerative myelopathy, exocrine pancreatic insufficiency (EPI), ' +
          'bloat/gastric dilatation-volvulus (GDV), and degenerative disc disease. They may also experience allergies and skin conditions. ' +
          'Recommended health screenings include hip/elbow evaluations, cardiac exams, and degenerative myelopathy DNA testing. ' +
          'Their diet should include joint supplements from an early age. They need both physical exercise (1-2 hours daily) and mental stimulation. ' +
          'Monitoring for early signs of digestive issues is crucial as EPI requires lifelong enzyme supplementation.';
      } else if (breedName.includes('bulldog') || breedName.includes('french bulldog')) {
        return 'Bulldogs are brachycephalic breeds with numerous health concerns including respiratory issues (Brachycephalic Airway Syndrome), ' +
          'skin fold dermatitis, cherry eye, hip dysplasia, and spinal malformations. They often suffer from heat intolerance, allergies, and obesity. ' +
          'Recommended health screenings include cardiac exam, patella evaluation, and tracheal hypoplasia assessment. ' +
          'They require minimal exercise (20-30 minutes of walking daily) and should avoid strenuous activity in hot or humid weather. ' +
          'Their facial wrinkles need regular cleaning and drying to prevent infections. Diet should be carefully managed to prevent obesity which exacerbates breathing difficulties.';
      } else if (breedName.includes('poodle')) {
        return 'Poodles are susceptible to Addison\'s disease, sebaceous adenitis, hip dysplasia, progressive retinal atrophy, epilepsy, ' +
          'and bloat (in Standard Poodles). Toy and Miniature Poodles are prone to patellar luxation and dental issues. ' +
          'Recommended health screenings include hip evaluation, ophthalmologist evaluation, and cardiac exam. ' +
          'Their curly, non-shedding coat requires professional grooming every 4-6 weeks and home brushing several times weekly to prevent matting. ' +
          'They need both physical exercise and mental stimulation daily. Dental care is particularly important for smaller Poodles.';
      } else if (breedName.includes('beagle')) {
        return 'Beagles are prone to obesity, epilepsy, hypothyroidism, cherry eye, disc disease, and ear infections. ' +
          'They can develop a condition called Musladin-Lueke Syndrome (MLS) affecting connective tissues. ' +
          'Recommended health screenings include hip and thyroid evaluations. Their strong sense of smell can lead them to overeat, ' +
          'so portion control is essential. They need at least 1 hour of exercise daily, preferably in secure areas as they can follow scents and ignore recall commands. ' +
          'Regular ear cleaning is necessary to prevent infections due to their long, floppy ears.';
      } else if (breedName.includes('dachshund')) {
        return 'Dachshunds are extremely prone to intervertebral disc disease (IVDD) due to their long spine and short legs. ' +
          'They also commonly develop patellar luxation, progressive retinal atrophy, and dental disease. ' +
          'Obesity significantly increases IVDD risk. Recommended health screenings include eye examinations and patella evaluation. ' +
          'Weight management is crucial to reduce stress on their spine. They should avoid jumping from furniture and using stairs frequently. ' +
          'Ramps and steps can help prevent injury. Despite their small size, they need regular exercise but with care to protect their backs.';
      } else if (breedName.includes('chihuahua')) {
        return 'Chihuahuas are susceptible to dental disease, patellar luxation, heart conditions (patent ductus arteriosus and mitral valve disease), ' +
          'hydrocephalus, and hypoglycemia (especially in puppies). They often have a molera (soft spot on the head) that sometimes remains open throughout life. ' +
          'Recommended health screenings include cardiac and patella evaluations. Their small size makes them prone to injury, ' +
          'and they need protection from larger dogs and rough handling. Dental care is extremely important as they frequently lose teeth early ' +
          'due to overcrowding and poor dental health. Despite their size, they need regular exercise and mental stimulation.';
      }
    }
    
    // Common cat breeds
    if (type === 'cat') {
      if (breedName.includes('persian')) {
        return 'Persian cats are prone to polycystic kidney disease (PKD), progressive retinal atrophy, hypertrophic cardiomyopathy, ' +
          'and breathing difficulties due to their brachycephalic facial structure. They commonly develop excessive tearing and eye discharge requiring daily cleaning. ' +
          'Their long, dense coat needs daily brushing to prevent painful mats and hairballs. ' +
          'Recommended health screenings include PKD genetic testing, cardiac ultrasound, and regular kidney function tests. ' +
          'Their diet should include adequate moisture to support kidney health and prevent urinary issues. ' +
          'They typically have a sedentary lifestyle but still need interactive play sessions for mental stimulation and weight management.';
      } else if (breedName.includes('siamese')) {
        return 'Siamese cats are predisposed to amyloidosis (protein deposits in organs), progressive retinal atrophy, respiratory issues, and various types of cancer. ' +
          'They have a higher risk of dental disease and may develop cross-eyes or kinked tails due to genetic factors. ' +
          'Recommended health screenings include regular dental checks and eye examinations. ' +
          'They are highly intelligent and active, requiring substantial mental and physical stimulation to prevent behavioral issues. ' +
          'Their metabolism is higher than many breeds, often needing more calories per pound than other cats. ' +
          'They typically live 12-20 years and remain playful well into their senior years.';
      } else if (breedName.includes('maine coon')) {
        return 'Maine Coons are susceptible to hypertrophic cardiomyopathy (the most common form of heart disease in cats), hip dysplasia, and spinal muscular atrophy. ' +
          'They may also develop polycystic kidney disease. Recommended health screenings include cardiac ultrasound, hip evaluation, and genetic testing for SMA and PKD. ' +
          'Their large size means they mature slowly, not reaching full size until 3-5 years of age. ' +
          'Their semi-long water-resistant coat requires brushing 2-3 times weekly. ' +
          'They need substantial protein in their diet to maintain their muscular build. ' +
          'Despite their size, they are typically gentle and good with children and other pets.';
      } else if (breedName.includes('bengal')) {
        return 'Bengal cats are prone to hypertrophic cardiomyopathy, progressive retinal atrophy, and pyruvate kinase deficiency (a red blood cell enzyme deficiency). ' +
          'They may also develop flat-chested kitten syndrome and patellar luxation. ' +
          'Recommended health screenings include cardiac ultrasound and PK deficiency genetic testing. ' +
          'Their high energy level requires substantial exercise and mental stimulation, including climbing opportunities and interactive play. ' +
          'They often enjoy water and may play in water dishes or even join their owners in the shower. ' +
          'Their short coat is low-maintenance but benefits from weekly brushing to remove loose hair and distribute skin oils.';
      } else if (breedName.includes('ragdoll')) {
        return 'Ragdolls are predisposed to hypertrophic cardiomyopathy, polycystic kidney disease, and bladder stones. ' +
          'They may also develop calcium oxalate urolithiasis and feline mucopolysaccharidosis. ' +
          'Recommended health screenings include cardiac ultrasound, PKD genetic testing, and regular urinalysis. ' +
          'Their semi-longhaired coat rarely mats but benefits from weekly brushing. ' +
          'Despite their large size, they have gentle temperaments and relatively low activity levels. ' +
          'Their diet should include adequate moisture to support urinary health. ' +
          'They mature slowly, not reaching full size and coat development until 3-4 years of age.';
      } else if (breedName.includes('sphynx')) {
        return 'Sphynx cats, despite lacking fur, require significant grooming as their skin produces oils that would normally be absorbed by fur. ' +
          'They need weekly baths to prevent oil buildup. They are prone to hypertrophic cardiomyopathy, hereditary myopathy, and skin conditions including urticaria pigmentosa. ' +
          'Their lack of fur makes them susceptible to sunburn and cold. They have higher metabolism rates than most cats, requiring more calories per pound. ' +
          'Recommended health screenings include cardiac ultrasound and regular skin examinations. ' +
          'They need warm environments and often seek heat sources, including human bodies for warmth.';
      }
    }
    
    return null;
  }
  
  /**
   * Provide fallback responses when offline or API is unavailable
   * This method is accessible from outside for direct access
   */
  public getFallbackResponse(messages: GeminiChatMessage[]): string {
    // Get the last user message
    const lastUserMessage = messages.findLast(m => m.role === 'user');
    const query = lastUserMessage?.content.toLowerCase() || '';
    
    // Basic offline response patterns
    if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
      return 'Hello! I\'m currently in offline mode. I can only provide basic responses until the network connection is restored.';
    } else if (query.includes('help') || query.includes('what can you do')) {
      return 'I\'m a pet care assistant, but I\'m currently in offline mode. Once the connection is restored, I can help with pet health, nutrition, training, and care advice.';
    } else if (query.includes('dog') && (query.includes('food') || query.includes('eat'))) {
      return 'Dogs need a balanced diet with protein, carbohydrates, fats, vitamins, and minerals. Please consult with your vet for specific dietary recommendations for your dog.';
    } else if (query.includes('cat') && (query.includes('food') || query.includes('eat'))) {
      return 'Cats are obligate carnivores and need a high-protein diet. Commercial cat foods are formulated to meet their nutritional needs. Always provide fresh water.';
    } else if (query.includes('train') || query.includes('training')) {
      return 'Positive reinforcement is the most effective training method for pets. Use treats, praise, and play as rewards for good behavior.';
    } else if (query.includes('health') || query.includes('sick') || query.includes('vet')) {
      return 'If your pet is showing signs of illness, please consult with a veterinarian as soon as possible. I\'m currently in offline mode and cannot provide specific health advice.';
    }
    
    // Default fallback response
    return 'I\'m currently in offline mode due to network connectivity issues. I can only provide limited responses. Please try again when the connection is restored.';
  }
  
  /**
   * Get age-specific information based on pet type and age
   */
  private getAgeSpecificInfo(petType: string, age: number): string {
    const type = petType.toLowerCase();
    
    if (type === 'dog') {
      if (age < 1) {
        return 'Puppies need comprehensive vaccination series (typically at 8, 12, and 16 weeks), regular deworming, ' + 
          'and early socialization during critical developmental periods (4-14 weeks). ' +
          'Their diet should be puppy-specific formula with appropriate calcium:phosphorus ratios to support bone development. ' +
          'Exercise should be moderate and controlled to protect developing joints - the general rule is 5 minutes of exercise per month of age, twice daily. ' +
          'Teething occurs between 3-6 months, requiring appropriate chew toys. Early training using positive reinforcement should begin immediately. ' +
          'Monitor for signs of hypoglycemia in toy breeds. Avoid dog parks and high-traffic areas until vaccination series is complete.';
      } else if (age >= 1 && age <= 3) {
        return 'Young adult dogs should transition to adult food around 12-18 months (earlier for small breeds, later for large/giant breeds). ' +
          'They need regular preventative care including heartworm prevention, flea/tick control, and annual examinations. ' +
          'This is a common age for the emergence of allergies or skin conditions. ' +
          'Exercise requirements are at their peak, typically needing 30-60 minutes of vigorous activity daily plus mental stimulation. ' +
          'Training should continue with focus on impulse control and reinforcement of basic commands. Dental care is crucial - establish daily brushing routines. ' +
          'Consider spay/neuter if not already done, evaluating benefits and risks for the specific breed.';
      } else if (age > 3 && age <= 7) {
        return 'Adult dogs benefit from twice-yearly wellness examinations to detect early signs of disease. ' +
          'Dental cleanings may be necessary every 1-3 years depending on oral health. ' +
          'Watch for early signs of arthritis, especially in predisposed breeds. ' +
          'Maintain consistent exercise routines but adjust intensity based on the individual dog\'s condition. ' +
          'Regular weight monitoring is essential as metabolism begins to slow - adjust portions to prevent obesity ' +
          'which can exacerbate joint issues and lead to metabolic disorders. ' +
          'Consider bloodwork to establish baseline values for future comparison. ' +
          'Some breeds may begin to show breed-specific health concerns during this period.';
      } else if (age > 7) {
        return 'Senior dogs need biannual veterinary checkups with comprehensive bloodwork to monitor organ function. ' +
          'Watch for signs of cognitive dysfunction (confusion, changes in sleep patterns, house soiling). ' +
          'Joint supplements containing glucosamine, chondroitin, and omega-3 fatty acids may help manage arthritis pain. ' +
          'Consider transitioning to senior-specific food formulated for aging metabolism and organ support. ' +
          'Exercise should continue but with modifications - shorter, more frequent walks rather than long sessions. ' +
          'Dental disease becomes more critical - continue home care and professional cleanings as recommended. ' +
          'Monitor for lumps and bumps, changes in appetite, thirst, urination patterns, and weight loss, ' +
          'which can indicate serious conditions requiring prompt veterinary attention.';
      }
    } else if (type === 'cat') {
      if (age < 1) {
        return 'Kittens need a series of FVRCP vaccinations typically at 8, 12, and 16 weeks, plus rabies vaccination. ' +
          'Regular deworming is essential, particularly for roundworms and hookworms. ' +
          'Their diet should be kitten formula with higher protein and calories to support growth. ' +
          'Socialization during 2-7 weeks is critical for developing well-adjusted adult cats. ' +
          'Begin handling paws, ears, and mouth regularly to acclimate to future examinations and grooming. ' +
          'Introduce scratching posts and litter box training immediately. Teething occurs around 3-6 months - provide appropriate toys. ' +
          'Avoid free-feeding to prevent obesity. Consider beginning tooth brushing with kitten-specific toothpaste. ' +
          'Spay/neuter is typically recommended around 5-6 months.';
      } else if (age >= 1 && age <= 3) {
        return 'Young adult cats should transition to adult food around 12 months. ' +
          'They need annual veterinary examinations, dental assessments, and appropriate parasite prevention. ' +
          'This is a high-energy period requiring multiple play sessions daily to prevent behavioral issues. ' +
          'Establish regular grooming routines appropriate for coat type. ' +
          'Monitor weight closely as obesity often begins in this age range when growth slows but feeding remains constant. ' +
          'Provide environmental enrichment including vertical spaces, scratching opportunities, and interactive toys. ' +
          'Watch for early signs of dental disease which affects over 70% of cats by age 3. ' +
          'Establish baseline bloodwork values for future comparison.';
      } else if (age > 3 && age <= 10) {
        return 'Adult cats benefit from annual or biannual wellness examinations. ' +
          'Dental disease prevention becomes crucial - professional cleanings may be necessary. ' +
          'Watch for subtle signs of illness as cats often hide symptoms until disease is advanced. ' +
          'Maintain consistent feeding and exercise routines to prevent obesity. ' +
          'Environmental enrichment should continue throughout adulthood. ' +
          'Monitor for behavioral changes that might indicate stress or illness. ' +
          'Some breeds may begin showing predisposed conditions during this period. ' +
          'Consider screening for common health issues like kidney function, thyroid levels, and diabetes, especially after age 7. ' +
          'Adjust protein levels in diet based on kidney function as cats age.';
      } else if (age > 10) {
        return 'Senior cats need biannual veterinary checkups with comprehensive bloodwork panels and blood pressure monitoring. ' +
          'Watch for common geriatric conditions including chronic kidney disease, hyperthyroidism, diabetes, and arthritis. ' +
          'Adjust diet to support aging organs - often lower phosphorus and moderate protein levels are recommended for kidney health. ' +
          'Provide easier access to resources (litter boxes, food, water) as mobility decreases. ' +
          'Consider joint supplements containing glucosamine and omega-3 fatty acids. ' +
          'Monitor weight closely as both weight loss and gain can indicate health issues. ' +
          'Cognitive dysfunction may appear as confusion, vocalization, or house soiling. ' +
          'Dental disease becomes more critical with age - continue professional care as recommended. ' +
          'Groom more frequently as older cats often groom less effectively.';
      }
    }
    
    return 'Regular veterinary checkups are important at all life stages.';
  }
  
  /**
   * Send a message to the pet assistant and get a response
   */
  async sendMessage(userId: string, message: string): Promise<string | null> {
    try {
      console.log('PetAssistantService: Sending message to AI assistant');
      
      if (!this.currentSession) {
        console.log('No active chat session, creating a new one');
        // Try to create a new session
        try {
          const sessionId = await this.startNewSession(userId);
          if (!sessionId || sessionId.startsWith('temp-')) {
            console.log('Created a temporary session for offline use');
          } else {
            console.log(`Created a new session with ID: ${sessionId}`);
          }
        } catch (sessionError) {
          console.error('Failed to create a new session:', sessionError);
          // Create a temporary session as fallback
          const tempSessionId = 'temp-' + Date.now();
          this.currentSession = {
            id: tempSessionId,
            messages: [{
              role: 'system',
              content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
            }]
          };
        }
        
        // If still no session, create a minimal one
        if (!this.currentSession) {
          const tempSessionId = 'temp-' + Date.now();
          this.currentSession = {
            id: tempSessionId,
            messages: [{
              role: 'system',
              content: `You are an advanced veterinary assistant with extensive knowledge of animal health, care, and behavior. 
Provide detailed, accurate, and actionable advice about pet health, nutrition, training, and wellbeing.
When discussing medical conditions, include symptoms to watch for, potential treatments, and when veterinary care is necessary.
For nutrition questions, offer specific dietary recommendations based on the pet's species, breed, age, and health conditions.
For behavior issues, provide step-by-step training approaches and environmental modifications.
Always consider the specific pet's information in your answers when available.
Only discuss pet-related topics. If asked about non-pet subjects, politely redirect to pet care.
Balance being informative with being practical - give detailed advice a pet owner can actually implement.
When truly serious medical issues are described, still provide information but emphasize the importance of veterinary care.`
            }]
          };
        }
      }
      
      // Add user message to current session
      const userMessage: GeminiChatMessage = {
        role: 'user',
        content: message
      };
      
      // Safely add message to current session
      if (this.currentSession) {
        this.currentSession.messages.push(userMessage);
      }
      
      // Try to save the user message to the database, but don't block on it
      let petInfoContext: string | undefined;
      try {
        console.log('PetAssistantService: Saving user message to database');
        
        // Only save to database if we're not using a temporary offline session
        if (this.currentSession && !this.currentSession.id.startsWith('temp-')) {
          await this.refreshAuthIfNeeded();
          await chatRepository.addMessage(
            this.currentSession.id,
            userMessage.content,
            userMessage.role
          );
        }
        
        console.log('PetAssistantService: User message saved successfully');
      } catch (dbError) {
        console.warn('PetAssistantService: Error saving user message:', dbError);
        // Continue without saving
      }
      
      if (this.currentSession?.petInfo) {
        console.log('PetAssistantService: Adding pet context to message');
        petInfoContext = this.formatPetContext(this.currentSession.petInfo);
      }
      
      // First check network connectivity to determine if we need fallback mode
      let isConnected = false;
      try {
        const netInfo = await NetInfo.fetch();
        isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
        console.log(`PetAssistantService: Network connectivity: ${isConnected ? 'Connected' : 'Disconnected'}`);
      } catch (netError) {
        console.warn('PetAssistantService: Error checking network connectivity:', netError);
        isConnected = false;
      }
      
      // If we're offline, use fallback immediately without further delay
      if (!isConnected) {
        console.log('PetAssistantService: Device is offline, using fallback response');
        // Safely access messages
        const messages = this.currentSession ? this.currentSession.messages : [{
          role: 'user' as const,
          content: message
        }];
        const fallbackResponse = this.getFallbackResponse(messages);
        
        // Add the fallback response to the conversation
        const assistantMessage: GeminiChatMessage = {
          role: 'assistant',
          content: fallbackResponse
        };
        
        // Safely add to messages
        if (this.currentSession) {
          this.currentSession.messages.push(assistantMessage);
        }
        
        return fallbackResponse;
      }
      
      // Check API availability with a short timeout
      let apiAvailable = false;
      try {
        const apiCheckPromise = geminiService.hasApiKey();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5000); // 5 second timeout
        });
        
        apiAvailable = await Promise.race([
          apiCheckPromise,
          timeoutPromise
        ]);
      } catch (apiError) {
        console.warn('PetAssistantService: Error checking API availability:', apiError);
        apiAvailable = false;
      }
      
      // Generate response
      let response: string | null = null;
      let retryCount = 0;
      const MAX_RETRIES = 2;
      
      while (retryCount <= MAX_RETRIES && !response) {
        if (!apiAvailable) {
          console.log('PetAssistantService: API not available, using fallback response');
          const messages = this.currentSession ? this.currentSession.messages : [{
            role: 'user' as const,
            content: message
          }];
          response = this.getFallbackResponse(messages);
          break;
        }
        
        try {
          // Set up a timeout for the entire operation
          // Safely access messages
          const messages = this.currentSession ? this.currentSession.messages : [{
            role: 'user' as const,
            content: message
          }];
          
          const responsePromise = geminiService.generateChatResponse(
            messages,
            petInfoContext
          );
          
          const timeoutPromise = new Promise<[string | null, any]>((resolve) => {
            setTimeout(() => resolve([null, { message: 'Request timed out', code: 'TIMEOUT' }]), 30000); // Increased timeout to 30 seconds
          });
          
          const [geminiResponse, error] = await Promise.race([
            responsePromise,
            timeoutPromise
          ]);
          
          if (error || !geminiResponse) {
            console.warn('PetAssistantService: Error getting AI response:', error);
            
            if ((error as any)?.message === 'NETWORK_ERROR' || (error as any)?.message === 'OFFLINE' || 
                (error as any)?.code === 'TIMEOUT' || retryCount >= MAX_RETRIES) {
              // Fall back to offline mode if the API request fails after retries
              console.log('PetAssistantService: Network error, using fallback response');
              response = this.getFallbackResponse(messages);
            } else {
              // Retry with backoff
              retryCount++;
              console.log(`PetAssistantService: Retrying (${retryCount}/${MAX_RETRIES})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
          } else {
            response = geminiResponse;
          }
        } catch (responseError) {
          console.warn('PetAssistantService: Error generating response:', responseError);
          
          if ((responseError as any)?.message === 'NETWORK_ERROR' || 
              (responseError as any)?.message === 'OFFLINE' || 
              retryCount >= MAX_RETRIES) {
            // Use fallback after retries or for specific network errors
            const messages = this.currentSession ? this.currentSession.messages : [{
              role: 'user' as const,
              content: message
            }];
            response = this.getFallbackResponse(messages);
          } else {
            // Retry with backoff for other errors
            retryCount++;
            console.log(`PetAssistantService: Retrying (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
      }
      
      console.log('PetAssistantService: Final response generated');
      
      if (!response) {
        response = "I'm sorry, I couldn't generate a response at this time. Please try again later.";
      }
      
      // Add assistant response to messages
      const assistantMessage: GeminiChatMessage = {
        role: 'assistant',
        content: response
      };
      
      // Safely add to messages
      if (this.currentSession) {
        this.currentSession.messages.push(assistantMessage);
      }
      
      // Try to save the assistant message, but don't block if it fails
      try {
        // Only save to database if we're not using a temporary offline session
        if (this.currentSession && !this.currentSession.id.startsWith('temp-')) {
          // Check if this exact message already exists in the database
          const existingMessages = await chatRepository.getSessionMessages(this.currentSession.id);
          const messageExists = existingMessages.some(
            msg => msg.role === 'assistant' && msg.content === response
          );
          
          if (!messageExists) {
            await this.refreshAuthIfNeeded();
            await chatRepository.addMessage(
              this.currentSession.id,
              response,
              'assistant'
            );
            console.log('PetAssistantService: Assistant response saved successfully');
          } else {
            console.log('PetAssistantService: Skipping save - assistant message already exists in database');
          }
        }
      } catch (dbError) {
        console.warn('PetAssistantService: Error saving assistant message:', dbError);
        // Continue without saving
      }
      
      // Return the response text so the UI can update accordingly
      return response;
    } catch (error) {
      console.error('PetAssistantService: Error in sendMessage:', error);
      
      // When all else fails, provide a simple fallback response
      try {
        return this.getFallbackResponse(this.currentSession?.messages || [{
          role: 'user' as const,
          content: message
        }]);
      } catch (fallbackError) {
        return "I'm currently experiencing technical difficulties. Please try again later.";
      }
    }
  }
  
  /**
   * Get messages for the current session
   */
  getCurrentSessionMessages(): GeminiChatMessage[] {
    if (!this.currentSession) return [];
    
    // Filter out system messages for display
    return this.currentSession.messages.filter(msg => msg.role !== 'system');
  }
  
  /**
   * Clear the current session
   */
  clearCurrentSession(): void {
    this.currentSession = null;
  }
  
  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const success = await chatRepository.deleteSession(sessionId);
    
    // If deleting current session, clear it
    if (success && this.currentSession?.id === sessionId) {
      this.clearCurrentSession();
    }
    
    return success;
  }
  
  /**
   * Get recent chat sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<any[]> {
    return chatRepository.getUserSessions(userId, limit);
  }
  
  /**
   * Get an existing session or create a new one
   */
  async getOrCreateSession(userId?: string, petId?: string): Promise<any> {
    try {
      await this.refreshAuthIfNeeded();
      
      if (!userId) {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id;
        if (!userId) {
          throw new Error('No user ID available');
        }
      }
      
      // Check for existing sessions
      const sessions = await chatRepository.getUserSessions(userId, 1);
      
      // If there's an existing session, use it
      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        await this.loadSession(sessionId);
        return { id: sessionId };
      }
      
      // Otherwise, create a new session
      const newSessionId = await this.startNewSession(userId, petId);
      
      if (!newSessionId) {
        throw new Error('Failed to create a new session');
      }
      
      return { id: newSessionId };
    } catch (error) {
      console.error('Error getting or creating session:', error);
      throw error;
    }
  }
  
  /**
   * Get messages for a specific session
   */
  async getChatMessages(sessionId: string): Promise<any[]> {
    try {
      // Get all DB messages
      const dbMessages = await chatRepository.getSessionMessages(sessionId);
      
      // If no messages found, return empty array instead of throwing an error
      if (!dbMessages || dbMessages.length === 0) {
        console.log(`No messages found for session: ${sessionId}, returning empty array`);
        return [];
      }
      
      // Filter out system messages and format for display
      return dbMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp
        }));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }
  
  /**
   * Helper method to refresh auth token if needed
   */
  private async refreshAuthIfNeeded(): Promise<void> {
    try {
      // Check if session exists and avoid using lock-conflicting methods
      const { data } = await supabase.auth.getSession();
      
      // If no session or it's about to expire, refresh it
      if (!data.session) {
        console.log('PetAssistantService: No active session, attempting to refresh');
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            console.warn('PetAssistantService: Failed to refresh session:', error);
          }
        } catch (refreshError) {
          console.error('PetAssistantService: Error refreshing session:', refreshError);
        }
        return;
      }
      
      // Check if token will expire in the next 5 minutes
      const tokenExpiry = data.session.expires_at 
        ? new Date(data.session.expires_at * 1000) 
        : null;
      
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (tokenExpiry && tokenExpiry < fiveMinutesFromNow) {
        console.log('PetAssistantService: Token expiring soon, refreshing session');
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn('PetAssistantService: Failed to refresh token:', error);
          }
        } catch (refreshError) {
          console.error('PetAssistantService: Error refreshing token:', refreshError);
        }
      }
    } catch (error) {
      console.error('PetAssistantService: Error in refreshAuthIfNeeded:', error);
    }
  }

  /**
   * Check if the required chat tables exist in the database
   */
  async checkChatTablesExist(): Promise<boolean> {
    try {
      console.log('PetAssistantService: Checking if chat tables exist');
      
      // Create a test query to check if chat_sessions table exists
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .limit(1);
      
      if (error) {
        // Log the exact error to help diagnose
        console.error('PetAssistantService: Error checking chat tables:', error);
        
        // Check for specific error messages that indicate table doesn't exist
        if (error.message && (
            error.message.includes('does not exist') || 
            error.message.includes('relation') ||
            error.message.includes('42P01'))) {
          console.error('PetAssistantService: Chat tables do not exist');
          return false;
        }
        
        // For other errors, still return false as we couldn't verify
        return false;
      }
      
      console.log('PetAssistantService: Chat tables exist');
      return true;
    } catch (error) {
      console.error('PetAssistantService: Unexpected error checking chat tables:', error);
      return false;
    }
  }

  /**
   * Create required chat tables
   */
  async createChatTables(): Promise<{ success: boolean, error?: string }> {
    try {
      console.log('PetAssistantService: Attempting to create chat tables');
      
      // Execute the SQL to create the tables
      const { error } = await supabase.rpc('create_chat_tables');
      
      if (error) {
        console.error('PetAssistantService: Error creating chat tables:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log('PetAssistantService: Chat tables created successfully');
      return { success: true };
    } catch (error: any) {
      console.error('PetAssistantService: Unexpected error creating chat tables:', error);
      return {
        success: false,
        error: error.message || String(error)
      };
    }
  }
}

export const petAssistantService = new PetAssistantService(); 

// Add exported function references
export const checkChatTablesExist = petAssistantService.checkChatTablesExist.bind(petAssistantService);
export const createChatTables = petAssistantService.createChatTables.bind(petAssistantService); 