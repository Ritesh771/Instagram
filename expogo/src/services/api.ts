import axios from 'axios';
import { Platform } from 'react-native';
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

// Auto-detect or manually set the API URL
const API_BASE_URL = API_URLS.PHYSICAL_DEVICE; // Change this based on your device type

// Network connectivity testing functions
const testConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Testing basic connectivity to', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/admin/`, {
      method: 'HEAD',
    });
    console.log('Connectivity test response status:', response.status);
    return true;
  } catch (error) {
    console.error('Connectivity test failed:', error);
    return false;
  }
};

// Test alternative URLs
const testAlternativeURLs = async (): Promise<string | null> => {
  const urls = [
    'http://10.0.2.2:8000/api',
    'http://localhost:8000/api', 
    'http://127.0.0.1:8000/api',
    'http://192.168.2.8:8000/api'
  ];
  
  for (const url of urls) {
    try {
      console.log(`Testing connectivity to: ${url}`);
      const response = await fetch(`${url.replace('/api', '')}/admin/`, {
        method: 'HEAD',
      });
      console.log(`✅ ${url} - Status: ${response.status}`);
      return url;
    } catch (error: any) {
      console.log(`❌ ${url} - Failed:`, error.message);
    }
  }
  return null;
};

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

  // Network diagnostics
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/admin/`, {
        method: 'HEAD',
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async findWorkingURL(): Promise<string | null> {
    const urls = [
      'http://10.0.2.2:8000/api',
      'http://localhost:8000/api', 
      'http://127.0.0.1:8000/api',
      'http://192.168.2.8:8000/api'
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(`${url.replace('/api', '')}/admin/`, {
          method: 'HEAD',
        });
        if (response.status === 200) {
          return url;
        }
      } catch (error: unknown) {
        // Continue to next URL
      }
    }
    return null;
  }
  async saveTokens(access: string, refresh: string): Promise<void> {
    await Storage.setItem('access_token', access);
    await Storage.setItem('refresh_token', refresh);
  }

  // Auth endpoints
  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }): Promise<AxiosResponse<{ detail: string; username: string }>> {
    return this.api.post('/auth/register/', data);
  }

  async login(data: {
    username: string;
    password: string;
  }): Promise<AxiosResponse<AuthResponse | { detail: string; requires_2fa: boolean }>> {
    try {
      const response = await this.api.post('/auth/login/', data);
      return response;
    } catch (error) {
      // Test connectivity when login fails
      const connectivityWorking = await this.testConnectivity();
      if (!connectivityWorking) {
        const workingURL = await this.findWorkingURL();
        if (workingURL) {
          // Could potentially update API_BASE_URL here in future
        }
      }
      
      throw error;
    }
  }

  async verify2FA(data: {
    username: string;
    code: string;
  }): Promise<AxiosResponse<AuthResponse>> {
    return this.api.post('/auth/verify-2fa/', data);
  }

  async verifyOTP(data: {
    email: string;
    code: string;
  }): Promise<AxiosResponse<{ detail: string }>> {
    return this.api.post('/auth/verify-otp/', data);
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

  async getUsernamePreview(data: {
    first_name: string;
    last_name: string;
    email: string;
  }): Promise<AxiosResponse<{ username: string }>> {
    return this.api.post('/auth/username-preview/', data);
  }

  async updateProfile(data: {
    bio?: string;
    two_factor_enabled?: boolean;
  }): Promise<AxiosResponse<User>> {
    return this.api.patch('/auth/profile/', data);
  }

  async getProfile(): Promise<AxiosResponse<User>> {
    return this.api.get('/auth/profile/');
  }

  // Simplified biometric authentication methods (for demo purposes)
  async isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    console.log('Biometric availability:', { hasHardware, isEnrolled, supportedTypes });
    
    return {
      available: hasHardware && isEnrolled,
      types: supportedTypes.map(type => LocalAuthentication.AuthenticationType[type])
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
      
      // Clear local biometric data
      await Storage.removeItem('biometric_enabled');
      await Storage.removeItem('biometric_username');
      await Storage.removeItem('biometric_credential_id');
      
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

  async registerBiometricCredential(username: string): Promise<{ success: boolean; message?: string }> {
    try {
      // For React Native, we'll use a simplified approach
      // Store biometric enable flag locally after successful biometric test
      const biometricResult = await this.authenticateWithBiometrics('Set up biometric authentication');
      if (!biometricResult.success) {
        return { success: false, message: 'Biometric authentication failed during setup' };
      }

      // Enable in backend
      const backendResult = await this.enableBiometricLogin();
      if (!backendResult.success) {
        return backendResult;
      }

      // Store local biometric flag
      await Storage.setItem('biometric_enabled', 'true');
      await Storage.setItem('biometric_username', username);
      
      return { success: true, message: 'Biometric authentication enabled' };
    } catch (error) {
      console.error('Biometric registration error:', error);
      return { success: false, message: this.handleError(error).message };
    }
  }

  // Token management (mirroring web version)
  getAccessToken(): string | null {
    // This will be handled by the storage in the interceptor
    return null; // Placeholder, actual implementation uses Storage in interceptor
  }

  getRefreshToken(): string | null {
    // This will be handled by the storage in the interceptor  
    return null; // Placeholder, actual implementation uses Storage in interceptor
  }

  setTokens(access: string, refresh: string): void {
    // This delegates to saveTokens for React Native
    this.saveTokens(access, refresh);
  }

  clearTokens(): void {
    Storage.clear();
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await Storage.getItem('access_token');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  async logout(): Promise<void> {
    await Storage.clear();
  }

  async biometricLogin(): Promise<{ success: boolean; requires2FA?: boolean; message?: string; user?: User }> {
    try {
      console.log('Starting biometric login...');
      
      // Check if biometrics are enabled locally
      const localEnabled = await Storage.getItem('biometric_enabled');
      if (localEnabled !== 'true') {
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

  async likePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.post(`/posts/${postId}/like/`);
  }

  async unlikePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.delete(`/posts/${postId}/like/`);
  }

  // Error handling
  handleError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: unknown } };
      const data = axiosError.response?.data as Record<string, unknown>;
      if (typeof data === 'string') {
        return { message: data };
      }
      if (data?.detail) {
        return { message: data.detail as string };
      }
      if (data?.error) {
        return { message: data.error as string };
      }
      // Check if data is an object with field errors (e.g., {"email": ["error"]})
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const hasFieldErrors = keys.length > 0 && keys.every(key => Array.isArray(data[key]) && (data[key] as unknown[]).every((msg: unknown) => typeof msg === 'string'));
        if (hasFieldErrors) {
          const details = data as Record<string, string[]>;
          const messages = Object.values(details).flat();
          return { message: messages.join(' '), details };
        }
      }
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return { message: (error as Error).message };
    }
    return { message: 'An unexpected error occurred' };
  }
}

export const apiService = new ApiService();
export default apiService;
