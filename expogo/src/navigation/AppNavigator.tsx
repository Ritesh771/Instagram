import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';

// Auth Screens
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import Verify2FAScreen from '@/screens/Verify2FAScreen';
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

  if (isLoading) {
    // You can create a proper LoadingScreen component
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
            // Main App
            <>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Followers" component={FollowersScreen} />
              <Stack.Screen name="Following" component={FollowingScreen} />
              <Stack.Screen name="PostView" component={PostViewScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
            </>
          )
        ) : (
          // Auth Screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Verify2FA" component={Verify2FAScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
