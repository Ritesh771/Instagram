import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import { Storage } from '@/utils/storage';
import { getApiUrl, getBaseUrl } from '@/config/network';

// Types matching backend models
export interface User {
  id: number;
  username: string;
  email: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  bio?: string;
  profile_pic?: string;
}

export interface Post {
  id: number;
  user: User;
  image: string;
  caption: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiError {
  message: string;
  details?: Record<string, string[]>;
}

// API Configuration - uses network config
const API_BASE_URL = getApiUrl();

class ApiService {
  private api: AxiosInstance;

  private async testConnection(): Promise<void> {
    console.log('[API] Environment:', {
      platform: Platform.OS,
      isDev: __DEV__,
      baseUrl: API_BASE_URL
    });

    // List of endpoints to test, in order of preference
    const testEndpoints = [
      '/health/',      // Dedicated health check endpoint
      '/posts/',       // Main posts endpoint
      '/'             // Root API endpoint
    ];

    for (const endpoint of testEndpoints) {
      try {
        console.log(`[API] Testing endpoint: ${endpoint}`);
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        console.log(`[API] Endpoint ${endpoint} responded with status:`, response.status);
        
        // If we get here, we've successfully connected
        console.log('[API] Connection test passed');
        return;
      } catch (error: any) {
        console.log(`[API] Endpoint ${endpoint} failed:`, {
          status: error?.response?.status,
          message: error?.message,
          isAxiosError: error?.isAxiosError
        });
        
        // Only try alternative endpoints if this was a 404
        if (error?.response?.status !== 404) {
          throw error; // Re-throw non-404 errors
        }
      }
    }

    // If we get here, all endpoints failed
    throw new Error('No API endpoints responded successfully');
  }

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      // Do not set a default Content-Type here. For JSON requests axios will
      // set application/json automatically; for FormData uploads we must let
      // axios set the multipart boundary, so avoid a global Content-Type.
      timeout: 15000, // 15 second timeout
      // Add additional headers that might be needed
      headers: {
        'Accept': 'application/json',
        'X-Platform': Platform.OS
      },
      // Add retry logic
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Default success status codes
      }
    });

    // Test the connection - but don't block construction
    this.testConnection().catch(error => {
      console.warn('[API] Initial connection test failed:', error.message);
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config: any) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshAccessToken(refreshToken);
              await this.setTokens(response.data.access, response.data.refresh);
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await this.clearTokens();
            // In React Native, we'll handle navigation through context
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management using cross-platform storage
  private async getAccessToken(): Promise<string | null> {
    return await Storage.getItem('access_token');
  }

  private async getRefreshToken(): Promise<string | null> {
    return await Storage.getItem('refresh_token');
  }

  private async setTokens(access: string, refresh: string): Promise<void> {
    await Storage.setItem('access_token', access);
    await Storage.setItem('refresh_token', refresh);
  }

  // Public wrapper for setting tokens (used by AuthContext and for local fallbacks)
  public async saveTokens(access: string, refresh: string): Promise<void> {
    return this.setTokens(access, refresh);
  }

  private async clearTokens(): Promise<void> {
    await Storage.removeItem('access_token');
    await Storage.removeItem('refresh_token');
    await Storage.removeItem('user');
  }

  // Auth endpoints
  async register(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<AxiosResponse<{ detail: string }>> {
    return this.api.post('/auth/register/', data);
  }

  async verifyOTP(data: {
    email: string;
    code: string;
  }): Promise<AxiosResponse<{ detail: string }>> {
    return this.api.post('/auth/verify-otp/', data);
  }

  async login(data: {
    username: string;
    password: string;
  }): Promise<AxiosResponse<AuthResponse | { detail: string; requires_2fa: boolean }>> {
    return this.api.post('/auth/login/', data);
  }

  async verify2FA(data: {
    username: string;
    code: string;
  }): Promise<AxiosResponse<AuthResponse>> {
    return this.api.post('/auth/verify-2fa/', data);
  }

  async requestPasswordReset(data: {
    email: string;
  }): Promise<AxiosResponse<{ detail: string }>> {
    return this.api.post('/auth/reset-password/', data);
  }

  async confirmPasswordReset(data: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<AxiosResponse<{ detail: string }>> {
    return this.api.post('/auth/reset-password/confirm/', data);
  }

  async refreshAccessToken(refresh: string): Promise<AxiosResponse<{ access: string; refresh: string }>> {
    return axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
  }

  // Posts endpoints
  async getPosts(): Promise<AxiosResponse<Post[]>> {
    return this.api.get('/posts/');
  }

  async createPost(data: FormData): Promise<AxiosResponse<Post>> {
    try {
      // Log the full request details
      const token = await this.getAccessToken();
      console.log('[Upload] Request details:', {
        url: `${API_BASE_URL}/posts/`,
        hasToken: !!token,
        formData: Array.from((data as any)._parts || []).map(([key, value]: any) => ({
          key,
          type: value?.type,
          name: value?.name,
          size: value?.size
        }))
      });
      
      // Create a copy of the API instance with specific headers for this request
      const uploadApi = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });

      // Make the request
      const response = await uploadApi.post('/posts/', data);
      console.log('[Upload] Success:', response.status);
      return response;
    } catch (error: any) {
      console.error('[Upload] Failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
      });
      throw error;
    }
  }

  async deletePost(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/posts/${id}/`);
  }

  async likePost(id: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.post(`/posts/${id}/like/`);
  }

  async unlikePost(id: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.delete(`/posts/${id}/like/`);
  }

  // User profile endpoints
  async updateProfile(data: {
    bio?: string;
    two_factor_enabled?: boolean;
  }): Promise<AxiosResponse<User>> {
    return this.api.patch('/auth/profile/', data);
  }

  async getProfile(): Promise<AxiosResponse<User>> {
    return this.api.get('/auth/profile/');
  }

  // Utility methods
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  // Error handling
  handleError(error: unknown): ApiError {
    console.log('[API] Error details:', {
      error,
      isAxiosError: error && typeof error === 'object' && 'isAxiosError' in error,
      config: error && typeof error === 'object' && 'config' in error ? (error as any).config : null,
      status: error && typeof error === 'object' && 'response' in error ? (error as any).response?.status : null,
      data: error && typeof error === 'object' && 'response' in error ? (error as any).response?.data : null
    });

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: unknown; status?: number } };
      
      // No response from server
      if (!axiosError.response) {
        console.log('[API] No response from server - possible connection issue');
        return { message: 'Unable to connect to server. Please check your internet connection.' };
      }

      const data = axiosError.response.data as any;
      const status = axiosError.response.status;

      // Log the response status and data
      console.log(`[API] Response status: ${status}`);
      console.log('[API] Response data:', data);

      if (typeof data === 'string') {
        return { message: data };
      }
      if (data && typeof data === 'object') {
        if (data.detail) {
          return { message: data.detail };
        }
        if (data.error) {
          return { message: data.error };
        }
        if (data.details) {
          return { message: 'Validation error', details: data.details };
        }
      }
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message;
      console.log('[API] Error message:', errorMessage);
      return { message: errorMessage };
    }
    return { message: 'An unexpected error occurred' };
  }
}

export const apiService = new ApiService();
export default apiService;
