import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

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
const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshAccessToken(refreshToken);
              this.setTokens(response.data.access, response.data.refresh);
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
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

  async getUsernamePreview(data: {
    first_name: string;
    last_name: string;
    email: string;
  }): Promise<AxiosResponse<{ username: string }>> {
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
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  logout(): void {
    this.clearTokens();
  }

  // Error handling
  handleError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: any } };
      const data = axiosError.response?.data;
      if (typeof data === 'string') {
        return { message: data };
      }
      if (data?.detail) {
        return { message: data.detail };
      }
      if (data?.error) {
        return { message: data.error };
      }
      // Check if data is an object with field errors (e.g., {"email": ["error"]})
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const hasFieldErrors = keys.length > 0 && keys.every(key => Array.isArray(data[key]) && data[key].every((msg: any) => typeof msg === 'string'));
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

  // Simplified biometric authentication methods (for demo purposes)
  async isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
    // For web browsers, we'll simulate biometric availability
    // In a real implementation, you'd check for WebAuthn support
    return {
      available: true, // Assume available for demo
      types: ['webauthn']
    };
  }

  async registerBiometricCredential(username: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Get challenge from server
      const challengeResponse = await this.api.post('/auth/biometric/challenge/', { action: 'register' });
      const challengeData = challengeResponse.data;

      // Create WebAuthn credential
      const publicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(atob(challengeData.challenge), c => c.charCodeAt(0)),
        rp: challengeData.rp,
        user: {
          id: Uint8Array.from(atob(challengeData.user.id), c => c.charCodeAt(0)),
          name: challengeData.user.name,
          displayName: challengeData.user.displayName
        },
        pubKeyCredParams: challengeData.pubKeyCredParams,
        timeout: challengeData.timeout,
        attestation: challengeData.attestation
      };

      // Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Convert credential to JSON for sending to server
      const credentialData = {
        id: btoa(atob(this.base64UrlToBase64(credential.id))), // Convert to base64
        type: credential.type,
        publicKey: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.getPublicKey()))),
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.attestationObject)))
      };

      // Send credential to server
      const registerResponse = await this.api.post('/auth/biometric/register/', {
        credential: JSON.stringify(credentialData)
      });

      return { success: true, message: 'Biometric authentication enabled' };
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      return { success: false, message: this.handleError(error).message };
    }
  }

  // Helper function to convert base64url to base64
  private base64UrlToBase64(base64url: string): string {
    return base64url.replace(/-/g, '+').replace(/_/g, '/');
  }

  async authenticateWithBiometrics(): Promise<{ success: boolean; message?: string }> {
    try {
      // Get username for biometric authentication (from the login form)
      const authUsername = localStorage.getItem('biometric_auth_username');
      if (!authUsername) {
        return { success: false, message: 'Username required for biometric authentication' };
      }

      // Get challenge from server for authentication
      const challengeResponse = await this.api.post('/auth/biometric/challenge/', { 
        action: 'authenticate',
        username: authUsername
      });
      const challengeData = challengeResponse.data;

      // Create WebAuthn authentication options
      const publicKeyCredentialRequestOptions = {
        challenge: Uint8Array.from(atob(challengeData.challenge), c => c.charCodeAt(0)),
        allowCredentials: challengeData.allowCredentials.map((cred: any) => {
          console.log('Credential ID from server:', cred.id);
          // The credential ID is now in base64 format
          return {
            type: cred.type,
            id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0))
          };
        }),
        timeout: 60000
      };

      // Get credential using WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      const assertionResponse = credential.response as AuthenticatorAssertionResponse;

      // Convert credential to JSON for sending to server
      const credentialData = {
        id: credential.id,
        type: credential.type,
        authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.authenticatorData))),
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.clientDataJSON))),
        signature: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.signature)))
      };

      // Send credential to server for authentication
      const authResponse = await this.api.post('/auth/biometric/authenticate/', {
        credential: JSON.stringify(credentialData)
      });

      this.setTokens(authResponse.data.access, authResponse.data.refresh);
      localStorage.setItem('user', JSON.stringify(authResponse.data.user));
      return { success: true, message: 'Biometric authentication successful' };
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      return { success: false, message: this.handleError(error).message };
    }
  }

  async enableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.api.patch('/auth/profile/', { biometric_enabled: true });
      return { success: true, message: 'Biometric login enabled' };
    } catch (error) {
      const apiError = this.handleError(error);
      return { success: false, message: apiError.message };
    }
  }

  async disableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.api.patch('/auth/profile/', { biometric_enabled: false });
      // Clear local biometric data
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('biometric_username');
      localStorage.removeItem('biometric_credential_id');
      return { success: true, message: 'Biometric login disabled' };
    } catch (error) {
      const apiError = this.handleError(error);
      return { success: false, message: apiError.message };
    }
  }

  async getBiometricStatus(): Promise<{ enabled: boolean }> {
    try {
      const response = await this.api.get('/auth/profile/');
      return { enabled: response.data.biometric_enabled || false };
    } catch (error) {
      return { enabled: false };
    }
  }

  isBiometricEnabledLocally(): boolean {
    return localStorage.getItem('biometric_enabled') === 'true';
  }
}

export const apiService = new ApiService();
export default apiService;
