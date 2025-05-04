import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { supabase } from '../supabase';

// Define API URL based on development mode
// Use localhost for development, and the real URL for production
const API_URL = __DEV__ 
  ? 'http://localhost:8888/.netlify/functions' 
  : 'https://your-netlify-site.netlify.app/.netlify/functions';

/**
 * Secure API client for server communication
 * This replaces direct Supabase queries from the mobile app for sensitive operations
 */
class SecureApiClient {
  private axiosInstance: AxiosInstance;
  private static instance: SecureApiClient;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const { data } = await supabase.auth.getSession();
          
          if (data.session?.access_token) {
            // Add the Authorization header with the token
            config.headers.Authorization = `Bearer ${data.session.access_token}`;
          }
          
          return config;
        } catch (error) {
          console.error('Error getting auth token for API request:', error);
          return config;
        }
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // If the error is due to an expired token and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh the session
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !data.session) {
              // If refresh fails, redirect to login or show an error
              console.error('Session refresh failed during API call:', refreshError);
              return Promise.reject(error);
            }

            // Update the request with the new token
            originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
            
            // Retry the request with the new token
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SecureApiClient {
    if (!SecureApiClient.instance) {
      SecureApiClient.instance = new SecureApiClient();
    }
    return SecureApiClient.instance;
  }

  /**
   * Make a GET request to the API
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const config: AxiosRequestConfig = {};
    if (params) {
      config.params = params;
    }

    try {
      const response = await this.axiosInstance.get<{success: boolean, data: T, error: string | null}>(endpoint, config);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`API GET error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.post<{success: boolean, data: T, error: string | null}>(endpoint, data);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`API POST error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request to the API
   */
  async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const config: AxiosRequestConfig = {};
    if (params) {
      config.params = params;
    }

    try {
      const response = await this.axiosInstance.delete<{success: boolean, data: T, error: string | null}>(endpoint, config);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`API DELETE error for ${endpoint}:`, error);
      throw error;
    }
  }
}

// Export the singleton instance
export const secureApiClient = SecureApiClient.getInstance(); 