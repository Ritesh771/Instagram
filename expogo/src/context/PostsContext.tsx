import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { apiService, Post } from '@/services/api';
import { useAuth } from './AuthContext';

interface PostsContextType {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  addPost: (imageUri: string, caption: string) => Promise<{ success: boolean; message?: string }>;
  deletePost: (postId: number) => Promise<{ success: boolean; message?: string }>;
  updatePost: (postId: number, updates: Partial<Post>) => void;
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

  const addPost = async (imageUri: string, caption: string) => {
    if (!isAuthenticated) {
      return { success: false, message: 'You must be logged in to create posts' };
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[Upload] Starting upload with URI:', imageUri);

      // Extract filename and type
      const uriParts = imageUri.split('/');
      const filename = uriParts[uriParts.length - 1] || 'photo.jpg';
      
      // Create a new FormData instance
      const formData = new FormData();

      // Create file object in the format React Native expects
      const fileToUpload = {
        uri: imageUri,  // Keep original URI as ImagePicker provides it
        type: imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        name: filename
      };

      // Log what we're about to send
      console.log('[Upload] Preparing file:', fileToUpload);

      // Append file first - IMPORTANT: cast the file object for React Native
      formData.append('image', fileToUpload as any);
      
      // Append caption as a string
      formData.append('caption', caption.toString());

      console.log('[Upload] Sending to API...');
      const response = await apiService.createPost(formData);
      
      console.log('[Upload] Success! New post:', response.data.id);
      setPosts(prev => [response.data, ...prev]);
      
      return { success: true };
    } catch (err) {
      console.error('[Upload] Failed:', err);
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

  const updatePost = (postId: number, updates: Partial<Post>) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  const value: PostsContextType = {
    posts,
    isLoading,
    error,
    addPost,
    deletePost,
    updatePost,
    refreshPosts,
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};