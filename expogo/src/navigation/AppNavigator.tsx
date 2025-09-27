import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';

// Import screens
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import Verify2FAScreen from '@/screens/Verify2FAScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import BiometricLockScreen from '@/screens/BiometricLockScreen';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isBiometricLocked } = useAuth();

  if (isLoading) {
    // You can create a loading screen component
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
            // Show main app
            <Stack.Screen name="Main" component={TabNavigator} />
          )
        ) : (
          // Show auth screens
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
