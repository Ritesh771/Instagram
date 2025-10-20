import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '@/services/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook to monitor session validity and automatically logout if session is invalidated
 * Checks every 10 seconds if the current session is still valid
 */
export const useSessionMonitor = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Only check if user is authenticated
        if (!apiService.isAuthenticated()) {
          return;
        }

        // Check if session is still valid
        await apiService.checkSessionValidity();
        // Session is valid, continue
      } catch (error: unknown) {
        // Session is invalid (401 error)
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          console.log('Session invalidated - logging out');
          
          // Clear interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          // Logout and redirect
          await logout();
          navigate('/login', { 
            replace: true,
            state: { message: 'Your session has been ended from another device.' }
          });
        }
      }
    };

    // Start checking session every 10 seconds
    intervalRef.current = setInterval(checkSession, 10000);

    // Also check immediately on mount
    checkSession();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [logout, navigate]);
};
