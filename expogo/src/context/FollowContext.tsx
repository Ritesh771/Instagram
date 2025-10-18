import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface FollowStatus {
  isFollowing: boolean;
  isRequested: boolean;
}

interface FollowContextType {
  followStatus: Record<number, FollowStatus>;
  updateFollowStatus: (userId: number, isFollowing: boolean, isRequested: boolean) => void;
  getFollowStatus: (userId: number) => FollowStatus;
  refreshFollowStatus: (userId: number) => Promise<boolean>;
  refreshAllRequestedStatus: () => Promise<void>;
  followUser: (userId: number) => Promise<boolean>;
  unfollowUser: (userId: number) => Promise<boolean>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};

interface FollowProviderProps {
  children: ReactNode;
}

export const FollowProvider: React.FC<FollowProviderProps> = ({ children }) => {
  const [followStatus, setFollowStatus] = useState<Record<number, FollowStatus>>({});
  const { user } = useAuth();

  // Periodically check for updates to requested statuses
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(async () => {
      // Refresh status for all users with pending requests
      const requestedUsers = Object.entries(followStatus)
        .filter(([_, status]) => status.isRequested)
        .map(([userId]) => parseInt(userId));
      
      for (const userId of requestedUsers) {
        try {
          const statusResponse = await apiService.checkFollowStatus(userId);
          // If the user is now following or no longer requested, update the status
          if (statusResponse.data.is_following || !statusResponse.data.is_requested) {
            setFollowStatus(prev => ({
              ...prev,
              [userId]: { 
                isFollowing: statusResponse.data.is_following, 
                isRequested: statusResponse.data.is_requested || false 
              }
            }));
          }
        } catch (error) {
          console.error('Error refreshing follow status:', error);
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user?.id, followStatus]);

  const updateFollowStatus = (userId: number, isFollowing: boolean, isRequested: boolean) => {
    setFollowStatus(prev => ({
      ...prev,
      [userId]: { isFollowing, isRequested }
    }));
  };

  const getFollowStatus = (userId: number) => {
    return followStatus[userId] || { isFollowing: false, isRequested: false };
  };

  // Refresh follow status from the backend
  const refreshFollowStatus = async (userId: number) => {
    try {
      const statusResponse = await apiService.checkFollowStatus(userId);
      updateFollowStatus(userId, statusResponse.data.is_following, statusResponse.data.is_requested || false);
      return true;
    } catch (error) {
      console.error('Error refreshing follow status:', error);
      return false;
    }
  };

  // Refresh status for all users with pending requests
  const refreshAllRequestedStatus = async () => {
    const requestedUsers = Object.entries(followStatus)
      .filter(([_, status]) => status.isRequested)
      .map(([userId]) => parseInt(userId));
    
    for (const userId of requestedUsers) {
      await refreshFollowStatus(userId);
    }
  };

  // Follow a user
  const followUser = async (userId: number) => {
    try {
      const response = await apiService.followUser(userId);
      
      // Check if this was a follow request (for private accounts)
      if (response.data.detail && response.data.detail.includes('request')) {
        // Update context and local state for requested status
        updateFollowStatus(userId, false, true);
        return true;
      } else if (response.data.followed !== undefined) {
        // Public account - successfully followed
        updateFollowStatus(userId, true, false);
        return true;
      } else {
        // Fallback - assume successful follow
        updateFollowStatus(userId, true, false);
        return true;
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      // Even if we get an error, we might still want to update the UI
      // For example, if the user is already following, we might want to show that
      if (error.response && error.response.status === 400) {
        // Handle specific 400 errors
        if (error.response.data.error === 'Already following') {
          // User is already following, update context
          updateFollowStatus(userId, true, false);
          return true;
        } else if (error.response.data.error === 'Follow request already sent') {
          // Follow request already sent, update context
          updateFollowStatus(userId, false, true);
          return true;
        } else if (error.response.data.error === 'Cannot follow yourself') {
          // Cannot follow yourself, no need to update context
          return false;
        }
      }
      return false;
    }
  };

  // Unfollow a user
  const unfollowUser = async (userId: number) => {
    try {
      await apiService.unfollowUser(userId);
      // Update context and local state
      updateFollowStatus(userId, false, false);
      return true;
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      // Even if we get an error, we might still want to update the UI
      // For example, if the user is not following, we might want to show that
      if (error.response && error.response.status === 400) {
        // Handle specific 400 errors
        if (error.response.data.error === 'Not following or requested') {
          // User is not following, update context
          updateFollowStatus(userId, false, false);
          return true;
        }
      }
      return false;
    }
  };

  const value: FollowContextType = {
    followStatus,
    updateFollowStatus,
    getFollowStatus,
    refreshFollowStatus,
    refreshAllRequestedStatus,
    followUser,
    unfollowUser
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
};