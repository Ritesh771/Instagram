import { Platform } from 'react-native';
import axios from 'axios';
import { Storage } from '@/utils/storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Use axios types properly
type AxiosInstance = any;
type AxiosResponse<T = any> = any;

// Types matching backend models
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  biometric_enabled?: boolean;
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
// IMPORTANT: Update this IP to match your backend server's IP address
// To find your IP: Run 'ipconfig' on Windows or 'ifconfig' on Mac/Linux

// Choose the appropriate URL based on your setup:
const API_URLS = {
  // For Android Emulator (maps to localhost on host machine)
  ANDROID_EMULATOR: 'http://10.0.2.2:8000/api',
  // For iOS Simulator
  IOS_SIMULATOR: 'http://localhost:8000/api',
  // For Physical Device (replace with your actual IP)
  PHYSICAL_DEVICE: 'http://192.168.2.8:8000/api', // Update this IP!
  // For development testing
  LOCALHOST: 'http://localhost:8000/api',
};

// Auto-detect or manually set the API URL - using the working backend URL
const API_BASE_URL = API_URLS.PHYSICAL_DEVICE; // http://192.168.2.8:8000/api

class ApiService {
  private api: AxiosInstance;

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
        config.headers!.Authorization = `Bearer ${token}`;
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

  async saveTokens(access: string, refresh: string): Promise<void> {
    await Storage.setItem('access_token', access);
    await Storage.setItem('refresh_token', refresh);
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await Storage.getItem('access_token');
    } catch (error) {
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await Storage.getItem('refresh_token');
    } catch (error) {
      return null;
    }
  }

  async setTokens(access: string, refresh: string): Promise<void> {
    await Storage.setItem('access_token', access);
    await Storage.setItem('refresh_token', refresh);
  }

  async clearTokens(): Promise<void> {
    await Storage.removeItem('access_token');
    await Storage.removeItem('refresh_token');
    await Storage.removeItem('user');
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await Storage.getItem('access_token');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Auth endpoints
  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }): Promise<AxiosResponse<{ detail: string; username: string }>> {
    console.log('ApiService: Making register API call to:', `${API_BASE_URL}/auth/register/`);
    console.log('ApiService: Register data:', { ...data, password: '[HIDDEN]' });
    try {
      const response = await this.api.post('/auth/register/', data);
      console.log('ApiService: Register API response:', response.data);
      return response;
    } catch (error) {
      console.log('ApiService: Register API error:', error);
      throw error;
    }
  }

  async verifyOTP(data: { email: string; code: string }): Promise<AxiosResponse<any>> {
    return this.api.post('/auth/verify-otp/', data);
  }

  async login(data: { username: string; password: string }): Promise<AxiosResponse<any>> {
    return this.api.post('/auth/login/', data);
  }

  async verify2FA(data: { username: string; code: string }): Promise<AxiosResponse<any>> {
    return this.api.post('/auth/verify-2fa/', data);
  }

  async logout(): Promise<void> {
    await Storage.removeItem('access_token');
    await Storage.removeItem('refresh_token');
    await Storage.removeItem('user');
  }

  async requestPasswordReset(data: { email: string }): Promise<AxiosResponse<any>> {
    return this.api.post('/auth/password-reset/', data);
  }

  async confirmPasswordReset(data: { email: string; code: string; new_password: string }): Promise<AxiosResponse<any>> {
    return this.api.post('/auth/password-reset-confirm/', data);
  }

  async refreshAccessToken(refresh: string): Promise<AxiosResponse<{ access: string; refresh: string }>> {
    return axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
  }

  async updateProfile(data: any): Promise<AxiosResponse<User>> {
    return this.api.patch('/auth/profile/', data);
  }

  async getProfile(): Promise<AxiosResponse<User>> {
    return this.api.get('/auth/profile/');
  }

  async getUsernamePreview(data: { first_name: string; last_name: string; email: string }): Promise<AxiosResponse<{ username: string }>> {
    return this.api.post('/auth/username-preview/', data);
  }

  // Posts endpoints
  async getPosts(): Promise<AxiosResponse<Post[]>> {
    return this.api.get('/posts/');
  }

  async createPost(data: FormData): Promise<AxiosResponse<Post>> {
    return this.api.post('/posts/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deletePost(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/posts/${id}/`);
  }

  // Liking API Methods
  async likePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.post(`/posts/${postId}/like/`);
  }

  async unlikePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.delete(`/posts/${postId}/like/`);
  }

  // Biometric authentication methods
  async isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return {
        available: isAvailable && isEnrolled,
        types: supportedTypes.map(type => 
          type === LocalAuthentication.AuthenticationType.FINGERPRINT ? 'fingerprint' :
          type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ? 'face' :
          'biometric'
        )
      };
    } catch (error) {
      return { available: false, types: [] };
    }
  }

  async authenticateWithBiometrics(): Promise<{ success: boolean; message?: string }> {
    try {
      const biometricCheck = await this.isBiometricAvailable();
      if (!biometricCheck.available) {
        return { success: false, message: 'Biometric authentication not available' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock InstaPics',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, message: 'Biometric authentication failed' };
      }
    } catch (error) {
      return { success: false, message: 'Biometric authentication error' };
    }
  }

  async registerBiometricCredential(username: string): Promise<{ success: boolean; message?: string }> {
    // For mobile apps, we don't need WebAuthn - just check if biometrics are available
    const biometricCheck = await this.isBiometricAvailable();
    if (biometricCheck.available) {
      return { success: true, message: 'Biometric authentication is available' };
    } else {
      return { success: false, message: 'Biometric authentication is not available on this device' };
    }
  }

  async disableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    // For mobile, this just returns success since we handle biometric state in the frontend
    return { success: true, message: 'Biometric login disabled' };
  }

  async enableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if biometrics are available
      const biometricCheck = await this.isBiometricAvailable();
      if (!biometricCheck.available) {
        return { success: false, message: 'Biometric authentication is not available on this device' };
      }

      // Register biometric credential
      const biometricResult = await this.registerBiometricCredential('');
      if (!biometricResult.success) {
        return biometricResult;
      }

      return { success: true, message: 'Biometric login enabled successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to enable biometric login' };
    }
  }

  async getBiometricStatus(): Promise<{ enabled: boolean }> {
    try {
      const response = await this.getProfile();
      return { enabled: response.data.biometric_enabled || false };
    } catch (error) {
      return { enabled: false };
    }
  }

  async isBiometricEnabledLocally(): Promise<boolean> {
    try {
      const enabled = await Storage.getItem('biometric_enabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Utility methods
  async isAuthenticatedAsync(): Promise<boolean> {
    try {
      const token = await Storage.getItem('access_token');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Error handling
  handleError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data;
      return {
        message: data.detail || data.error || 'An error occurred',
        details: data.errors || data
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error - could not connect to server'
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred'
      };
    }
  }
}

export const apiService = new ApiService();