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
// Current IP: 192.168.2.4

// Choose the appropriate URL based on your setup:
const API_URLS = {
  // For Android Emulator (maps to localhost on host machine)
  ANDROID_EMULATOR: 'http://10.0.2.2:8000/api',
  // For iOS Simulator
  IOS_SIMULATOR: 'http://localhost:8000/api',
  // For Physical Device (replace with your actual IP)
  PHYSICAL_DEVICE: 'http://192.168.2.4:8000/api', // Updated to your actual IP
  // For development testing
  LOCALHOST: 'http://localhost:8000/api',
};

// Auto-detect or manually set the API URL - using the working backend URL
const API_BASE_URL = API_URLS.PHYSICAL_DEVICE;

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
    try {
      const response = await this.api.post('auth/register/', data);
      return response;
    } catch (error) {
      throw error;
      }
  }

  async verifyOTP(data: { email: string; code: string }): Promise<AxiosResponse<any>> {
    return this.api.post('auth/verify-otp/', data);
  }

  async login(data: { username: string; password: string }): Promise<AxiosResponse<any>> {
    return this.api.post('auth/login/', data);
  }

  async verify2FA(data: { username: string; code: string }): Promise<AxiosResponse<any>> {
    return this.api.post('auth/verify-2fa/', data);
  }

  async requestPasswordReset(data: { email: string }): Promise<AxiosResponse<any>> {
    return this.api.post('auth/reset-password/', data);
  }

  async confirmPasswordReset(data: { email: string; code: string; new_password: string }): Promise<AxiosResponse<any>> {
    return this.api.post('auth/reset-password/confirm/', data);
  }

  async updateProfile(data: any): Promise<AxiosResponse<User>> {
    return this.api.patch('auth/profile/', data);
  }

  async getProfile(): Promise<AxiosResponse<User>> {
    return this.api.get('auth/profile/');
  }

  async getUsernamePreview(data: { first_name: string; last_name: string; email: string }): Promise<AxiosResponse<{ username: string }>> {
    return this.api.post('auth/username-preview/', data);
  }

  // Posts endpoints
  async getPosts(): Promise<AxiosResponse<Post[]>> {
    return this.api.get('posts/');
  }

  async createPost(data: FormData): Promise<AxiosResponse<Post>> {
    return this.api.post('posts/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deletePost(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`posts/${id}/`);
  }

  // Liking API Methods
  async likePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.post(`posts/${postId}/like/`);
  }

  async unlikePost(postId: number): Promise<AxiosResponse<{ liked: boolean; likes_count: number }>> {
    return this.api.delete(`posts/${postId}/like/`);
  }

  // Comment API Methods
  async commentOnPost(postId: number, content: string): Promise<AxiosResponse<any>> {
    return this.api.post(`posts/${postId}/comment/`, { content });
  }

  async deleteComment(commentId: number): Promise<AxiosResponse<any>> {
    return this.api.delete(`comments/${commentId}/`);
  }

  // Follow API Methods
  async followUser(userId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`users/${userId}/follow/`);
  }

  async unfollowUser(userId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`users/${userId}/unfollow/`);
  }

  async getFollowers(userId: number): Promise<AxiosResponse<User[]>> {
    return this.api.get(`users/${userId}/followers/`);
  }

  async getFollowing(userId: number): Promise<AxiosResponse<User[]>> {
    return this.api.get(`users/${userId}/following/`);
  }

  async checkFollowStatus(userId: number): Promise<AxiosResponse<{ is_following: boolean; is_self: boolean; is_requested?: boolean }>> {
    return this.api.get(`users/${userId}/follow-status/`);
  }

  // Notification API Methods
  async getNotifications(): Promise<AxiosResponse<any[]>> {
    return this.api.get('notifications/');
  }

  async markNotificationAsRead(notificationId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`notifications/${notificationId}/read/`);
  }

  async markAllNotificationsAsRead(): Promise<AxiosResponse<any>> {
    return this.api.post('notifications/read-all/');
  }

  async acceptFollowRequest(requesterId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`follow-requests/accept/${requesterId}/`);
  }

  async rejectFollowRequest(requesterId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`follow-requests/reject/${requesterId}/`);
  }

  // Search API Methods
  async searchUsers(query: string): Promise<AxiosResponse<User[]>> {
    return this.api.get(`users/?search=${encodeURIComponent(query)}`);
  }

  async getUserById(userId: number): Promise<AxiosResponse<User>> {
    return this.api.get(`users/${userId}/`);
  }

  // Device Management API Methods
  async getDevices(): Promise<AxiosResponse<any[]>> {
    return this.api.get('devices/');
  }

  async logoutDevice(deviceId: number, refreshToken?: string): Promise<AxiosResponse<any>> {
    const data: any = {};
    if (refreshToken) {
      data.refresh_token = refreshToken;
    }
    return this.api.delete(`devices/${deviceId}/logout/`, { data });
  }

  async logoutAllDevices(): Promise<AxiosResponse<any>> {
    // Log out all devices including current one
    return this.api.post('devices/logout-all/');
  }

  logout(): void {
    this.clearTokens();
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