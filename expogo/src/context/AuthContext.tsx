import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, AuthResponse } from '@/services/api';
import { Storage } from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  verify2FA: (username: string, code: string) => Promise<{ success: boolean; message?: string }>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<{ success: boolean; message?: string; username?: string }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  getUsernamePreview: (firstName: string, lastName: string, email: string) => Promise<{ success: boolean; username?: string; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: { bio?: string; two_factor_enabled?: boolean }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
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
    const checkAuth = async () => {
      try {
        if (await apiService.isAuthenticated()) {
          const savedUser = await Storage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await apiService.logout();
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
      await apiService.saveTokens(authData.access, authData.refresh);
      setUser(authData.user);
      await Storage.setItem('user', JSON.stringify(authData.user));

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

      await apiService.saveTokens(response.data.access, response.data.refresh);
      setUser(response.data.user);
      await Storage.setItem('user', JSON.stringify(response.data.user));

      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.register({ first_name: firstName, last_name: lastName, email, password });
      return { success: true, message: response.data.detail, username: response.data.username };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const updateProfile = async (data: { bio?: string; two_factor_enabled?: boolean }) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateProfile(data);
      setUser(response.data);
      await Storage.setItem('user', JSON.stringify(response.data));
      return { success: true };
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
      await apiService.requestPasswordReset({ email });
      return { success: true, message: 'Password reset email sent successfully' };
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
      await apiService.confirmPasswordReset({ email, code, new_password: newPassword });
      return { success: true, message: 'Password reset successfully' };
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
      await apiService.saveTokens(response.data.access, response.data.refresh);
      setUser(response.data.user);
      await Storage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernamePreview = async (firstName: string, lastName: string, email: string) => {
    try {
      const response = await apiService.getUsernamePreview({
        first_name: firstName,
        last_name: lastName,
        email
      });
      return { success: true, username: response.data.username };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
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
    getUsernamePreview,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
