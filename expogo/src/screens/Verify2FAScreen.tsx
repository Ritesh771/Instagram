import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

interface Verify2FAScreenProps {
  navigation: any;
  route: {
    params: {
      username: string;
    };
  };
}

const Verify2FAScreen = ({ navigation, route }: Verify2FAScreenProps) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { verify2FA } = useAuth();
  const { username } = route.params;

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Verification code is required');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const result = await verify2FA(username, code);
    
    if (result.success) {
      Alert.alert(
        "Success!",
        "You have been successfully logged in.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigation will be handled by AppNavigator based on authentication state
            },
          },
        ]
      );
    } else {
      setError(result.message || 'Verification failed');
      Alert.alert("Verification Failed", result.message);
    }
    setIsLoading(false);
  };

  const handleResendCode = () => {
    Alert.alert(
      "Resend Code",
      "Please try logging in again to receive a new verification code.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate('Login'),
        },
      ]
    );
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa', '#e9ecef']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#E1306C', '#F56040', '#F77737']}
                style={styles.logo}
              >
                <Ionicons name="shield-checkmark" size={40} color="white" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Two-Factor Authentication</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to your email address
            </Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* OTP Input */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChangeText={(value) => {
                    setCode(value);
                    if (error) setError('');
                  }}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />
                <Text style={styles.otpHint}>
                  Check your email for the verification code
                </Text>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#E1306C', '#F56040']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleResendCode}
              >
                <Text style={styles.linkText}>Didn't receive the code? Resend</Text>
              </TouchableOpacity>

              {/* Back to Login */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleBackToLogin}
              >
                <View style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color="#E1306C" />
                  <Text style={styles.linkText}>Back to login</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 30,
  },
  otpInput: {
    height: 60,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 24,
    backgroundColor: '#ffffff',
    color: '#212529',
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  otpHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    height: 50,
    borderRadius: 25,
    marginBottom: 20,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginBottom: 15,
  },
  linkText: {
    color: '#E1306C',
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Verify2FAScreen;
