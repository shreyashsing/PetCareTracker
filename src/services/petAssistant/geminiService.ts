import axios from 'axios';
import { Platform } from 'react-native';
import { securityService, DataSensitivity } from '../security';
import { handleAPIError, tryCatchRequest } from '../../utils/apiErrorHandler';
import { GEMINI_API_KEY } from '@env';

// Define APIError interface to include status property
interface APIError {
  message: string;
  status?: number;
  [key: string]: any;
}

// API key handling
const GEMINI_API_KEY_STORAGE = 'gemini_api_key';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const MAX_TOKEN_LIMIT = 8192; // Gemini 1.5 Pro supports 8k tokens per request
const SANITIZED_PHRASES = ['hack', 'exploit', 'harmful', 'illegal', 'dangerous'];

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

export class GeminiService {
  private apiKey: string | null = GEMINI_API_KEY || null;
  
  constructor() {
    // No need to load from storage if we're using env variable
    if (!this.apiKey) {
      this.loadApiKey();
    }
  }

  private async loadApiKey(): Promise<void> {
    try {
      // Only load from storage if not already set from env
      if (!this.apiKey) {
        this.apiKey = await securityService.getItem(GEMINI_API_KEY_STORAGE, DataSensitivity.HIGH);
      }
    } catch (error) {
      console.error('Failed to load Gemini API key:', error);
    }
  }

  public async setApiKey(key: string): Promise<void> {
    try {
      await securityService.setItem(GEMINI_API_KEY_STORAGE, key, DataSensitivity.HIGH);
      this.apiKey = key;
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
      throw new Error('Failed to save API key securely');
    }
  }

  public async hasApiKey(): Promise<boolean> {
    // Check if we have the API key from env or storage
    if (this.apiKey) return true;
    
    try {
      const key = await securityService.getItem(GEMINI_API_KEY_STORAGE, DataSensitivity.HIGH);
      return !!key;
    } catch (error) {
      return false;
    }
  }

  // Sanitizes user input to prevent inappropriate content
  private sanitizeInput(text: string): string {
    let sanitized = text;
    SANITIZED_PHRASES.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      sanitized = sanitized.replace(regex, '***');
    });
    return sanitized;
  }

  // Checks if the input might contain inappropriate content
  private isInappropriate(text: string): boolean {
    return SANITIZED_PHRASES.some(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  // Manage context length to fit within token limits
  private manageContext(messages: ChatMessage[]): ChatMessage[] {
    // Rough estimate: 1 token ≈ 4 characters
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `You are a helpful pet care assistant. Use your knowledge to provide accurate, 
helpful information about pet care, health, training, and general pet wellbeing. 
Only answer questions related to pets and pet care. If asked about non-pet topics, 
kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.`
    };
    
    // Always include the system prompt and always keep the latest user message
    let userMessages = [...messages];
    let totalTokens = estimateTokens(systemPrompt.content);
    const latestUserMessage = userMessages[userMessages.length - 1];
    
    // Add tokens for the latest message
    totalTokens += estimateTokens(latestUserMessage.content);
    
    // Filter to fit within token limits
    const filteredMessages = [systemPrompt];
    
    // Work backwards from second-to-last message to preserve conversation flow
    for (let i = userMessages.length - 2; i >= 0; i--) {
      const msg = userMessages[i];
      const msgTokens = estimateTokens(msg.content);
      
      if (totalTokens + msgTokens <= MAX_TOKEN_LIMIT - 500) { // Leave buffer for response
        filteredMessages.unshift(msg);
        totalTokens += msgTokens;
      } else {
        break;
      }
    }
    
    // Add the latest user message at the end
    filteredMessages.push(latestUserMessage);
    
    return filteredMessages;
  }

  // Format messages for Gemini API
  private formatMessagesForGemini(messages: ChatMessage[]): any {
    return {
      contents: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }))
    };
  }

  // Post chat completion request with retry logic
  public async generateChatResponse(
    messages: ChatMessage[], 
    petInfo?: string
  ): Promise<[string | null, APIError | null]> {
    if (!this.apiKey) {
      await this.loadApiKey();
      if (!this.apiKey) {
        return [null, { message: 'API key not configured', status: 401 }];
      }
    }
    
    // Sanitize the user's input
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    
    if (lastMessage.role === 'user') {
      // Check for inappropriate content
      if (this.isInappropriate(lastMessage.content)) {
        return [null, { 
          message: 'Your message contains inappropriate content that cannot be processed', 
          status: 400 
        }];
      }
      
      // Sanitize input
      messages[lastMessageIndex] = {
        ...lastMessage,
        content: this.sanitizeInput(lastMessage.content)
      };
    }
    
    // Add pet-specific context if provided
    if (petInfo) {
      // Insert pet info before the last message
      messages.splice(messages.length - 1, 0, {
        role: 'system',
        content: `Current pet information: ${petInfo}`
      });
    }
    
    // Manage context to fit token limits
    const managedMessages = this.manageContext(messages);
    const formattedMessages = this.formatMessagesForGemini(managedMessages);
    
    // Configure API call with model parameters
    const modelConfig = {
      model: 'models/gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };
    
    return tryCatchRequest<string>(async () => {
      let lastError = null;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const url = `${GEMINI_BASE_URL}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`;
          const response = await axios.post<GeminiResponse>(
            url,
            {
              ...modelConfig,
              ...formattedMessages
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey,
                'User-Agent': `PetCareTracker/${Platform.OS}`
              },
              timeout: 30000, // 30 seconds timeout
            }
          );
          
          if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text;
          } else {
            throw new Error('Invalid response format from Gemini API');
          }
        } catch (error: any) {
          lastError = error;
          
          // Check if the error is retriable
          const status = error.response?.status;
          const isRateLimitError = status === 429;
          const isServerError = status >= 500;
          const isNetworkError = !status && error.code === 'ECONNABORTED';
          
          if (isRateLimitError || isServerError || isNetworkError) {
            // Exponential backoff for retries
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Non-retriable error, break out of retry loop
          break;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('Failed to generate response after multiple attempts');
    });
  }
}

// Export singleton instance
export const geminiService = new GeminiService(); 