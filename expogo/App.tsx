import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider } from '@/context/AuthContext';
import { PostsProvider } from '@/context/PostsContext';
import { FollowProvider } from '@/context/FollowContext';
import AppNavigator from '@/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Prevent screenshots and screen recordings on native platforms only
    if (Platform.OS !== 'web') {
      ScreenCapture.preventScreenCaptureAsync();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PostsProvider>
          <FollowProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </FollowProvider>
        </PostsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}