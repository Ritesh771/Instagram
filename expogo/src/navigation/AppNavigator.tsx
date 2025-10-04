import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';

// Auth Screens
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import BiometricLockScreen from '@/screens/BiometricLockScreen';

// Main App Screens  
import TabNavigator from './TabNavigator';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FollowersScreen from '@/screens/FollowersScreen';
import FollowingScreen from '@/screens/FollowingScreen';
import PostViewScreen from '@/screens/PostViewScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isBiometricLocked } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('=== AppNavigator State ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('isBiometricLocked:', isBiometricLocked);
  }, [isAuthenticated, isLoading, isBiometricLocked]);

  if (isLoading) {
    console.log('AppNavigator: Showing loading state');
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          isBiometricLocked ? (
            // Show biometric lock screen
            <Stack.Screen name="BiometricLock" component={BiometricLockScreen} />
          ) : (
            // Main App - matches web routing to /feed after login
            <>
              <Stack.Screen 
                name="Main" 
                component={TabNavigator} 
                options={{ 
                  headerShown: false,
                  animationTypeForReplace: 'push' // Better animation handling
                }} 
              />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Followers" component={FollowersScreen} />
              <Stack.Screen name="Following" component={FollowingScreen} />
              <Stack.Screen name="PostView" component={PostViewScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
            </>
          )
        ) : (
          // Auth Screens - matches web auth flow
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ 
                headerShown: false,
                animationTypeForReplace: 'push' // Better animation handling
              }} 
            />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
