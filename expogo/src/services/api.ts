import axios from 'axios';
import { Platform } from 'react-native';
import { Storage } from '@/utils/storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Types matching backend models
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
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

// API Configuration
const API_BASE_URL = 'http://192.168.2.7:8000/api';

class ApiService {
  private api: any;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'X-Platform': Platform.OS
      }
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(async (config: any) => {
      const token = await Storage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = await Storage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const refreshResponse = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                refresh: refreshToken
              });
              const newToken = (refreshResponse.data as any).access;
              await Storage.setItem('access_token', newToken);
              // Retry the original request
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return axios(error.config);
            } catch (refreshError) {
              // Refresh failed, logout
              await this.logout();
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  async saveTokens(access: string, refresh: string): Promise<void> {
    await Storage.setItem('access_token', access);
    await Storage.setItem('refresh_token', refresh);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await Storage.getItem('access_token');
    return !!token;
  }

  async logout(): Promise<void> {
    await Storage.clear();
  }

  // Auth endpoints
  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }): Promise<any> {
    return this.api.post('/auth/register/', data);
  }

  async login(data: {
    username: string;
    password: string;
  }): Promise<any> {
    return this.api.post('/auth/login/', data);
  }

  async verify2FA(data: {
    username: string;
    code: string;
  }): Promise<any> {
    return this.api.post('/auth/verify-2fa/', data);
  }

  async verifyOTP(data: {
    email: string;
    code: string;
  }): Promise<any> {
    return this.api.post('/auth/verify-otp/', data);
  }

  async requestPasswordReset(data: {
    email: string;
  }): Promise<any> {
    return this.api.post('/auth/reset-password/', data);
  }

  async confirmPasswordReset(data: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<any> {
    return this.api.post('/auth/reset-password/confirm/', data);
  }

  async getUsernamePreview(data: {
    first_name: string;
    last_name: string;
    email: string;
  }): Promise<any> {
    return this.api.post('/auth/username-preview/', data);
  }

  async updateProfile(data: {
    bio?: string;
    two_factor_enabled?: boolean;
  }): Promise<any> {
    return this.api.patch('/auth/profile/', data);
  }

  async getProfile(): Promise<any> {
    return this.api.get('/auth/profile/');
  }

  // Biometric authentication methods
  async isBiometricAvailable(): Promise<{ available: boolean; types: LocalAuthentication.AuthenticationType[] }> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    console.log('Biometric availability:', { hasHardware, isEnrolled, supportedTypes });
    
    return {
      available: hasHardware && isEnrolled,
      types: supportedTypes
    };
  }

  async authenticateWithBiometrics(reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });
      
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Biometric authentication failed' };
    }
  }

  async saveBiometricCredentials(username: string, password: string): Promise<void> {
    // Store credentials securely for biometric login
    await Storage.setItem('biometric_username', username);
    await Storage.setItem('biometric_password', password);
    await Storage.setItem('biometric_enabled', 'true');
  }

  async getBiometricCredentials(): Promise<{ username: string; password: string } | null> {
    const enabled = await Storage.getItem('biometric_enabled');
    if (enabled !== 'true') return null;
    
    const username = await Storage.getItem('biometric_username');
    const password = await Storage.getItem('biometric_password');
    
    if (username && password) {
      return { username, password };
    }
    return null;
  }

  async enableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Enabling biometric login in backend...');
      const response = await this.api.patch('/auth/profile/', { biometric_enabled: true });
      console.log('Backend biometric enable response:', response.data);
      return { success: true, message: 'Biometric login enabled' };
    } catch (error) {
      console.error('Failed to enable biometric login in backend:', error);
      const apiError = this.handleError(error);
      return { success: false, message: apiError.message };
    }
  }

  async disableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Disabling biometric login in backend...');
      const response = await this.api.patch('/auth/profile/', { biometric_enabled: false });
      console.log('Backend biometric disable response:', response.data);
      return { success: true, message: 'Biometric login disabled' };
    } catch (error) {
      console.error('Failed to disable biometric login in backend:', error);
      const apiError = this.handleError(error);
      return { success: false, message: apiError.message };
    }
  }

  async getBiometricStatus(): Promise<{ enabled: boolean }> {
    try {
      const response = await this.api.get('/auth/profile/');
      return { enabled: response.data.biometric_enabled || false };
    } catch (error) {
      console.error('Failed to get biometric status:', error);
      return { enabled: false };
    }
  }

  async disableBiometricLoginLocally(): Promise<void> {
    await Storage.removeItem('biometric_username');
    await Storage.removeItem('biometric_password');
    await Storage.removeItem('biometric_enabled');
  }

  async biometricLogin(): Promise<{ success: boolean; requires2FA?: boolean; message?: string; user?: User }> {
    try {
      console.log('Starting biometric login...');
      
      // First check if biometrics are enabled for current user in backend
      const backendStatus = await this.getBiometricStatus();
      console.log('Backend biometric status:', backendStatus);
      
      if (!backendStatus.enabled) {
        return { success: false, message: 'Biometric login not enabled for this user' };
      }
      
      // First authenticate with biometrics
      const biometricResult = await this.authenticateWithBiometrics('Unlock App');
      console.log('Biometric authentication result:', biometricResult);
      
      if (!biometricResult.success) {
        return { success: false, message: 'Biometric authentication failed' };
      }

      // For app unlock, we don't need to login again - just return success
      // The AuthContext will handle unlocking the app
      console.log('Biometric authentication successful - app unlocked');
      return { success: true };
    } catch (error) {
      console.error('Biometric login error:', error);
      const apiError = this.handleError(error);
      return { success: false, message: apiError.message };
    }
  }

  // Posts endpoints
  async getPosts(): Promise<any> {
    return this.api.get('/posts/');
  }

  async createPost(data: FormData): Promise<any> {
    return this.api.post('/posts/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deletePost(id: number): Promise<any> {
    return this.api.delete(`/posts/${id}/`);
  }

  async likePost(postId: number): Promise<any> {
    return this.api.post(`/posts/${postId}/like/`);
  }

  async unlikePost(postId: number): Promise<any> {
    return this.api.delete(`/posts/${postId}/like/`);
  }

  // Error handling
  handleError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: unknown } };
      const data = axiosError.response?.data as any;

      if (typeof data === 'string') {
        return { message: data };
      }
      if (data?.detail) {
        return { message: data.detail };
      }
      if (data?.non_field_errors) {
        return { message: data.non_field_errors[0] };
      }
    }
    return { message: 'An unexpected error occurred' };
  }
}

export const apiService = new ApiService();
export default apiService;
