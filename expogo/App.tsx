import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { PostsProvider } from '@/context/PostsContext';
import { SecurityProvider } from '@/context/SecurityContext';
import AppNavigator from '@/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PostsProvider>
          <SecurityProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </SecurityProvider>
        </PostsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

registerRootComponent(App);
