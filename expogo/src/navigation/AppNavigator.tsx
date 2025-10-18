import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';
import { Storage } from '@/utils/storage';

// Auth Screens
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import BiometricLockScreen from '@/screens/BiometricLockScreen';

// Main App Screens  
import TabNavigator from './TabNavigator';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FollowersScreen from '@/screens/FollowersScreen';
import FollowingScreen from '@/screens/FollowingScreen';
import PostViewScreen from '@/screens/PostViewScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import SearchScreen from '@/screens/SearchScreen';
import DevicesScreen from '@/screens/DevicesScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isBiometricLocked } = useAuth();
  const [isRegistrationInProgress, setIsRegistrationInProgress] = useState(false);

  // Check for ongoing registration to maintain register screen
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const savedStep = await Storage.getItem('registration_step');
        const wasInProgress = isRegistrationInProgress;
        const nowInProgress = savedStep === 'verify';
        
        if (wasInProgress !== nowInProgress) {
          setIsRegistrationInProgress(nowInProgress);
        }
      } catch (error) {
        setIsRegistrationInProgress(false);
      }
    };
    
    // Check immediately
    checkRegistrationStatus();
    
    // Check frequently during loading or when registration might be happening
    const interval = setInterval(checkRegistrationStatus, 500); // Check every 500ms for responsiveness
    return () => clearInterval(interval);
  }, [isLoading, isRegistrationInProgress]);

  // Instead of returning null during loading, let's keep the previous screen
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
              <Stack.Screen 
                name="UserProfile" 
                component={ProfileScreen}
                options={{ 
                  title: 'Profile',
                  headerShown: true
                }} 
              />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Followers" component={FollowersScreen} />
              <Stack.Screen name="Following" component={FollowingScreen} />
              <Stack.Screen name="PostView" component={PostViewScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="DevicesScreen" component={DevicesScreen}  options={{ headerShown: true, title: 'Logged-in Devices' }} />
            </>
          )
        ) : (
          // Auth Screens - matches web auth flow
          // If registration is in progress, show Register screen first to maintain OTP flow
          isRegistrationInProgress ? (
            <>
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ 
                  headerShown: false,
                  animationTypeForReplace: 'push' // Better animation handling
                }} 
              />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
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
            </>
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;