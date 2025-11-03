import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiService, User, AuthResponse } from '@/services/api';
import { Storage } from '@/utils/storage';

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    _biometricReEnableTimeout: NodeJS.Timeout | null;
  }
}

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
  // Biometric check control methods
  disableBiometricCheckTemporarily: (duration?: number) => void;
  enableBiometricCheck: () => void;
  disableBiometricForSystemOperation: () => void;
  reEnableBiometricAfterSystemOperation: (delay?: number) => void;
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
  const [isRegistrationInProgress, setIsRegistrationInProgress] = useState(false);
  const [biometricCheckEnabled, setBiometricCheckEnabled] = useState(true); // Allow temporary disabling

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      try {
        // Remove excessive logging
        const isAuth = await apiService.isAuthenticated();
        
        if (isAuth) {
          // Try to get user data from storage first
          const savedUser = await Storage.getItem('user');
          
          if (savedUser) {
            let userData = JSON.parse(savedUser);
            setUser(userData);
            
            // Check biometric lock requirement before setting loading to false
            // This ensures the lock screen shows immediately on app start if biometric is enabled
            const biometricCheck = await apiService.isBiometricAvailable();
            console.log('Biometric availability check on app start:', biometricCheck);
            
            if (biometricCheck.available) {
              // If biometrics are available, ensure biometric is enabled for app lock
              if (!userData.biometric_enabled) {
                console.log('Biometrics available but not enabled, enabling automatically for app lock');
                try {
                  // Try to update profile, but don't fail if it doesn't work
                  await apiService.updateProfile({ biometric_enabled: true });
                  // Update local userData
                  userData.biometric_enabled = true;
                  // Update storage
                  await Storage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                  console.error('Failed to enable biometric automatically on app start:', error);
                  // Still enable locally for this session
                  userData.biometric_enabled = true;
                }
              }
              
              console.log('Setting biometric lock on app start');
              setIsBiometricLocked(true);
            } else {
              console.log('Biometrics not available on device');
              // If biometrics were enabled but no longer available, disable
              if (userData.biometric_enabled) {
                userData.biometric_enabled = false;
                await Storage.setItem('user', JSON.stringify(userData));
              }
              setIsBiometricLocked(false);
            }
            
            // Update user state with any changes
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error during auth check:', error);
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
      if (nextAppState === 'background') {
        // Only track when app truly goes to background (not just inactive)
        const backgroundTime = Date.now();
        setLastBackgroundTime(backgroundTime);
      } else if (nextAppState === 'active' && user && lastBackgroundTime) {
        // App came to foreground from background - check if we need biometric lock
        const timeInBackground = Date.now() - lastBackgroundTime;
        
        // Trigger biometric lock when app returns from background
        if (user?.biometric_enabled && biometricCheckEnabled) {
          console.log('App returned from background, checking biometric lock...');
          await checkBiometricLockRequirement();
        }
        
        // Reset background time
        setLastBackgroundTime(null);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, lastBackgroundTime, biometricCheckEnabled]);

  const checkBiometricLockRequirement = async () => {
    try {
      console.log('Checking biometric lock requirement...');
      // Check if user has biometric authentication enabled
      if (user?.biometric_enabled) {
        console.log('User has biometric enabled, checking device availability...');
        // Check if biometrics are available on device
        const biometricCheck = await apiService.isBiometricAvailable();
        console.log('Biometric check result:', biometricCheck);
        
        if (biometricCheck.available) {
          console.log('Biometrics available, locking app');
          setIsBiometricLocked(true);
        } else {
          console.log('Biometrics not available on device');
          // Biometrics not available but user has it enabled - disable it
          if (user) {
            const updatedUser = { ...user, biometric_enabled: false };
            setUser(updatedUser);
            await Storage.setItem('user', JSON.stringify(updatedUser));
          }
          setIsBiometricLocked(false);
        }
      } else {
        console.log('User does not have biometric enabled');
        setIsBiometricLocked(false);
      }
    } catch (error) {
      console.error('Error in checkBiometricLockRequirement:', error);
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
      
      // Check if biometrics are available and enable app lock automatically
      const biometricCheck = await apiService.isBiometricAvailable();
      if (biometricCheck.available && !authData.user.biometric_enabled) {
        console.log('Biometrics available, enabling app lock automatically');
        try {
          await updateProfile({ biometric_enabled: true });
        } catch (error) {
          console.error('Failed to enable biometric automatically:', error);
        }
      }
      
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
      
      // Check if biometrics are available and enable app lock automatically
      const biometricCheck = await apiService.isBiometricAvailable();
      if (biometricCheck.available && !response.data.user.biometric_enabled) {
        console.log('Biometrics available, enabling app lock automatically');
        try {
          await updateProfile({ biometric_enabled: true });
        } catch (error) {
          console.error('Failed to enable biometric automatically:', error);
        }
      }
      
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
      setIsRegistrationInProgress(true); // Mark registration as in progress
      console.log('AuthContext: Starting registration API call...');
      const response = await apiService.register({ first_name: firstName, last_name: lastName, email, password });
      console.log('AuthContext: Registration API success:', response.data);
      
      return { success: true, message: response.data.detail, username: response.data.username };
    } catch (error) {
      console.log('AuthContext: Registration API error:', error);
      const apiError = apiService.handleError(error);
      console.log('AuthContext: Processed error:', apiError);
      setIsRegistrationInProgress(false); // Reset on error
      return { success: false, message: apiError.message, details: apiError.details };
    } finally {
      setIsLoading(false);
      console.log('AuthContext: Registration API call completed');
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setIsBiometricLocked(false);
    setIsRegistrationInProgress(false); // Reset registration state on logout
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
  const unlockBiometricLock = () => {
    setIsBiometricLocked(false);
    // Also reset background time to prevent immediate re-trigger
    setLastBackgroundTime(null);
    // Re-enable biometric checks
    setBiometricCheckEnabled(true);
    console.log('Biometric lock manually unlocked and background time reset');
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
      const response = await apiService.requestPasswordReset({ email });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
    }
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    try {
      const response = await apiService.confirmPasswordReset({ email, code, new_password: newPassword });
      return { success: true, message: response.data.detail };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message, details: apiError.details };
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
        
        // Check if biometrics are available and enable app lock automatically
        const biometricCheck = await apiService.isBiometricAvailable();
        if (biometricCheck.available && !response.data.user.biometric_enabled) {
          console.log('Biometrics available, enabling app lock automatically');
          try {
            await updateProfile({ biometric_enabled: true });
          } catch (error) {
            console.error('Failed to enable biometric automatically:', error);
          }
        }
        
        // Clear registration state after successful verification
        setIsRegistrationInProgress(false);
        console.log('AuthContext: OTP verification successful - user authenticated and registration state cleared');
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

  // Biometric check control methods
  const disableBiometricCheckTemporarily = (duration: number = 30000) => { // Default 30 seconds
    console.log('Disabling biometric check temporarily for', duration, 'ms');
    setBiometricCheckEnabled(false);
    
    // If currently locked, unlock it
    if (isBiometricLocked) {
      setIsBiometricLocked(false);
      setLastBackgroundTime(null);
      console.log('Unlocking current biometric lock due to temporary disable');
    }
    
    // Re-enable after the specified duration
    setTimeout(() => {
      console.log('Re-enabling biometric check after', duration, 'ms');
      setBiometricCheckEnabled(true);
    }, duration);
  };

  const enableBiometricCheck = () => {
    console.log('Enabling biometric check');
    setBiometricCheckEnabled(true);
    // Also reset background time to prevent immediate re-trigger
    setLastBackgroundTime(null);
  };

  // New method to completely disable biometric checks for system operations
  const disableBiometricForSystemOperation = () => {
    console.log('Disabling biometric for system operation');
    setBiometricCheckEnabled(false);
  };

  // New method to re-enable biometric checks after system operations
  const reEnableBiometricAfterSystemOperation = (delay: number = 1000) => {
    console.log('Scheduling biometric re-enable after system operation with delay:', delay);
    
    // Set new timeout
    setTimeout(() => {
      console.log('Re-enabling biometric check after system operation');
      setBiometricCheckEnabled(true);
    }, delay);
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

  // Biometric login function
  const biometricLogin = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting biometric login...');
      
      // Authenticate with biometrics
      const result = await apiService.authenticateWithBiometrics();
      console.log('Biometric authentication result:', result);
      
      if (result.success) {
        // For biometric login, we need to get the user data from storage or API
        // Since we don't have tokens from biometric auth alone, we'll just unlock the UI
        setIsBiometricLocked(false);
        setLastBackgroundTime(null); // Reset background time
        
        return { success: true, message: 'Biometric authentication successful' };
      } else {
        return { success: false, message: result.message || 'Biometric authentication failed' };
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
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
    // Biometric methods
    biometricLogin,
    enableBiometricLogin,
    disableBiometricLogin,
    isBiometricAvailable,
    unlockBiometricLock,
    triggerBiometricCheck,
    clearPendingOtp,
    // Biometric check control methods
    disableBiometricCheckTemporarily,
    enableBiometricCheck,
    disableBiometricForSystemOperation,
    reEnableBiometricAfterSystemOperation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
