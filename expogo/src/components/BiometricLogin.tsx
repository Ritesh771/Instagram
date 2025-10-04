import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface BiometricLoginProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const BiometricLogin: React.FC<BiometricLoginProps> = ({ onSuccess, onError }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { biometricLogin, isBiometricAvailable } = useAuth();

  const handleBiometricLogin = async () => {
    setIsAuthenticating(true);

    try {
      // Check if biometrics are available
      const biometricCheck = await isBiometricAvailable();
      if (!biometricCheck.available) {
        const message = 'Biometric authentication is not available on this device.';
        Alert.alert('Biometrics Unavailable', message);
        onError?.(message);
        return;
      }

      // Attempt biometric authentication
      const result = await biometricLogin();

      if (result.success) {
        Alert.alert('Login Successful', 'Welcome back!');
        onSuccess?.();
      } else {
        const message = result.message || 'Biometric authentication failed';
        Alert.alert('Authentication Failed', message);
        onError?.(message);
      }
    } catch (error) {
      const message = 'An error occurred during biometric authentication';
      console.error('Biometric login error:', error);
      Alert.alert('Error', message);
      onError?.(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.biometricButton}
      onPress={handleBiometricLogin}
      disabled={isAuthenticating}
    >
      <View style={styles.biometricContent}>
        <Ionicons
          name="finger-print"
          size={24}
          color={isAuthenticating ? '#ccc' : '#fff'}
          style={styles.biometricIcon}
        />
        <Text style={[styles.biometricText, isAuthenticating && styles.disabledText]}>
          {isAuthenticating ? 'Authenticating...' : 'Login with Biometrics'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  biometricButton: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  biometricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricIcon: {
    marginRight: 10,
  },
  biometricText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#ccc',
  },
});

export default BiometricLogin;