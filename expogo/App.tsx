import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { PostsProvider } from '@/context/PostsContext';
import AppNavigator from '@/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PostsProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </PostsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
