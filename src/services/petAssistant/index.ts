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
  async initialize(): Promise<boolean> {
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
      const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();
      
      if (error || !pet) {
        console.error('Error loading pet info:', error);
        return;
      }
      
      // Get health records for medical conditions
      const { data: healthRecords } = await supabase
        .from('health_records')
        .select('type, title, symptoms, diagnosis')
        .eq('pet_id', petId)
        .order('date', { ascending: false })
        .limit(5);
      
      // Get current medications
      const { data: medications } = await supabase
        .from('medications')
        .select('name, dosage, frequency')
        .eq('pet_id', petId)
        .eq('status', 'active');
      
      const petInfo: PetInfo = {
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        gender: pet.gender,
        weight: pet.weight,
        weightUnit: pet.weight_unit,
        medicalConditions: pet.medical_conditions || [],
        allergies: pet.allergies || [],
        medications: medications?.map(m => `${m.name} (${m.dosage}, ${m.frequency})`) || []
      };
      
      // Calculate age from birth_date if available
      if (pet.birth_date) {
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
      }
    } catch (error) {
      console.error('Error in loadPetContext:', error);
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
    
    if (petInfo.medicalConditions && petInfo.medicalConditions.length > 0) {
      context += `\nMedical conditions: ${petInfo.medicalConditions.join(', ')}`;
    }
    
    if (petInfo.allergies && petInfo.allergies.length > 0) {
      context += `\nAllergies: ${petInfo.allergies.join(', ')}`;
    }
    
    if (petInfo.medications && petInfo.medications.length > 0) {
      context += `\nCurrent medications: ${petInfo.medications.join(', ')}`;
    }
    
    if (healthRecords && healthRecords.length > 0) {
      context += '\nRecent health issues:';
      healthRecords.forEach(record => {
        context += `\n- ${record.type}: ${record.title}`;
        if (record.diagnosis) context += ` (Diagnosis: ${record.diagnosis})`;
      });
    }
    
    return context;
  }
  
  /**
   * Send a message to the pet assistant and get a response
   */
  async sendMessage(userId: string, message: string): Promise<string | null> {
    try {
      if (!this.currentSession) {
        // Start a new session if none exists
        const sessionId = await this.startNewSession(userId);
        if (!sessionId) {
          throw new Error('Failed to create new session');
        }
      }
      
      // Ensure we have a valid session at this point
      if (!this.currentSession) {
        throw new Error('Failed to initialize chat session');
      }
      
      const userMessage: GeminiChatMessage = {
        role: 'user',
        content: message
      };
      
      // Add user message to current session
      this.currentSession.messages.push(userMessage);
      
      // Save user message to database
      await chatRepository.addMessage(
        this.currentSession.id,
        userMessage.content,
        userMessage.role
      );
      
      // Get pet info for context if available
      let petInfoContext = undefined;
      if (this.currentSession.petInfo) {
        petInfoContext = this.formatPetContext(this.currentSession.petInfo);
      }
      
      // Get response from Gemini
      const [response, error] = await geminiService.generateChatResponse(
        this.currentSession.messages,
        petInfoContext
      );
      
      if (error || !response) {
        console.error('Error getting AI response:', error);
        return 'Sorry, I was unable to generate a response. Please try again.';
      }
      
      // Add assistant response to messages
      const assistantMessage: GeminiChatMessage = {
        role: 'assistant',
        content: response
      };
      
      this.currentSession.messages.push(assistantMessage);
      
      // Save assistant message to database
      await chatRepository.addMessage(
        this.currentSession.id,
        assistantMessage.content,
        assistantMessage.role
      );
      
      return response;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return 'Sorry, an error occurred. Please try again later.';
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
}

export const petAssistantService = new PetAssistantService(); 