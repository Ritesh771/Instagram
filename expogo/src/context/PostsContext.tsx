import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, Post } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface PostsContextType {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  createPost: (formData: FormData) => Promise<{ success: boolean; message?: string }>;
  deletePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  likePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  unlikePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};

interface PostsProviderProps {
  children: ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, disableBiometricForSystemOperation, reEnableBiometricAfterSystemOperation } = useAuth();

  // Reset posts when user changes or logs out
  useEffect(() => {
    if (isAuthenticated && user) {
      // User logged in or switched accounts - fetch fresh posts
      fetchPosts();
    } else {
      // User logged out - clear posts
      setPosts([]);
      setError(null);
    }
  }, [user?.id, isAuthenticated]); // Trigger when user ID changes or auth status changes

  const fetchPosts = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPosts();
      setPosts(response.data);
    } catch (error) {
      const apiError = apiService.handleError(error);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createPost = async (formData: FormData) => {
    if (!isAuthenticated || !user) {
      return { success: false, message: 'You must be logged in to create posts' };
    }

    try {
      setIsLoading(true);
      
      // Aggressively disable biometric checks during post creation
      disableBiometricForSystemOperation();
      
      // Add a small delay to ensure the disable takes effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await apiService.createPost(formData);
      setPosts(prevPosts => [response.data, ...prevPosts]);
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      
      // If it's a network error, provide a more helpful message
      if (apiError.message.includes('Network Error') || apiError.message.includes('connect')) {
        return { success: false, message: 'Network connection failed. Please check your internet connection and try again.' };
      }
      
      // If it's an authentication error, suggest re-authentication
      if (apiError.message.includes('Unauthorized') || apiError.message.includes('401')) {
        // Try to re-enable biometric checks and suggest re-auth
        reEnableBiometricAfterSystemOperation();
        return { success: false, message: 'Authentication expired. Please re-authenticate and try again.' };
      }
      
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
      // Re-enable biometric checks after post creation attempt
      reEnableBiometricAfterSystemOperation(5000); // Re-enable after 5 seconds
    }
  };

  const deletePost = async (postId: number) => {
    try {
      await apiService.deletePost(postId);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    }
  };

  const likePost = async (postId: number) => {
    if (!isAuthenticated || !user) {
      return { success: false, message: 'You must be logged in to like posts' };
    }

    // Optimistic update
    const originalPosts = [...posts];
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
          : post
      )
    );

    try {
      const response = await apiService.likePost(postId);
      
      // Update with server response to ensure accuracy
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: response.data.likes_count, is_liked: response.data.liked }
            : post
        )
      );
      return { success: true };
    } catch (error) {
      // Revert optimistic update on error
      setPosts(originalPosts);
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    }
  };

  const unlikePost = async (postId: number) => {
    if (!isAuthenticated || !user) {
      return { success: false, message: 'You must be logged in to unlike posts' };
    }

    // Optimistic update
    const originalPosts = [...posts];
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, is_liked: false, likes_count: Math.max(0, post.likes_count - 1) }
          : post
      )
    );

    try {
      const response = await apiService.unlikePost(postId);
      
      // Update with server response to ensure accuracy
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: response.data.likes_count, is_liked: response.data.liked }
            : post
        )
      );
      return { success: true };
    } catch (error) {
      // Revert optimistic update on error
      setPosts(originalPosts);
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    }
  };

  // Remove the old useEffect that ran fetchPosts on mount
  // since we now handle it in the user change effect

  const value: PostsContextType = {
    posts,
    isLoading,
    error,
    fetchPosts,
    createPost,
    deletePost,
    likePost,
    unlikePost,
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};
