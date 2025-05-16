const { createClient } = require('@supabase/supabase-js');
const { env } = require('./environment');

// Initialize Supabase client (for server-side use only)
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Create a standardized response
function createResponse(
  data = null,
  statusCode = 200,
  error = null
) {
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

// Middleware to verify authentication
function withAuth(handler) {
  return async (event, context) => {
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
      const { data, error } = await supabase.auth.getUser(token);
      const user = data?.user;

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
      event.user = user;
      event.supabaseClient = supabaseClient;

      // Call the original handler with the authenticated request
      return await handler(event, context);
    } catch (error) {
      console.error('Authentication error:', error);
      return createResponse(null, 500, 'Internal server error');
    }
  };
}

module.exports = {
  supabase,
  createResponse,
  withAuth
};