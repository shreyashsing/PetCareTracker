/**
 * API Client
 * 
 * A standardized API client with proper error handling, request/response interceptors,
 * and automatic token refresh.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleAPIError, tryCatchRequest, APIError } from '../../utils/apiErrorHandler';
import { securityService, DataSensitivity } from '../../services/security';

// API endpoints
const API_ENDPOINTS = {
  BASE_URL: 'https://api.example.com/v1',  // Replace with your actual API base URL
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    PROFILE: '/users/profile',
  },
  PETS: {
    BASE: '/pets',
    DETAILS: (id: string) => `/pets/${id}`,
  },
  HEALTH: {
    BASE: '/health-records',
    DETAILS: (id: string) => `/health-records/${id}`,
  },
};

// Token storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Create API client class for better organization
export class APIClient {
  private axios: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    // Create axios instance with default config
    this.axios = axios.create({
      baseURL: API_ENDPOINTS.BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.axios.interceptors.request.use(
      async (config) => {
        // Add auth token to requests if available
        const token = await this.getAuthToken();
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 error and we haven't tried refreshing token yet
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          originalRequest.url !== API_ENDPOINTS.AUTH.REFRESH &&
          originalRequest.url !== API_ENDPOINTS.AUTH.LOGIN
        ) {
          originalRequest._retry = true;
          
          try {
            // Get new token
            const token = await this.refreshAuthToken();
            
            // Update the auth header
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Retry the original request
            return this.axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails, force logout and reject with original error
            await this.clearTokens();
            return Promise.reject(error);
          }
        }
        
        // For other errors, just reject
        return Promise.reject(error);
      }
    );
  }

  // Get auth token from secure storage
  private async getAuthToken(): Promise<string | null> {
    try {
      return await securityService.getItem(AUTH_TOKEN_KEY, DataSensitivity.HIGH);
    } catch (error) {
      return null;
    }
  }

  // Get refresh token from secure storage
  private async getRefreshToken(): Promise<string | null> {
    try {
      return await securityService.getItem(REFRESH_TOKEN_KEY, DataSensitivity.HIGH);
    } catch (error) {
      return null;
    }
  }

  // Refresh the auth token
  private async refreshAuthToken(): Promise<string> {
    // If already refreshing, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Create new refresh promise
    this.refreshPromise = (async () => {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await this.axios.post(API_ENDPOINTS.AUTH.REFRESH, {
        refreshToken,
      });
      
      const { token, refreshToken: newRefreshToken } = response.data;
      
      // Save new tokens
      await securityService.setItem(AUTH_TOKEN_KEY, token, DataSensitivity.HIGH);
      await securityService.setItem(REFRESH_TOKEN_KEY, newRefreshToken, DataSensitivity.HIGH);
      
      return token;
    })();
    
    // Clear the promise reference after it resolves/rejects
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  // Clear tokens from storage
  private async clearTokens(): Promise<void> {
    await securityService.removeItem(AUTH_TOKEN_KEY);
    await securityService.removeItem(REFRESH_TOKEN_KEY);
  }

  // Save tokens after login
  public async setTokens(token: string, refreshToken: string): Promise<void> {
    await securityService.setItem(AUTH_TOKEN_KEY, token, DataSensitivity.HIGH);
    await securityService.setItem(REFRESH_TOKEN_KEY, refreshToken, DataSensitivity.HIGH);
  }

  // Generic request method with error handling
  public async request<T>(config: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return tryCatchRequest<T>(async () => {
      const response = await this.axios.request<T>(config);
      return response.data;
    });
  }

  // Convenience methods for common HTTP methods
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<[T | null, APIError | null]> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // API-specific methods
  public async login(email: string, password: string): Promise<[{ token: string, refreshToken: string } | null, APIError | null]> {
    const [data, error] = await this.post<{ token: string, refreshToken: string }>(
      API_ENDPOINTS.AUTH.LOGIN, 
      { email, password }
    );
    
    if (data) {
      await this.setTokens(data.token, data.refreshToken);
    }
    
    return [data, error];
  }

  public async logout(): Promise<[boolean | null, APIError | null]> {
    const [response, error] = await this.post<{ success: boolean }>(API_ENDPOINTS.AUTH.LOGOUT);
    
    // Clear tokens regardless of response
    await this.clearTokens();
    
    return [response?.success ?? true, error];
  }

  // Pet-related methods
  public async getPets(): Promise<[any[] | null, APIError | null]> {
    return this.get<any[]>(API_ENDPOINTS.PETS.BASE);
  }

  public async getPetById(id: string): Promise<[any | null, APIError | null]> {
    return this.get<any>(API_ENDPOINTS.PETS.DETAILS(id));
  }

  public async createPet(petData: any): Promise<[any | null, APIError | null]> {
    return this.post<any>(API_ENDPOINTS.PETS.BASE, petData);
  }

  public async updatePet(id: string, petData: any): Promise<[any | null, APIError | null]> {
    return this.put<any>(API_ENDPOINTS.PETS.DETAILS(id), petData);
  }

  public async deletePet(id: string): Promise<[boolean | null, APIError | null]> {
    return this.delete<boolean>(API_ENDPOINTS.PETS.DETAILS(id));
  }
}

// Export singleton instance
export const apiClient = new APIClient(); 