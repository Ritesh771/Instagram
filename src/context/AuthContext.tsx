import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, AuthResponse } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  verify2FA: (username: string, code: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (data: { bio?: string; two_factor_enabled?: boolean }) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Try to get user data from localStorage first
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ username, password });
      
      if ('requires_2fa' in response.data && response.data.requires_2fa) {
        return { success: false, requires2FA: true, message: response.data.detail };
      }

      const authData = response.data as AuthResponse;
      apiService.setTokens(authData.access, authData.refresh);
      setUser(authData.user);
      localStorage.setItem('user', JSON.stringify(authData.user));
      
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (username: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.verify2FA({ username, code });
      
      apiService.setTokens(response.data.access, response.data.refresh);
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.register({ username, email, password });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.verifyOTP({ email, code });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.requestPasswordReset({ email });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.confirmPasswordReset({ email, code, newPassword });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateProfile = async (data: { bio?: string; two_factor_enabled?: boolean }) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateProfile(data);
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    verify2FA,
    register,
    verifyOTP,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    updateUser,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
