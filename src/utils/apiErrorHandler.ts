/**
 * API Error Handler
 * 
 * Standardized error handling for API requests with proper error messages and logging
 */

import axios, { AxiosError } from 'axios';

// Define possible error types
export enum ErrorType {
  NETWORK = 'network',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// Standard error response structure
export interface APIError {
  message: string;
  type: ErrorType;
  statusCode?: number;
  details?: Record<string, any>;
  originalError?: any;
}

// Helper function to determine error type from status code
function getErrorTypeFromStatus(status: number): ErrorType {
  switch (status) {
    case 401:
    case 403:
      return ErrorType.UNAUTHORIZED;
    case 404:
      return ErrorType.NOT_FOUND;
    case 422:
      return ErrorType.VALIDATION;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

// Convert any error to a standardized APIError
export function handleAPIError(error: any): APIError {
  // Default error response
  const apiError: APIError = {
    message: 'An unexpected error occurred',
    type: ErrorType.UNKNOWN
  };

  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Network errors
    if (axiosError.code === 'ECONNABORTED') {
      apiError.type = ErrorType.TIMEOUT;
      apiError.message = 'Request timed out. Please try again.';
    }
    else if (!axiosError.response) {
      apiError.type = ErrorType.NETWORK;
      apiError.message = 'Network error. Please check your connection.';
    }
    // Server response errors
    else {
      const status = axiosError.response.status;
      apiError.statusCode = status;
      apiError.type = getErrorTypeFromStatus(status);
      
      // Try to get message from response data
      const responseData = axiosError.response.data as any;
      
      if (responseData) {
        if (typeof responseData === 'string') {
          apiError.message = responseData;
        } 
        else if (responseData.message) {
          apiError.message = responseData.message;
        }
        else if (responseData.error) {
          apiError.message = typeof responseData.error === 'string' 
            ? responseData.error 
            : 'Server error occurred';
        }
        
        // Add validation details if available
        if (responseData.errors || responseData.details || responseData.validationErrors) {
          apiError.details = responseData.errors || responseData.details || responseData.validationErrors;
        }
      }
      
      // If no message was extracted, provide a default one based on status
      if (apiError.message === 'An unexpected error occurred') {
        switch (apiError.type) {
          case ErrorType.UNAUTHORIZED:
            apiError.message = 'You are not authorized to perform this action';
            break;
          case ErrorType.NOT_FOUND:
            apiError.message = 'The requested resource was not found';
            break;
          case ErrorType.VALIDATION:
            apiError.message = 'The submitted data is invalid';
            break;
          case ErrorType.SERVER:
            apiError.message = 'Server error occurred. Please try again later.';
            break;
          default:
            apiError.message = `Error: ${status}`;
        }
      }
    }
    
    // Store original error for debugging
    apiError.originalError = axiosError;
  } 
  // Handle Supabase errors
  else if (error && error.code && typeof error.message === 'string') {
    apiError.message = error.message;
    
    // Map Supabase error codes to our error types
    if (error.code === 'PGRST301' || error.code === 'PGRST204') {
      apiError.type = ErrorType.NOT_FOUND;
    } 
    else if (error.code.startsWith('PGRST4')) {
      apiError.type = ErrorType.VALIDATION;
    } 
    else if (error.code.startsWith('PGRST5')) {
      apiError.type = ErrorType.SERVER;
    } 
    else if (error.code === 'UNAUTHENTICATED' || error.code === 'UNAUTHORIZED') {
      apiError.type = ErrorType.UNAUTHORIZED;
    }
    
    apiError.originalError = error;
  }
  // Handle regular errors
  else if (error instanceof Error) {
    apiError.message = error.message;
    apiError.originalError = error;
  }

  // Log the error for debugging (in development)
  if (__DEV__) {
    console.error(`API Error [${apiError.type}]: ${apiError.message}`, apiError.originalError);
  }

  return apiError;
}

// Helper function to extract user-friendly message
export function getUserFriendlyErrorMessage(error: APIError | any): string {
  if (!error) {
    return 'An unknown error occurred';
  }
  
  // If already processed as APIError
  if ('type' in error && 'message' in error) {
    return error.message;
  }
  
  // Process and return user-friendly message
  return handleAPIError(error).message;
}

// Helper to check if error is a specific type
export function isErrorType(error: APIError, type: ErrorType): boolean {
  return error.type === type;
}

// Wrapper for try/catch blocks to standardize error handling
export async function tryCatchRequest<T>(
  requestFn: () => Promise<T>,
  errorMessage = 'Request failed'
): Promise<[T | null, APIError | null]> {
  try {
    const data = await requestFn();
    return [data, null];
  } catch (error) {
    const apiError = handleAPIError(error);
    // Override with custom message if provided
    if (errorMessage !== 'Request failed') {
      apiError.message = errorMessage;
    }
    return [null, apiError];
  }
} 