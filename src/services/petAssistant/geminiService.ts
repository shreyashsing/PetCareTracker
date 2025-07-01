import axios from 'axios';
import { Platform } from 'react-native';
import { handleAPIError, tryCatchRequest } from '../../utils/apiErrorHandler';
import { supabase } from '../supabase';
import apiClient from '../api';
import { v4 as uuidv4 } from 'uuid';
import { geminiApi } from '../api/geminiApi';
import { API_URL } from '../../config/network';

// Type for API errors
export interface APIError {
  message: string;
  code?: string;
}

// Enhanced pet-specific prompt for more specialized knowledge with proper formatting
const PET_CARE_SYSTEM_PROMPT = `You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, training, and behavior.

CRITICAL FORMATTING REQUIREMENTS:
- Do NOT use markdown formatting like **bold** or *italic*
- Write in clear, well-structured paragraphs
- Use bullet points for lists (start with • or -)
- Use numbered lists for step-by-step instructions (1. 2. 3.)
- Separate main topics with line breaks
- Write section headings as clear sentences followed by a colon
- Keep responses organized and easy to read

Your expertise includes:
• Pet health: common illnesses, preventative care, emergency symptoms, medication information
• Nutrition: dietary needs for different species/breeds, food allergies, weight management
• Training: positive reinforcement techniques, behavior modification, age-appropriate training
• Care routines: grooming, exercise requirements, environmental enrichment
• Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish

When giving advice:
• Prioritize animal welfare and evidence-based information
• Recognize serious health issues that require veterinary attention
• Provide practical, actionable advice for pet owners
• Consider the pet's age, breed, and health condition when relevant
• Be clear about the limitations of remote advice
• Structure responses with clear sections and bullet points
• Provide detailed explanations that are easy to follow

Only answer questions related to pets and pet care. If asked about non-pet topics, kindly redirect the conversation to pet-related subjects. Provide comprehensive yet well-organized responses.`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    safetyRatings: any[];
  }[];
}

// Define a proper interface for the proxy response
interface ProxyResponse {
  response: GeminiResponse;
}

// Define a proper interface for the health check response
interface HealthCheckResponse {
  success: boolean;
  message: string;
  apiConfigured: boolean;
}

export class GeminiService {
  constructor() {
    // No need to load API keys anymore, they're stored on the server
  }

  // API key handling methods are no longer needed as keys are stored server-side
  public async hasApiKey(): Promise<boolean> {
    console.log('GeminiService: Checking API availability...');
    // Check if the API is available and configured
    return this.checkApiAvailability();
  }

  // For backward compatibility, maintain setApiKey method that does nothing
  public async setApiKey(key: string): Promise<void> {
    console.log('GeminiService: API keys are now stored securely on the server');
    // No need to store API keys client-side anymore
    return;
  }

  // Manage context length to fit within token limits
  private manageContext(messages: ChatMessage[]): ChatMessage[] {
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    const MAX_TOKEN_LIMIT = 8192; // Gemini 1.5 Pro supports 8k tokens per request
    
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    let systemPrompt: ChatMessage;
    if (systemMessages.length === 0) {
      systemPrompt = {
        role: 'system',
        content: PET_CARE_SYSTEM_PROMPT
      };
    } else {
      const combinedContent = systemMessages.map(msg => msg.content).join('\n\n');
      const fullContent = combinedContent.includes(PET_CARE_SYSTEM_PROMPT) 
        ? combinedContent 
        : `${PET_CARE_SYSTEM_PROMPT}\n\n${combinedContent}`;
      
      systemPrompt = {
        role: 'system',
        content: fullContent
      };
    }
    
    let totalTokens = estimateTokens(systemPrompt.content);
    
    const latestUserMessage = nonSystemMessages.length > 0 
      ? nonSystemMessages[nonSystemMessages.length - 1] 
      : null;
    
    if (latestUserMessage) {
      totalTokens += estimateTokens(latestUserMessage.content);
    }
    
    const filteredMessages = [systemPrompt];
    
    if (nonSystemMessages.length > 1) {
      for (let i = nonSystemMessages.length - 2; i >= 0; i--) {
        const msg = nonSystemMessages[i];
        const msgTokens = estimateTokens(msg.content);
        
        if (totalTokens + msgTokens <= MAX_TOKEN_LIMIT - 500) {
          filteredMessages.push(msg);
          totalTokens += msgTokens;
        } else {
          break;
        }
      }
    }
    
    if (latestUserMessage) {
      filteredMessages.push(latestUserMessage);
    }
    
    return filteredMessages;
  }

  // Post chat completion request through the secure backend proxy
  public async generateChatResponse(
    messages: ChatMessage[],
    petInfo?: string
  ): Promise<[string | null, APIError | null]> {
    try {
      // Add pet info to the context if provided
      if (petInfo) {
        messages.push({
          role: 'system',
          content: `Information about the pet: ${petInfo}`
        });
      }
      
      // Manage context length
      const managedMessages = this.manageContext(messages);
      console.log(`GeminiService: Managed ${messages.length} messages down to ${managedMessages.length} messages`);
      
      // Try to use the secure API
      try {
        console.log('GeminiService: Calling secure API proxy for chat completion');
        const response = await geminiApi.generateChatResponse(managedMessages);
        if (response) {
          return [response, null];
        } else {
          throw new Error('Empty response from API');
        }
      } catch (error: any) {
        console.warn('Error calling secure API proxy:', error);
        
        if (error.message === 'NETWORK_ERROR' || error.message === 'OFFLINE') {
          // If we're offline, use the fallback
          console.log('GeminiService: Falling back to offline response');
          const fallbackResponse = this.getFallbackResponse(managedMessages);
          return [fallbackResponse, null];
        }
        
        throw error;  // Re-throw for the outer catch
      }
    } catch (error: any) {
      console.error('GeminiService: Error generating chat response:', error);
      return [null, { message: error.message || 'Unknown error', code: 'GENERATION_ERROR' }];
    }
  }
  
  // Provide fallback responses when offline or API is unavailable
  public getFallbackResponse(messages: ChatMessage[]): string {
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

  // Add a method to check if the API is available using the public health check
  public async checkApiAvailability(): Promise<boolean> {
    try {
      console.log('GeminiService: Checking if backend API is available...');
      
      // Get the API base URL from central config
      const API_BASE_URL = API_URL;
      
      console.log('GeminiService: Using API URL:', API_BASE_URL);
      
      // Try multiple endpoints since we're not sure which one is correct
      const endpointsToTry = [
        'health-check',
        'chat-health-check'
      ];
      
      // Try each endpoint with the configured API URL
      for (const endpoint of endpointsToTry) {
        try {
          console.log(`GeminiService: Trying endpoint: ${API_BASE_URL}/${endpoint}`);
          
          // Call the health-check endpoint with a timeout
          const response = await axios.get(`${API_BASE_URL}/${endpoint}`, {
            timeout: 5000  // 5 second timeout
          });
          
          if (response.status === 200 && response.data) {
            console.log(`GeminiService: API health check response from ${endpoint}:`, response.data);
            
            // Check if the response indicates the API is available
            if (response.data.success) {
              console.log('GeminiService: API is available and configured');
              return true;
            }
          }
        } catch (endpointError: any) {
          console.log(`GeminiService: Endpoint ${endpoint} failed:`, endpointError.message);
          // Continue to next endpoint
        }
      }
      
      // Try the production URL directly as a fallback
      const productionUrl = 'https://darling-empanada-164b33.netlify.app/.netlify/functions';
      console.log('GeminiService: Trying production URL directly:', productionUrl);
      
      for (const endpoint of endpointsToTry) {
        try {
          console.log(`GeminiService: Trying production endpoint: ${productionUrl}/${endpoint}`);
          
          // Call the health-check endpoint with a timeout
          const response = await axios.get(`${productionUrl}/${endpoint}`, {
            timeout: 5000  // 5 second timeout
          });
          
          if (response.status === 200 && response.data) {
            console.log(`GeminiService: Production API health check response from ${endpoint}:`, response.data);
            
            // Check if the response indicates the API is available
            if (response.data.success) {
              console.log('GeminiService: Production API is available and configured');
              return true;
            }
          }
        } catch (endpointError: any) {
          console.log(`GeminiService: Production endpoint ${endpoint} failed:`, endpointError.message);
          // Continue to next endpoint
        }
      }
      
      console.log('GeminiService: None of the health check endpoints responded successfully');
      return false;
    } catch (error) {
      console.error('GeminiService: Error checking API availability:', error);
      return false;
    }
  }
}