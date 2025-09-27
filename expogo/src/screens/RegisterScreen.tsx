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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';

const RegisterScreen: React.FC = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [generatedUsername, setGeneratedUsername] = useState<string>('');
  const [finalUsername, setFinalUsername] = useState<string>('');
  const [otpData, setOtpData] = useState({
    email: '',
    code: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register, verifyOTP, getUsernamePreview, isAuthenticated } = useAuth();
  const navigation = useNavigation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate('Feed' as never);
    }
  }, [isAuthenticated, navigation]);

  // Update username preview when names change
  useEffect(() => {
    const updateUsernamePreview = async () => {
      if (formData.firstName.trim()) {
        const result = await getUsernamePreview(formData.firstName, formData.lastName, formData.email);
        if (result.success && result.username) {
          setGeneratedUsername(result.username);
        }
      } else {
        setGeneratedUsername('');
      }
    };

    updateUsernamePreview();
  }, [formData.firstName, formData.lastName, formData.email, getUsernamePreview]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await register(formData.firstName, formData.lastName, formData.email, formData.password);

    if (result.success) {
      setFinalUsername(result.username || generatedUsername);
      setOtpData({ ...otpData, email: formData.email });
      setStep('verify');
      Alert.alert('Registration Successful', result.message || 'Please check your email for verification code.');
    } else {
      Alert.alert('Registration Failed', result.message);
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otpData.code.trim()) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(otpData.email, otpData.code);

    if (result.success) {
      Alert.alert('Account Verified', 'Your account has been verified successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Feed' as never),
        },
      ]);
    } else {
      Alert.alert('Verification Failed', result.message);
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOtpChange = (field: string, value: string) => {
    // For code field, only allow digits
    if (field === 'code') {
      value = value.replace(/\D/g, '');
    }

    setOtpData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
              {step === 'register' ? 'Join InstaPics' : 'Verify Email'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'register'
                ? 'Create your account to start sharing'
                : `Verify your email to complete registration. Your username will be @${finalUsername}`
              }
            </Text>
          </View>

          {step === 'register' ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  autoCapitalize="words"
                />
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  autoCapitalize="words"
                />
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {generatedUsername && (
                <View style={styles.usernamePreview}>
                  <Text style={styles.label}>Your Username</Text>
                  <View style={styles.usernameBox}>
                    <Text style={styles.usernameText}>@{generatedUsername}</Text>
                  </View>
                  <Text style={styles.usernameHint}>
                    This will be your username.
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput, errors.code && styles.inputError]}
                  placeholder="Enter 6-digit code"
                  value={otpData.code}
                  onChangeText={(value) => handleOtpChange('code', value)}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                />
                {errors.code && (
                  <Text style={styles.errorText}>{errors.code}</Text>
                )}
                <Text style={styles.codeHint}>
                  Check your email for the verification code
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Verifying...' : 'Verify Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('register')}
              >
                <Text style={styles.backButtonText}>← Back to Registration</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'register' && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login' as never)}
            >
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          )}
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
  optional: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  codeInput: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 5,
  },
  codeHint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  usernamePreview: {
    marginBottom: 20,
  },
  usernameBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  usernameHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
    marginTop: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  linkButton: {
    alignItems: 'center',
    padding: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default RegisterScreen;
