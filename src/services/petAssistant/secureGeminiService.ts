import { geminiApi, GeminiChatMessage } from '../api/geminiApi';

/**
 * Secure Gemini Service that uses our secure API proxy
 * This replaces direct Gemini API calls for better security
 */
export class SecureGeminiService {
  private contextMessages: GeminiChatMessage[] = [];
  private static instance: SecureGeminiService;

  private constructor() {
    // Initialize with system message
    this.contextMessages = [
      {
        role: 'system',
        content: `You are a helpful pet care assistant. Use your knowledge to provide accurate, 
helpful information about pet care, health, training, and general pet wellbeing. 
Only answer questions related to pets and pet care. If asked about non-pet topics, 
kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.`
      }
    ];
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SecureGeminiService {
    if (!SecureGeminiService.instance) {
      SecureGeminiService.instance = new SecureGeminiService();
    }
    return SecureGeminiService.instance;
  }

  /**
   * Check if the backend API is available and properly configured
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      return await geminiApi.checkApiAvailability();
    } catch (error) {
      console.error('Error checking API availability:', error);
      return false;
    }
  }

  /**
   * Set context messages for the conversation
   */
  setContextMessages(messages: GeminiChatMessage[]): void {
    // Always keep the system message at the beginning
    const systemMessage = this.contextMessages[0];
    this.contextMessages = [systemMessage, ...messages];
  }

  /**
   * Get current context messages
   */
  getContextMessages(): GeminiChatMessage[] {
    return [...this.contextMessages];
  }

  /**
   * Clear context except for the system message
   */
  clearContext(): void {
    // Keep only the system message
    this.contextMessages = [this.contextMessages[0]];
  }

  /**
   * Add a message to the context
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.contextMessages.push({ role, content });
  }

  /**
   * Generate a response to the given prompt using the context
   */
  async generateChatResponse(
    prompt?: string,
    temperature: number = 0.7,
    maxTokens: number = 8192
  ): Promise<string> {
    try {
      // Create a copy of the context messages
      const messages = [...this.contextMessages];
      
      // Add the new prompt if provided
      if (prompt) {
        messages.push({ role: 'user', content: prompt });
      }
      
      // Generate the response using our secure API
      const response = await geminiApi.generateChatResponse(
        messages,
        temperature,
        maxTokens
      );
      
      // Add the response to the context
      if (prompt) {
        this.addMessage('assistant', response);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error;
    }
  }
}

// Export the singleton instance
export const secureGeminiService = SecureGeminiService.getInstance(); 