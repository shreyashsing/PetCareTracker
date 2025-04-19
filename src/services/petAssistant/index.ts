import { geminiService, ChatMessage as GeminiChatMessage } from './geminiService';
import { chatRepository } from './chatRepository';
import { securityService } from '../security';
import { supabase } from '../supabase';
import { GEMINI_API_KEY } from '@env';
import { createChatTables } from '../db';

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
   * Initialize the chat service and ensure API key is set
   */
  async initialize(userId?: string): Promise<boolean> {
    try {
      // First, try to ensure the chat tables exist
      const tablesCreated = await createChatTables();
      if (!tablesCreated) {
        console.error('Failed to create chat tables. The Pet Assistant cannot work without them.');
        return false;
      }
      
      // If we have the API key in env, set it automatically
      if (GEMINI_API_KEY) {
        try {
          await this.setApiKey(GEMINI_API_KEY);
          return true;
        } catch (error) {
          console.error('Error setting API key from environment:', error);
        }
      }
      
      // Otherwise fall back to checking if it's already stored
      return geminiService.hasApiKey();
    } catch (error) {
      console.error('Error initializing Pet Assistant:', error);
      return false;
    }
  }
  
  /**
   * Set the Gemini API key
   */
  async setApiKey(key: string): Promise<void> {
    await geminiService.setApiKey(key);
  }
  
  /**
   * Check if an API key is set and valid
   */
  async hasApiKey(): Promise<boolean> {
    return geminiService.hasApiKey();
  }
  
  /**
   * Start a new chat session
   */
  async startNewSession(userId: string, petId?: string): Promise<string | null> {
    try {
      // Create new session in DB
      const sessionId = await chatRepository.createSession(userId, petId);
      
      if (!sessionId) {
        throw new Error('Failed to create chat session');
      }
      
      // Initialize messages array with system message
      this.currentSession = {
        id: sessionId,
        messages: [
          {
            role: 'system',
            content: `You are a helpful pet care assistant. Use your knowledge to provide accurate, 
helpful information about pet care, health, training, and general pet wellbeing. 
Only answer questions related to pets and pet care. If asked about non-pet topics, 
kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.`
          }
        ]
      };
      
      // If pet ID is provided, fetch pet info to provide context
      if (petId) {
        await this.loadPetContext(petId);
      }
      
      return sessionId;
    } catch (error) {
      console.error('Error starting new session:', error);
      return null;
    }
  }
  
  /**
   * Load a previous chat session
   */
  async loadSession(sessionId: string): Promise<boolean> {
    try {
      // Get all messages for this session
      const messages = await chatRepository.getSessionMessages(sessionId);
      
      if (!messages || messages.length === 0) {
        console.error('No messages found for session:', sessionId);
        return false;
      }
      
      // Convert DB messages to Gemini format
      const geminiMessages: GeminiChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Set current session
      this.currentSession = {
        id: sessionId,
        messages: geminiMessages
      };
      
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
    let context = `Pet information: ${petInfo.name} is a ${petInfo.gender} ${petInfo.breed} ${petInfo.type.toLowerCase()}`;
    
    if (petInfo.age !== undefined) {
      context += `, ${petInfo.age} years old`;
    }
    
    if (petInfo.weight !== undefined && petInfo.weightUnit) {
      context += `, weighing ${petInfo.weight} ${petInfo.weightUnit}`;
    }
    
    // Add some breed-specific information if available
    const breedInfo = this.getBreedSpecificInfo(petInfo.type, petInfo.breed);
    if (breedInfo) {
      context += `\n\nBreed characteristics: ${breedInfo}`;
    }
    
    if (petInfo.medicalConditions && petInfo.medicalConditions.length > 0) {
      context += `\n\nMedical conditions: ${petInfo.medicalConditions.join(', ')}`;
    }
    
    if (petInfo.allergies && petInfo.allergies.length > 0) {
      context += `\nAllergies: ${petInfo.allergies.join(', ')}`;
    }
    
    if (petInfo.medications && petInfo.medications.length > 0) {
      context += `\nCurrent medications: ${petInfo.medications.join(', ')}`;
    }
    
    if (healthRecords && healthRecords.length > 0) {
      context += '\n\nRecent health issues:';
      healthRecords.forEach(record => {
        context += `\n- ${record.type}: ${record.title}`;
        if (record.diagnosis) context += ` (Diagnosis: ${record.diagnosis})`;
      });
    }
    
    // Add age-specific guidance
    if (petInfo.age !== undefined) {
      context += `\n\nAge-specific considerations: ${this.getAgeSpecificInfo(petInfo.type, petInfo.age)}`;
    }
    
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
        return 'Golden Retrievers are known for their friendly temperament, intelligence, and trainability. They typically need regular exercise and are prone to certain health issues like hip dysplasia and skin conditions.';
      } else if (breedName.includes('labrador')) {
        return 'Labrador Retrievers are energetic, friendly, and excellent family dogs. They need lots of exercise and are prone to obesity, hip/elbow dysplasia, and eye conditions.';
      } else if (breedName.includes('german shepherd')) {
        return 'German Shepherds are intelligent, loyal working dogs with high energy needs. They are prone to hip/elbow dysplasia, degenerative myelopathy, and digestive issues.';
      } else if (breedName.includes('bulldog') || breedName.includes('french bulldog')) {
        return 'Bulldogs are brachycephalic breeds with breathing challenges, especially in hot weather. They need moderate exercise, are prone to skin issues, and require special attention to weight management.';
      } else if (breedName.includes('poodle')) {
        return 'Poodles are highly intelligent, hypoallergenic dogs that require regular grooming. They are generally healthy but can be prone to hip dysplasia, eye disorders, and skin conditions.';
      }
    }
    
    // Common cat breeds
    if (type === 'cat') {
      if (breedName.includes('persian')) {
        return 'Persian cats have long coats requiring daily grooming, are typically quiet and sweet-natured. They are prone to breathing issues, eye conditions, and kidney disease.';
      } else if (breedName.includes('siamese')) {
        return 'Siamese cats are vocal, intelligent, and social. They typically live longer than many breeds but are prone to respiratory issues, heart problems, and certain cancers.';
      } else if (breedName.includes('maine coon')) {
        return 'Maine Coons are large, friendly cats with thick water-resistant coats. They are prone to hip dysplasia, hypertrophic cardiomyopathy, and spinal muscular atrophy.';
      } else if (breedName.includes('bengal')) {
        return 'Bengal cats are energetic, playful, and require plenty of stimulation. They can be prone to heart disease, eye issues, and joint problems.';
      } else if (breedName.includes('ragdoll')) {
        return 'Ragdolls are docile, affectionate cats known for going limp when held. They can be prone to hypertrophic cardiomyopathy, bladder stones, and kidney issues.';
      }
    }
    
    return null;
  }
  
  /**
   * Get age-specific information based on pet type and age
   */
  private getAgeSpecificInfo(petType: string, age: number): string {
    const type = petType.toLowerCase();
    
    if (type === 'dog') {
      if (age < 1) {
        return 'Puppies need frequent feeding, vaccinations, socialization, and basic training. Monitor for signs of parasites and provide appropriate chew toys for teething.';
      } else if (age >= 1 && age <= 3) {
        return 'Young adult dogs need consistent training, regular exercise, and preventative healthcare. Establish good routines now for lifelong health.';
      } else if (age > 3 && age <= 7) {
        return 'Adult dogs need regular exercise, dental care, and annual health checkups. Monitor weight to prevent obesity.';
      } else if (age > 7) {
        return 'Senior dogs may need more frequent health checkups, joint support, special diets, and accommodation for decreasing mobility or sensory changes.';
      }
    } else if (type === 'cat') {
      if (age < 1) {
        return 'Kittens need frequent feeding, vaccinations, litterbox training, and socialization. Provide appropriate scratching posts and toys.';
      } else if (age >= 1 && age <= 3) {
        return 'Young adult cats need consistent routine, environmental enrichment, and preventative healthcare. Monitor dental health and weight.';
      } else if (age > 3 && age <= 10) {
        return 'Adult cats need regular checkups, dental care, and environmental enrichment. Watch for changes in behavior or appetite that might indicate health issues.';
      } else if (age > 10) {
        return 'Senior cats may need more frequent health monitoring, specialized diets, and accommodations for joint health or sensory changes.';
      }
    }
    
    return 'Regular veterinary checkups are important at all life stages.';
  }
  
  /**
   * Send a message to the pet assistant and get a response
   */
  async sendMessage(userId: string, message: string): Promise<string | null> {
    try {
      console.log('PetAssistantService: sendMessage called with userId:', userId);
      
      if (!userId) {
        console.error('PetAssistantService: No userId provided to sendMessage');
        return 'Error: User ID is required to send messages';
      }
      
      if (!this.currentSession) {
        console.log('PetAssistantService: No current session, creating a new one...');
        // Start a new session if none exists
        const sessionId = await this.startNewSession(userId);
        if (!sessionId) {
          console.error('PetAssistantService: Failed to create new session');
          return 'Error: Failed to create a new chat session. Please try again.';
        }
        console.log('PetAssistantService: New session created with ID:', sessionId);
      }
      
      // Ensure we have a valid session at this point
      if (!this.currentSession) {
        console.error('PetAssistantService: Still no current session after attempt to create one');
        return 'Error: Failed to initialize chat session. Please try again.';
      }
      
      console.log('PetAssistantService: Using session ID:', this.currentSession.id);
      
      const userMessage: GeminiChatMessage = {
        role: 'user',
        content: message
      };
      
      // Add user message to current session
      this.currentSession.messages.push(userMessage);
      
      // Save user message to database
      console.log('PetAssistantService: Saving user message to database...');
      try {
        await chatRepository.addMessage(
          this.currentSession.id,
          userMessage.content,
          userMessage.role
        );
        console.log('PetAssistantService: User message saved successfully');
      } catch (dbError) {
        console.error('PetAssistantService: Error saving user message:', dbError);
        // Don't throw here - we'll still try to get an AI response
      }
      
      // Get pet info for context if available
      let petInfoContext = undefined;
      if (this.currentSession.petInfo) {
        console.log('PetAssistantService: Adding pet context to message');
        petInfoContext = this.formatPetContext(this.currentSession.petInfo);
      }
      
      // Check for API key before proceeding
      const hasApiKey = await geminiService.hasApiKey();
      console.log('PetAssistantService: API key available:', hasApiKey);
      
      if (!hasApiKey) {
        console.error('PetAssistantService: Cannot generate response - no API key available');
        return 'I cannot provide assistance at this time. Please configure a Gemini API key in Settings.';
      }
      
      // Get response from Gemini
      console.log('PetAssistantService: Generating response from Gemini...');
      const [response, error] = await geminiService.generateChatResponse(
        this.currentSession.messages,
        petInfoContext
      );
      
      if (error || !response) {
        console.error('PetAssistantService: Error getting AI response:', error);
        return 'Sorry, I was unable to generate a response. Please try again.';
      }
      
      console.log('PetAssistantService: Response received from Gemini');
      
      // Add assistant response to messages
      const assistantMessage: GeminiChatMessage = {
        role: 'assistant',
        content: response
      };
      
      this.currentSession.messages.push(assistantMessage);
      
      // Save assistant message to database
      console.log('PetAssistantService: Saving assistant response to database');
      try {
        await chatRepository.addMessage(
          this.currentSession.id,
          assistantMessage.content,
          assistantMessage.role
        );
        console.log('PetAssistantService: Assistant message saved successfully');
      } catch (dbError) {
        console.error('PetAssistantService: Error saving assistant message:', dbError);
        // Still return the response even if we fail to save it
      }
      
      // Return the response text so the UI can update accordingly
      return response;
    } catch (error) {
      console.error('PetAssistantService: Error in sendMessage:', error);
      // Instead of re-throwing, return an error message that can be displayed
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`;
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
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session or it's about to expire, refresh it
      if (!session) {
        console.log('PetAssistantService: No active session, attempting to refresh');
        await supabase.auth.refreshSession();
        return;
      }
      
      // Check if token will expire in the next 5 minutes
      const tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (tokenExpiry && tokenExpiry < fiveMinutesFromNow) {
        console.log('PetAssistantService: Token expiring soon, refreshing session');
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('PetAssistantService: Error refreshing auth:', error);
    }
  }
}

export const petAssistantService = new PetAssistantService(); 