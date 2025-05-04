import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './environment';

// Initialize Supabase client (for server-side use only)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Response helper for easier response formatting
export interface ApiResponse {
  statusCode: number;
  body: string;
  headers?: {
    [header: string]: string | number | boolean;
  };
}

// Create a standardized response
export function createResponse(
  data: any = null,
  statusCode = 200,
  error: string | null = null
): ApiResponse {
  const body = {
    success: !error,
    data,
    error,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  };
}

// Interface for authenticated request handler
export interface AuthenticatedRequest extends HandlerEvent {
  user: any; // The authenticated user
  supabaseClient: SupabaseClient; // User-specific Supabase client
}

// Middleware to verify authentication
export function withAuth(
  handler: (event: AuthenticatedRequest, context: HandlerContext) => Promise<ApiResponse>
): Handler {
  return async (event: HandlerEvent, context: HandlerContext) => {
    // Handle preflight requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        body: '',
      };
    }

    try {
      // Extract and verify token from Authorization header
      const authHeader = event.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return createResponse(null, 401, 'Unauthorized: No token provided');
      }

      // Verify the JWT token using Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.error('Auth error:', error);
        return createResponse(null, 401, 'Unauthorized: Invalid token');
      }

      // Create a user-specific Supabase client
      const supabaseClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
          },
        }
      );

      // Add user and Supabase client to event
      const authenticatedEvent = event as AuthenticatedRequest;
      authenticatedEvent.user = user;
      authenticatedEvent.supabaseClient = supabaseClient;

      // Call the original handler with the authenticated request
      return await handler(authenticatedEvent, context);
    } catch (error) {
      console.error('Authentication error:', error);
      return createResponse(null, 500, 'Internal server error');
    }
  };
} 
 