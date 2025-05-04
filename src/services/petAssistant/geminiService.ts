import axios from 'axios';
import { Platform } from 'react-native';
import { handleAPIError, tryCatchRequest } from '../../utils/apiErrorHandler';
import { supabase } from '../supabase';
import apiClient from '../api';

// Define APIError interface to include status property
interface APIError {
  message: string;
  status?: number;
  [key: string]: any;
}

// Enhanced pet-specific prompt for more specialized knowledge
const PET_CARE_SYSTEM_PROMPT = `You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, training, and behavior. 

Your expertise includes:
- Pet health: common illnesses, preventative care, emergency symptoms, medication information
- Nutrition: dietary needs for different species/breeds, food allergies, weight management
- Training: positive reinforcement techniques, behavior modification, age-appropriate training
- Care routines: grooming, exercise requirements, environmental enrichment
- Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish

When giving advice:
- Prioritize animal welfare and evidence-based information
- Recognize serious health issues that require veterinary attention
- Provide practical, actionable advice for pet owners
- Consider the pet's age, breed, and health condition when relevant
- Be clear about the limitations of remote advice

Only answer questions related to pets and pet care. If asked about non-pet topics, kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.`;

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
    // Check if the API is available and configured
    return this.checkApiAvailability();
  }

  // For backward compatibility, maintain setApiKey method that does nothing
  public async setApiKey(key: string): Promise<void> {
    console.log('GeminiService: API keys are now stored securely on the server');
    // No need to store API keys client-side anymore
    return;
  }

  // Sanitizes user input to prevent inappropriate content
  private sanitizeInput(text: string): string {
    const SANITIZED_PHRASES = ['hack', 'exploit', 'harmful', 'illegal', 'dangerous'];
    let sanitized = text;
    SANITIZED_PHRASES.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      sanitized = sanitized.replace(regex, '***');
    });
    return sanitized;
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

  // Format messages for Gemini API
  private formatMessagesForGemini(messages: ChatMessage[]): any {
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    let combinedSystemContent = '';
    if (systemMessages.length > 0) {
      combinedSystemContent = systemMessages.map(msg => msg.content).join('\n\n');
    }
    
    const contents = [];
    
    if (combinedSystemContent) {
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTIONS]:\n${combinedSystemContent}` }]
      });
      
      contents.push({
        role: 'model',
        parts: [{ text: "I'll follow these instructions for our conversation." }]
      });
    }
    
    nonSystemMessages.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });
    
    return { contents };
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
      
      // Sanitize user inputs (last user message)
      const lastUserMessage = messages.findLast(m => m.role === 'user');
      if (lastUserMessage) {
        lastUserMessage.content = this.sanitizeInput(lastUserMessage.content);
      }
      
      // Verify session and authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return [null, { message: 'User not authenticated', status: 401 }];
      }
      
      // Manage context to avoid token limit issues
      const contextMessages = this.manageContext(messages);
      
      // Format messages for the API
      const formattedData = this.formatMessagesForGemini(contextMessages);
      
      // Prepare safety settings and generation config
      const requestData = {
        ...formattedData,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          topP: 0.95,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };
      
      // Use our secure backend proxy instead of directly calling Gemini API
      const response = await apiClient.request<ProxyResponse>('chat/proxy-gemini', {
        body: requestData
      });
      
      if (!response.success || !response.data) {
        return [null, { 
          message: response.error || 'Failed to get response from server', 
          status: 500 
        }];
      }
      
      // Extract the response text
      const geminiResponse = response.data.response;
      const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        return [null, { 
          message: 'No valid response from API', 
          status: 500 
        }];
      }
      
      return [responseText, null];
    } catch (error) {
      console.error('Error generating chat response:', error);
      return [null, { 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }];
    }
  }

  // Add a method to check if the API is available using the public health check
  public async checkApiAvailability(): Promise<boolean> {
    try {
      // Get the API base URL from the apiClient
      const API_BASE_URL = (apiClient as any).getApiBaseUrl?.() || 
        (__DEV__ 
          ? 'http://localhost:8888/.netlify/functions'
          : 'https://pet-care-tracker.netlify.app/.netlify/functions');
        
      // Call the public health check endpoint directly (no auth required)
      const response = await axios.get<HealthCheckResponse>(`${API_BASE_URL}/health`);
      
      // Return true if the API is available and configured
      return response.data.success && response.data.apiConfigured;
    } catch (error) {
      console.error('Error checking API availability:', error);
      return false;
    }
  }
} 