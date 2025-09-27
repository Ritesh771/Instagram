import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, Post } from '@/services/api';
import { useAuth } from './AuthContext';

interface PostsContextType {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  addPost: (image: File, caption: string) => Promise<{ success: boolean; message?: string }>;
  deletePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  likePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  unlikePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  refreshPosts: () => Promise<void>;
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
  const { isAuthenticated } = useAuth();

  // Load posts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshPosts();
    } else {
      setPosts([]);
    }
  }, [isAuthenticated]);

  const refreshPosts = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPosts();
      setPosts(response.data);
    } catch (err) {
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      console.error('Failed to fetch posts:', apiError);
    } finally {
      setIsLoading(false);
    }
  };

  const addPost = async (image: File, caption: string) => {
    if (!isAuthenticated) {
      return { success: false, message: 'You must be logged in to create posts' };
    }

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('image', image);
      formData.append('caption', caption);

      const response = await apiService.createPost(formData);
      setPosts(prev => [response.data, ...prev]);
      
      return { success: true };
    } catch (err) {
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deletePost = async (postId: number) => {
    if (!isAuthenticated) {
      return { success: false, message: 'You must be logged in to delete posts' };
    }

    try {
      setIsLoading(true);
      setError(null);

      await apiService.deletePost(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      return { success: true };
    } catch (err) {
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  };

  const likePost = async (postId: number) => {
    if (!isAuthenticated) {
      return { success: false, message: 'You must be logged in to like posts' };
    }

    // Optimistic update
    const originalPosts = [...posts];
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
        : post
    ));

    try {
      const response = await apiService.likePost(postId);
      // Update with server response
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: true, likes_count: response.data.likes_count }
          : post
      ));
      return { success: true };
    } catch (err) {
      // Rollback on error
      setPosts(originalPosts);
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      return { success: false, message: apiError.message };
    }
  };

  const unlikePost = async (postId: number) => {
    if (!isAuthenticated) {
      return { success: false, message: 'You must be logged in to unlike posts' };
    }

    // Optimistic update
    const originalPosts = [...posts];
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, is_liked: false, likes_count: Math.max(0, post.likes_count - 1) }
        : post
    ));

    try {
      const response = await apiService.unlikePost(postId);
      // Update with server response
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: false, likes_count: response.data.likes_count }
          : post
      ));
      return { success: true };
    } catch (err) {
      // Rollback on error
      setPosts(originalPosts);
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      return { success: false, message: apiError.message };
    }
  };

  const value: PostsContextType = {
    posts,
    isLoading,
    error,
    addPost,
    deletePost,
    likePost,
    unlikePost,
    refreshPosts,
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};