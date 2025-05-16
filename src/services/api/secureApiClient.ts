import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { supabase } from '../supabase';
import { Platform } from 'react-native';
import { API_URL, testApiConnection } from '../../config/network';

// Log the API URL for debugging
console.log(`SecureApiClient using API URL: ${API_URL}`);

/**
 * Secure API client that adds authentication headers
 * and manages API requests to the Netlify serverless functions
 */
class SecureApiClient {
  private client: AxiosInstance;
  private initialized: boolean = false;

  constructor() {
    // Create Axios client with default config
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': Platform.OS
      }
    });

    // Configure request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            config.headers['Authorization'] = `Bearer ${session.access_token}`;
          } else {
            console.warn('No valid session found for API request');
          }
        } catch (error) {
          console.error('Error getting session for API request:', error);
        }
        
        return config;
      },
      error => Promise.reject(error)
    );

    // Test if the API is reachable during initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      const isConnected = await testApiConnection();
      this.initialized = isConnected;
      
      if (isConnected) {
        console.log('SecureApiClient successfully connected to API');
      } else {
        console.warn('SecureApiClient failed to connect to API');
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
      this.initialized = false;
    }
  }

  /**
   * Make a GET request to the API
   */
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get<T>(endpoint, config).then(response => response.data);
  }

  /**
   * Make a POST request to the API
   */
  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<T>(endpoint, data, config).then(response => response.data);
  }

  /**
   * Make a PUT request to the API
   */
  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put<T>(endpoint, data, config).then(response => response.data);
  }

  /**
   * Make a DELETE request to the API
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete<T>(endpoint, config).then(response => response.data);
  }

  /**
   * Check if the client is initialized and connected to the API
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export a singleton instance
export const secureApiClient = new SecureApiClient();

/**
 * Make an authenticated request to the backend API
 * @param method HTTP method
 * @param endpoint API endpoint
 * @param data Request data
 * @returns Promise with response data
 */
export async function makeAuthenticatedRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
  endpoint: string, 
  data?: any
): Promise<T> {
  try {
    console.log(`Making ${method} request to ${endpoint}...`);
    
    // Get authentication tokens
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session?.access_token) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication required');
    }
    
    // Prepare request
    const url = `${API_URL}/${endpoint}`;
    console.log(`Request URL: ${url}`);
    
    // Make request with timeout
    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`Response from ${endpoint}:`, response.status);
    
    if (response.data.error) {
      console.error(`API error from ${endpoint}:`, response.data.error);
      throw new Error(response.data.error);
    }
    
    // Return the response data
    return response.data as T;
  } catch (error: any) {
    console.error(`API request failed for ${endpoint}:`, error.message || error);
    
    // Check if it's a network error
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      throw new Error('NETWORK_ERROR');
    }
    
    // Re-throw the error
    throw error;
  }
} 