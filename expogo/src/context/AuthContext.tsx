import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiService, User, AuthResponse } from '@/services/api';
import { Storage } from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricLocked: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  biometricLogin: () => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  verify2FA: (username: string, code: string) => Promise<{ success: boolean; message?: string }>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<{ success: boolean; message?: string; username?: string }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  getUsernamePreview: (firstName: string, lastName: string, email: string) => Promise<{ success: boolean; username?: string; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (data: { bio?: string; two_factor_enabled?: boolean }) => Promise<{ success: boolean; message?: string }>;
  enableBiometricLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  disableBiometricLogin: () => Promise<{ success: boolean; message?: string }>;
  isBiometricAvailable: () => Promise<{ available: boolean; types: any[] }>;
  unlockBiometricLock: () => void;
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
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [lastBackgroundTime, setLastBackgroundTime] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (await apiService.isAuthenticated()) {
          const savedUser = await Storage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
            // Check if biometrics should be required
            await checkBiometricLockRequirement();
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

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Track when app goes to background
        setLastBackgroundTime(Date.now());
      } else if (nextAppState === 'active' && user) {
        // App came to foreground, check if biometric lock is needed
        // Skip biometric check if we just returned quickly (likely from camera/gallery)
        const timeSinceBackground = lastBackgroundTime ? Date.now() - lastBackgroundTime : Infinity;
        if (timeSinceBackground > 30000) { // 30 seconds threshold
          await checkBiometricLockRequirement();
        } else {
          console.log('Skipping biometric lock check - returned quickly from background');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, lastBackgroundTime]);

  const checkBiometricLockRequirement = async () => {
    try {
      // Check if biometric credentials exist locally
      // For app lock, we only need local credentials - backend validation happens during authentication
      const credentials = await apiService.getBiometricCredentials();

      if (credentials) {
        // Biometric credentials exist locally, lock the app
        setIsBiometricLocked(true);
        console.log('App locked - biometric authentication required');
      } else {
        // No local biometric credentials, no lock needed
        setIsBiometricLocked(false);
      }
    } catch (error) {
      console.error('Error checking biometric lock requirement:', error);
      setIsBiometricLocked(false);
    }
  };

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
      
      // Unlock biometric lock on successful password login
      setIsBiometricLocked(false);

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
    console.log('Logging out, clearing session and biometric settings');
    await apiService.disableBiometricLoginLocally();
    await apiService.logout();
    setUser(null);
    setIsBiometricLocked(false);
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

  const biometricLogin = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.biometricLogin();

      if (result.success) {
        // Unlock the biometric lock
        setIsBiometricLocked(false);
        console.log('Biometric authentication successful, app unlocked');
      }

      return result;
    } catch (error) {
      return { success: false, message: 'Biometric login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const unlockBiometricLock = () => {
    setIsBiometricLocked(false);
    console.log('Biometric lock manually unlocked');
  };

  const enableBiometricLogin = async (username: string, password: string) => {
    try {
      console.log('Enabling biometric login for user:', username);
      
      // First save credentials locally for biometric authentication
      await apiService.saveBiometricCredentials(username, password);
      
      // Then enable in backend
      const result = await apiService.enableBiometricLogin();
      if (!result.success) {
        // If backend fails, clean up local storage
        await apiService.disableBiometricLoginLocally();
        return result;
      }
      
      console.log('Biometric login enabled successfully');
      return { success: true, message: 'Biometric login enabled' };
    } catch (error) {
      console.error('Failed to enable biometric login:', error);
      return { success: false, message: 'Failed to enable biometric login' };
    }
  };

  const disableBiometricLogin = async () => {
    try {
      console.log('Disabling biometric login...');
      
      // Disable locally first
      await apiService.disableBiometricLoginLocally();
      
      // Then disable in backend
      const result = await apiService.disableBiometricLogin();
      return result;
    } catch (error) {
      console.error('Failed to disable biometric login:', error);
      return { success: false, message: 'Failed to disable biometric login' };
    }
  };

  const isBiometricAvailable = async () => {
    return await apiService.isBiometricAvailable();
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
    isBiometricLocked,
    login,
    biometricLogin,
    verify2FA,
    register,
    verifyOTP,
    getUsernamePreview,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    enableBiometricLogin,
    disableBiometricLogin,
    isBiometricAvailable,
    unlockBiometricLock,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
