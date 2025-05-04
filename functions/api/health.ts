import { HandlerContext } from '@netlify/functions';
import { createResponse } from '../utils/auth';
import { validateEnvironment, env } from '../utils/environment';

/**
 * Public health check endpoint that doesn't require authentication
 * This allows the mobile app to check if the backend is available before login
 */
export async function handler(event: any, context: HandlerContext) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse({ success: false, message: 'Server configuration error' }, 500);
  }
  
  // Check if the API key is configured, but don't reveal its existence
  const apiConfigured = !!env.GEMINI_API_KEY;

  // Simple health check response without sensitive details
  return createResponse({ 
    success: true, 
    message: 'API available',
    apiConfigured
  });
} 