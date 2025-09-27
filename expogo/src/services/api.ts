import axios from 'axios';
import { Platform } from 'react-native';
import { Storage } from '@/utils/storage';

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
const API_BASE_URL = 'http://192.168.31.227:8000/api';

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
