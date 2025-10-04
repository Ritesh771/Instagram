import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BiometricLockScreen: React.FC = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { biometricLogin, logout, isBiometricAvailable } = useAuth();

  useEffect(() => {
    // Auto-trigger biometric authentication when screen mounts
    handleBiometricAuth();
  }, []);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);

    try {
      // Check if biometrics are available
      const biometricCheck = await isBiometricAvailable();
      if (!biometricCheck.available) {
        Alert.alert(
          'Biometrics Unavailable',
          'Biometric authentication is not available on this device. Please login with password.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      // Attempt biometric authentication
      const result = await biometricLogin();

      if (!result.success) {
        Alert.alert(
          'Authentication Failed',
          result.message || 'Biometric authentication failed. Please try again or use password login.',
          [
            { text: 'Try Again', onPress: handleBiometricAuth },
            { text: 'Use Password', style: 'destructive', onPress: () => logout() }
          ]
        );
      }
      // If successful, biometricLogin will update the auth state and navigate away
    } catch (error) {
      Alert.alert('Error', 'An error occurred during biometric authentication.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUsePassword = () => {
    Alert.alert(
      'Use Password Login',
      'This will log you out and take you to the password login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={80} color="#007AFF" />
        </View>

        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>
          {isAuthenticating
            ? 'Authenticating...'
            : 'Use your biometric authentication to unlock the app'
          }
        </Text>

        {isAuthenticating ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleBiometricAuth}
              disabled={isAuthenticating}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.passwordButton}
              onPress={handleUsePassword}
            >
              <Text style={styles.passwordButtonText}>Use Password Instead</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 24,
  },
  loader: {
    marginTop: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passwordButton: {
    padding: 10,
  },
  passwordButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default BiometricLockScreen;