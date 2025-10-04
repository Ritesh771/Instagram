import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiService, User, AuthResponse } from '@/services/api';
import { Storage } from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricLocked: boolean;
  pendingOtpData: { username: string; message: string } | null;
  login: (username: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string; details?: Record<string, string[]> }>;
  verify2FA: (username: string, code: string) => Promise<{ success: boolean; message?: string; details?: Record<string, string[]> }>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<{ success: boolean; message?: string; username?: string; details?: Record<string, string[]> }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; message?: string; details?: Record<string, string[]> }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; details?: Record<string, string[]> }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string; details?: Record<string, string[]> }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (data: { bio?: string; two_factor_enabled?: boolean; biometric_enabled?: boolean }) => Promise<{ success: boolean; message?: string; details?: Record<string, string[]> }>;
  getUsernamePreview: (firstName: string, lastName: string, email: string) => Promise<{ success: boolean; username?: string; message?: string }>;
  // Biometric methods
  biometricLogin: () => Promise<{ success: boolean; message?: string }>;
  enableBiometricLogin: () => Promise<{ success: boolean; message?: string }>;
  disableBiometricLogin: () => Promise<{ success: boolean; message?: string }>;
  isBiometricAvailable: () => Promise<{ available: boolean; types: string[] }>;
  unlockBiometricLock: () => void;
  triggerBiometricCheck: () => Promise<void>;
  clearPendingOtp: () => void;
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
  const [pendingOtpData, setPendingOtpData] = useState<{ username: string; message: string } | null>(null);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      try {
        const isAuth = await apiService.isAuthenticated();
        console.log('Initial auth check:', isAuth);
        
        if (isAuth) {
          // Try to get user data from storage first
          const savedUser = await Storage.getItem('user');
          console.log('Saved user from storage:', savedUser);
          
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            console.log('User data loaded:', userData);
            console.log('User biometric enabled:', userData.biometric_enabled);
            
            // Always check if biometric lock should be applied on app start
            // This ensures biometric lock works even on fresh app launch
            if (userData.biometric_enabled) {
              console.log('User has biometric enabled, checking lock requirement on startup...');
              setTimeout(() => {
                checkBiometricLockRequirement();
              }, 500); // Small delay to ensure everything is initialized
            }
          }
        }
      } catch (error) {
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
      console.log('App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Track when app goes to background
        const backgroundTime = Date.now();
        setLastBackgroundTime(backgroundTime);
        console.log('App went to background at:', new Date(backgroundTime).toLocaleTimeString());
      } else if (nextAppState === 'active' && user) {
        // App came to foreground, always check if biometric lock is needed
        console.log('App became active, user exists:', !!user);
        console.log('User biometric enabled:', user?.biometric_enabled);
        
        // Always check biometric lock requirement when app becomes active
        // No time threshold - ask every time user returns to app
        if (lastBackgroundTime) {
          console.log('App returned from background, checking biometric lock requirement...');
          await checkBiometricLockRequirement();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, lastBackgroundTime]);

  const checkBiometricLockRequirement = async () => {
    try {
      console.log('=== Checking biometric lock requirement ===');
      console.log('User:', user);
      console.log('User biometric enabled:', user?.biometric_enabled);
      
      // Check if user has biometric authentication enabled
      if (user?.biometric_enabled) {
        console.log('User has biometric enabled, checking device availability...');
        
        // Check if biometrics are available on device
        const biometricCheck = await apiService.isBiometricAvailable();
        console.log('Biometric availability check:', biometricCheck);
        
        if (biometricCheck.available) {
          console.log('Setting biometric lock to TRUE');
          setIsBiometricLocked(true);
          console.log('Biometric lock enabled - user must authenticate');
        } else {
          // Biometrics not available but user has it enabled - disable it
          console.log('Biometrics not available, disabling biometric setting');
          if (user) {
            const updatedUser = { ...user, biometric_enabled: false };
            setUser(updatedUser);
            await Storage.setItem('user', JSON.stringify(updatedUser));
          }
          setIsBiometricLocked(false);
        }
      } else {
        console.log('User does not have biometric enabled, setting lock to FALSE');
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
        // Set pending OTP data for the LoginScreen to use
        setPendingOtpData({ username, message: response.data.detail });
        return { success: false, requires2FA: true, message: response.data.detail };
      }
      
      // Also check for 'detail' field that might indicate 2FA requirement
      if (response.data.detail && typeof response.data.detail === 'string' && 
          (response.data.detail.toLowerCase().includes('2fa') || 
           response.data.detail.toLowerCase().includes('verification'))) {
        // Set pending OTP data for the LoginScreen to use
        setPendingOtpData({ username, message: response.data.detail });
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const apiError = apiService.handleError(error);
      return { 
        success: false, 
        message: errorMessage.includes('Network Error') 
          ? 'Cannot connect to server. Please check your network connection and server status.' 
          : apiError.message, 
        details: apiError.details 
      };
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
      
      // Clear pending OTP data on successful verification
      setPendingOtpData(null);
      
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
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setIsBiometricLocked(false);
    setPendingOtpData(null); // Clear pending OTP data on logout
  };

  const clearPendingOtp = () => {
    setPendingOtpData(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      Storage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateProfile = async (data: { bio?: string; two_factor_enabled?: boolean; biometric_enabled?: boolean }) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateProfile(data);
      
      // If biometric_enabled is being updated, handle the local state
      let updatedUser = response.data;
      if ('biometric_enabled' in data) {
        updatedUser = { ...response.data, biometric_enabled: data.biometric_enabled };
      }
      
      setUser(updatedUser);
      await Storage.setItem('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
    }
  };

  // Biometric methods
  const biometricLogin = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.authenticateWithBiometrics();
      if (result.success) {
        // Unlock the biometric lock
        setIsBiometricLocked(false);
        console.log('Biometric authentication successful, app unlocked');
        
        // Get user data from storage (already authenticated)
        const savedUser = await Storage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
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

  const enableBiometricLogin = async () => {
    try {
      setIsLoading(true);

      // Check if biometrics are available
      const biometricCheck = await isBiometricAvailable();
      if (!biometricCheck.available) {
        return { success: false, message: 'Biometric authentication is not available on this device' };
      }

      // Register biometric credential
      const biometricResult = await apiService.registerBiometricCredential(user?.username || '');
      if (!biometricResult.success) {
        return biometricResult;
      }

      // Update profile with biometric enabled
      const profileResult = await updateProfile({ biometric_enabled: true });
      if (!profileResult.success) {
        return profileResult;
      }

      return { success: true, message: 'Biometric login enabled successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to enable biometric login' };
    } finally {
      setIsLoading(false);
    }
  };

  const disableBiometricLogin = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.disableBiometricLogin();
      if (result.success) {
        // Update profile with biometric disabled
        await updateProfile({ biometric_enabled: false });
        
        // Clear biometric data
        await Storage.removeItem('biometric_enabled');
        await Storage.removeItem('biometric_username');
        await Storage.removeItem('biometric_credential_id');
      }
      return result;
    } catch (error) {
      return { success: false, message: 'Failed to disable biometric login' };
    } finally {
      setIsLoading(false);
    }
  };

  const isBiometricAvailable = async () => {
    return await apiService.isBiometricAvailable();
  };

  const requestPasswordReset = async (email: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.requestPasswordReset({ email });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.confirmPasswordReset({ email, code, new_password: newPassword });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.verifyOTP({ email, code });
      
      // Check if the response includes authentication tokens (user gets logged in after verification)
      if (response.data.access && response.data.refresh && response.data.user) {
        // User is logged in after verification
        await apiService.saveTokens(response.data.access, response.data.refresh);
        setUser(response.data.user);
        await Storage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
    }
  };

  // Add a manual trigger for testing
  const triggerBiometricCheck = async () => {
    console.log('Manual biometric check triggered');
    await checkBiometricLockRequirement();
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
    pendingOtpData,
    login,
    verify2FA,
    register,
    verifyOTP,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    updateUser,
    updateProfile,
    getUsernamePreview,
    biometricLogin,
    enableBiometricLogin,
    disableBiometricLogin,
    isBiometricAvailable,
    unlockBiometricLock,
    triggerBiometricCheck,
    clearPendingOtp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
