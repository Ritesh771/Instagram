import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, Post } from '@/services/api';

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

  const fetchPosts = async () => {
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
    try {
      setIsLoading(true);
      const response = await apiService.createPost(formData);
      setPosts(prevPosts => [response.data, ...prevPosts]);
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
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
    try {
      const response = await apiService.likePost(postId);
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: response.data.likes_count, is_liked: response.data.liked }
            : post
        )
      );
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    }
  };

  const unlikePost = async (postId: number) => {
    try {
      const response = await apiService.unlikePost(postId);
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: response.data.likes_count, is_liked: response.data.liked }
            : post
        )
      );
      return { success: true };
    } catch (error) {
      const apiError = apiService.handleError(error);
      return { success: false, message: apiError.message };
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
