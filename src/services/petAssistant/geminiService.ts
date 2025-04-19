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
      console.log('GeminiService: Loading API key from secure storage...');
      // Only load from storage if not already set from env
      if (!this.apiKey) {
        this.apiKey = await securityService.getItem(GEMINI_API_KEY_STORAGE, DataSensitivity.HIGH);
        console.log('GeminiService: API key from storage:', this.apiKey ? 'Found' : 'Not found');
      } else {
        console.log('GeminiService: Using API key from environment variables');
      }
    } catch (error) {
      console.error('GeminiService: Failed to load Gemini API key:', error);
    }
  }

  public async setApiKey(key: string): Promise<void> {
    try {
      console.log('GeminiService: Saving API key to secure storage...');
      await securityService.setItem(GEMINI_API_KEY_STORAGE, key, DataSensitivity.HIGH);
      this.apiKey = key;
      console.log('GeminiService: API key saved successfully');
    } catch (error) {
      console.error('GeminiService: Failed to save Gemini API key:', error);
      throw new Error('Failed to save API key securely');
    }
  }

  public async hasApiKey(): Promise<boolean> {
    console.log('GeminiService: Checking for API key...');
    // Check if we have the API key from env or storage
    if (this.apiKey) {
      console.log('GeminiService: API key already loaded in memory');
      return true;
    }
    
    try {
      console.log('GeminiService: Trying to load API key from secure storage...');
      const key = await securityService.getItem(GEMINI_API_KEY_STORAGE, DataSensitivity.HIGH);
      const hasKey = !!key;
      console.log('GeminiService: API key in storage:', hasKey ? 'Found' : 'Not found');
      
      if (hasKey) {
        // If found in storage, keep it in memory for next time
        this.apiKey = key;
      }
      
      return hasKey;
    } catch (error) {
      console.error('GeminiService: Error checking for API key:', error);
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
    
    // Extract system messages and user/assistant messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // Create or use existing system prompt
    let systemPrompt: ChatMessage;
    if (systemMessages.length === 0) {
      // No system message, use our default
      systemPrompt = {
        role: 'system',
        content: PET_CARE_SYSTEM_PROMPT
      };
    } else {
      // Combine existing system messages
      const combinedContent = systemMessages.map(msg => msg.content).join('\n\n');
      // Append our default prompt if it's not already included
      const fullContent = combinedContent.includes(PET_CARE_SYSTEM_PROMPT) 
        ? combinedContent 
        : `${PET_CARE_SYSTEM_PROMPT}\n\n${combinedContent}`;
      
      systemPrompt = {
        role: 'system',
        content: fullContent
      };
    }
    
    // Calculate tokens for system prompt
    let totalTokens = estimateTokens(systemPrompt.content);
    
    // Always keep the latest user message
    const latestUserMessage = nonSystemMessages.length > 0 
      ? nonSystemMessages[nonSystemMessages.length - 1] 
      : null;
    
    // Add tokens for the latest message if it exists
    if (latestUserMessage) {
      totalTokens += estimateTokens(latestUserMessage.content);
    }
    
    // Start with the system prompt
    const filteredMessages = [systemPrompt];
    
    // Work backwards from second-to-last non-system message to preserve conversation flow
    if (nonSystemMessages.length > 1) {
      for (let i = nonSystemMessages.length - 2; i >= 0; i--) {
        const msg = nonSystemMessages[i];
        const msgTokens = estimateTokens(msg.content);
        
        if (totalTokens + msgTokens <= MAX_TOKEN_LIMIT - 500) { // Leave buffer for response
          filteredMessages.push(msg);
          totalTokens += msgTokens;
        } else {
          break;
        }
      }
    }
    
    // Add the latest user message at the end if it exists
    if (latestUserMessage) {
      filteredMessages.push(latestUserMessage);
    }
    
    return filteredMessages;
  }

  // Format messages for Gemini API
  private formatMessagesForGemini(messages: ChatMessage[]): any {
    // Extract system messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // Combine all system messages into one if there are multiple
    let combinedSystemContent = '';
    if (systemMessages.length > 0) {
      combinedSystemContent = systemMessages.map(msg => msg.content).join('\n\n');
    }
    
    // Format the contents array for the API request
    const contents = [];
    
    // Add the combined system message as a user message if it exists
    // (Gemini doesn't support system role, so we'll use user role instead)
    if (combinedSystemContent) {
      // Prepend [SYSTEM INSTRUCTIONS]: to clearly mark this as system content
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTIONS]:\n${combinedSystemContent}` }]
      });
      
      // Add a dummy model response to maintain the conversation flow
      contents.push({
        role: 'model',
        parts: [{ text: "I'll follow these instructions for our conversation." }]
      });
    }
    
    // Add the rest of the messages
    nonSystemMessages.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });
    
    return { contents };
  }

  // Post chat completion request with retry logic
  public async generateChatResponse(
    messages: ChatMessage[], 
    petInfo?: string
  ): Promise<[string | null, APIError | null]> {
    console.log('GeminiService: generateChatResponse called with', messages.length, 'messages');
    
    if (!this.apiKey) {
      console.log('GeminiService: No API key in memory, attempting to load...');
      await this.loadApiKey();
      if (!this.apiKey) {
        console.error('GeminiService: API key not configured');
        return [null, { message: 'API key not configured', status: 401 }];
      }
    }
    
    // Sanitize the user's input
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    
    if (lastMessage.role === 'user') {
      console.log('GeminiService: Sanitizing user input...');
      // Check for inappropriate content
      if (this.isInappropriate(lastMessage.content)) {
        console.warn('GeminiService: Inappropriate content detected in user message');
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
    
    // Create a copy of messages array to avoid modifying the original
    let processedMessages = [...messages];
    
    // Handle pet info by enhancing the system prompt rather than adding a new system message
    if (petInfo) {
      console.log('GeminiService: Adding pet context to system message');
      
      // Find system message or create one
      const systemIndex = processedMessages.findIndex(msg => msg.role === 'system');
      const petContext = `Current pet information: ${petInfo}`;
      
      if (systemIndex >= 0) {
        // Append to existing system message
        processedMessages[systemIndex] = {
          ...processedMessages[systemIndex],
          content: `${processedMessages[systemIndex].content}\n\n${petContext}`
        };
      } else {
        // Create new system message with default prompt and pet info
        processedMessages.unshift({
          role: 'system',
          content: `${PET_CARE_SYSTEM_PROMPT}\n\n${petContext}`
        });
      }
    }
    
    // Manage context to fit token limits
    console.log('GeminiService: Managing context to fit token limits...');
    const managedMessages = this.manageContext(processedMessages);
    console.log('GeminiService: Formatted messages for API call, count:', managedMessages.length);
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
          console.log(`GeminiService: Attempt ${attempt + 1}/${MAX_RETRIES} to call Gemini API`);
          const url = `${GEMINI_BASE_URL}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`;
          console.log('GeminiService: Sending request to Gemini API...');
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
          
          console.log('GeminiService: Response received from Gemini API');
          
          if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = response.data.candidates[0].content.parts[0].text;
            console.log('GeminiService: Successfully extracted response text, length:', responseText.length);
            return responseText;
          } else {
            console.error('GeminiService: Invalid response format from API');
            throw new Error('Invalid response format from Gemini API');
          }
        } catch (error: any) {
          lastError = error;
          console.error(`GeminiService: API call error on attempt ${attempt + 1}:`, error.message);
          
          // Log more details about the error
          if (error.response) {
            console.error('GeminiService: Error status:', error.response.status);
            console.error('GeminiService: Error data:', JSON.stringify(error.response.data));
          }
          
          // Check if the error is retriable
          const status = error.response?.status;
          const isRateLimitError = status === 429;
          const isServerError = status >= 500;
          const isNetworkError = !status && error.code === 'ECONNABORTED';
          
          if (isRateLimitError || isServerError || isNetworkError) {
            // Exponential backoff for retries
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`GeminiService: Retrying after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Non-retriable error, break out of retry loop
          console.error('GeminiService: Non-retriable error, giving up');
          break;
        }
      }
      
      // If we get here, all retries failed
      console.error('GeminiService: All retry attempts failed');
      throw lastError || new Error('Failed to generate response after multiple attempts');
    });
  }
}

// Export singleton instance
export const geminiService = new GeminiService(); 