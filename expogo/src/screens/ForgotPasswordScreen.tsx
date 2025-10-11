import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Storage } from '@/utils/storage';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const { requestPasswordReset, confirmPasswordReset, isAuthenticated, user } = useAuth();
  const navigation = useNavigation();

  // Initialize step from storage synchronously
  useEffect(() => {
    let isMounted = true;
    
    const initializeStep = async () => {
      try {
        const savedStep = await Storage.getItem('forgot_password_step');
        if (isMounted && savedStep === 'otp') {
          setStep('otp');
        }
      } catch (error) {
        // If there's an error, default to email step
        if (isMounted) {
          setStep('email');
        }
      }
    };
    
    initializeStep();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Log step changes for debugging and persist step to storage
  useEffect(() => {
    // Persist step to storage
    Storage.setItem('forgot_password_step', step);
  }, [step]);

  // Clear step from storage when component unmounts
  useEffect(() => {
    return () => {
      Storage.removeItem('forgot_password_step');
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setStep('otp');
      } else {
        // Format error message to include details if available
        let errorMessage = result.message || 'Failed to send reset email';
        if (result.details) {
          const detailMessages = Object.values(result.details).flat();
          if (detailMessages.length > 0) {
            errorMessage = detailMessages.join(', ');
          }
        }
        setError(errorMessage);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim()) {
      setError('Verification code is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await confirmPasswordReset(email, otpCode, newPassword);

      if (result.success) {
        // Clear the step from storage on successful reset
        Storage.removeItem('forgot_password_step');
        
        Alert.alert(
          'Password Reset Successful',
          'Your password has been reset successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Login' as never);
              },
            },
          ]
        );
      } else {
        // Format error message to include details if available
        let errorMessage = result.message || 'Failed to reset password';
        if (result.details) {
          const detailMessages = Object.values(result.details).flat();
          if (detailMessages.length > 0) {
            errorMessage = detailMessages.join(', ');
          }
        }
        setError(errorMessage);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      setError('');
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow digits for the code field
    value = value.replace(/\D/g, '');
    setOtpCode(value);
    if (error) {
      setError('');
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    if (error) {
      setError('');
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (error) {
      setError('');
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#E1306C', '#F56040']}
              style={styles.logo}
            >
              <Text style={styles.logoText}>📷</Text>
            </LinearGradient>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' 
                ? 'Enter your email address and we\'ll send you a reset code'
                : 'Enter the verification code and your new password'}
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'email' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendCode}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    editable={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChangeText={handleOtpChange}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={handleNewPasswordChange}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleBackToEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonText}>← Back to Email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    padding: 10,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default ForgotPasswordScreen;