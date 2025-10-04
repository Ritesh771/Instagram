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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { Storage } from '@/utils/storage';

const RegisterScreen: React.FC = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [isStepLocked, setIsStepLocked] = useState(false);
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

  console.log('RegisterScreen RENDER: step =', step);
  console.log('RegisterScreen RENDER: UI will show', step === 'register' ? 'REGISTRATION FORM' : 'OTP VERIFICATION');

  // Initialize step from storage on component mount
  useEffect(() => {
    const initializeStep = async () => {
      try {
        const savedStep = await Storage.getItem('registration_step');
        const savedOtpData = await Storage.getItem('registration_otp_data');
        const savedUsername = await Storage.getItem('registration_username');
        
        if (savedStep === 'verify' && savedOtpData && savedUsername) {
          console.log('RegisterScreen: Restoring OTP step from storage');
          setIsStepLocked(true);
          setStep('verify');
          setOtpData(JSON.parse(savedOtpData));
          setFinalUsername(savedUsername);
        }
      } catch (error) {
        console.log('RegisterScreen: Error restoring step:', error);
      }
    };
    
    initializeStep();
  }, []);

  // Continuous monitoring to maintain step state during re-renders
  useEffect(() => {
    const maintainStep = async () => {
      try {
        const savedStep = await Storage.getItem('registration_step');
        if (savedStep === 'verify' && step !== 'verify') {
          console.log('RegisterScreen: Step mismatch detected, restoring verify step');
          const savedOtpData = await Storage.getItem('registration_otp_data');
          const savedUsername = await Storage.getItem('registration_username');
          
          if (savedOtpData && savedUsername) {
            setIsStepLocked(true);
            setStep('verify');
            setOtpData(JSON.parse(savedOtpData));
            setFinalUsername(savedUsername);
          }
        }
      } catch (error) {
        console.log('RegisterScreen: Error maintaining step:', error);
      }
    };
    
    maintainStep();
  }); // No dependency array - runs on every render

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      console.log('RegisterScreen: User authenticated, clearing registration state');
      // Clear registration state when user gets authenticated
      Storage.removeItem('registration_step');
      Storage.removeItem('registration_otp_data');
      Storage.removeItem('registration_username');
    }
  }, [isAuthenticated]);

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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
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
    if (!validateForm()) {
      console.log('RegisterScreen: Form validation failed, errors:', errors);
      return;
    }

    setIsLoading(true);
    console.log('RegisterScreen: Starting registration...');
    
    try {
      // Pre-set the step and storage to prevent any navigation away
      const username = generatedUsername;
      const otpDataForStep = {
        email: formData.email.trim(),
        code: ''
      };
      
      // Immediately persist to storage and lock the step BEFORE API call
      await Storage.setItem('registration_step', 'verify');
      await Storage.setItem('registration_otp_data', JSON.stringify(otpDataForStep));
      await Storage.setItem('registration_username', username);
      
      console.log('RegisterScreen: Pre-setting verification step and storage');
      
      // Set UI state immediately
      setIsStepLocked(true);
      setFinalUsername(username);
      setOtpData(otpDataForStep);
      setStep('verify');
      
      // Now make the API call
      const result = await register(formData.firstName.trim(), formData.lastName.trim(), formData.email.trim(), formData.password);
      console.log('RegisterScreen: Registration result received:', result);
      
      if (result.success) {
        console.log('RegisterScreen: Registration successful - OTP step already shown');
        // Update username if different from generated one
        const finalUsernameFromAPI = result.username || username;
        if (finalUsernameFromAPI !== username) {
          setFinalUsername(finalUsernameFromAPI);
          await Storage.setItem('registration_username', finalUsernameFromAPI);
        }
      } else {
        console.log('RegisterScreen: Registration failed, reverting to register step:', result);
        
        // Revert to registration step on failure
        await Storage.removeItem('registration_step');
        await Storage.removeItem('registration_otp_data');
        await Storage.removeItem('registration_username');
        setIsStepLocked(false);
        setStep('register');
        
        if (result.details) {
          const newErrors: Record<string, string> = {};
          Object.entries(result.details).forEach(([field, messages]) => {
            if (messages.length > 0) {
              newErrors[field] = messages[0];
            }
          });
          setErrors(newErrors);
          
          // Show user-friendly message for common errors
          if (result.details.email && result.details.email.some(msg => msg.includes('already exists'))) {
            Alert.alert(
              'Email Already Registered', 
              'This email is already registered. Please use a different email or try logging in instead.',
              [
                { text: 'Try Different Email', style: 'default' },
                { text: 'Go to Login', style: 'default', onPress: () => navigation.navigate('Login' as never) }
              ]
            );
          }
        } else {
          Alert.alert(
            'Registration Failed',
            result.message || 'An error occurred during registration.'
          );
        }
      }
    } catch (error) {
      console.log('RegisterScreen: Unexpected error during registration:', error);
      // Revert to registration step on error
      await Storage.removeItem('registration_step');
      await Storage.removeItem('registration_otp_data');
      await Storage.removeItem('registration_username');
      setIsStepLocked(false);
      setStep('register');
      
      Alert.alert(
        'Registration Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpData.code.trim()) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(otpData.email, otpData.code);
    
    if (result.success) {
      // Success - user will be automatically navigated by AppNavigator
      // since verifyOTP sets authentication state
      console.log('RegisterScreen: OTP verification successful, clearing registration state');
      
      // Clear registration state from storage
      await Storage.removeItem('registration_step');
      await Storage.removeItem('registration_otp_data');
      await Storage.removeItem('registration_username');
      setIsStepLocked(false);
    } else {
      if (result.details) {
        const newErrors: Record<string, string> = {};
        Object.entries(result.details).forEach(([field, messages]) => {
          if (messages.length > 0) {
            newErrors[field] = messages[0];
          }
        });
        setErrors(newErrors);
      } else {
        Alert.alert(
          'Verification Failed',
          result.message || 'Invalid verification code. Please try again.'
        );
      }
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    // Trim whitespace for email field to prevent validation issues
    const processedValue = field === 'email' ? value.trim().toLowerCase() : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
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
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={['#E1306C', '#F56040']} style={styles.logo}>
                <Text style={styles.logoText}>📷</Text>
              </LinearGradient>
              <Text style={styles.title}>
                {step === 'register' ? 'Join InstaPics' : 'Verify Email'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'register'
                  ? 'Create your account to start sharing'
                  : `We've sent a verification code to ${otpData.email}. Your username will be @${finalUsername}`}
              </Text>
            </View>

            {/* Register Form */}
            {step === 'register' ? (
              <View style={styles.form}>
                {[
                  { key: 'firstName', label: 'First Name', placeholder: 'Enter your first name', icon: 'person-outline' as const },
                  { key: 'lastName', label: 'Last Name (optional)', placeholder: 'Enter your last name', icon: 'person-circle-outline' as const },
                  { key: 'email', label: 'Email', placeholder: 'Enter your email', icon: 'mail-outline' as const, keyboardType: 'email-address' as const },
                  { key: 'password', label: 'Password', placeholder: 'Create a password', icon: 'lock-closed-outline' as const, secureTextEntry: true },
                  { key: 'confirmPassword', label: 'Confirm Password', placeholder: 'Confirm your password', icon: 'lock-closed-outline' as const, secureTextEntry: true },
                ].map(({ key, label, placeholder, icon, keyboardType, secureTextEntry }) => (
                  <View key={key} style={styles.inputGroup}>
                    <Text style={styles.label}>{label}</Text>
                    <View style={[styles.inputWrapper, errors[key] && styles.inputError]}>
                      <Ionicons name={icon} size={20} color="#666" style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor="#aaa"
                        value={formData[key as keyof typeof formData]}
                        onChangeText={(value) => handleInputChange(key, value)}
                        autoCapitalize={key === 'email' ? 'none' : 'words'}
                        autoCorrect={false}
                        keyboardType={keyboardType || 'default'}
                        secureTextEntry={secureTextEntry}
                      />
                    </View>
                    {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
                  </View>
                ))}

                {generatedUsername && (
                  <View style={styles.usernamePreview}>
                    <Text style={styles.label}>Your Username</Text>
                    <View style={styles.usernameBox}>
                      <Text style={styles.usernameText}>@{generatedUsername}</Text>
                    </View>
                    <Text style={styles.usernameHint}>This will be your username.</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading} activeOpacity={0.8}>
                  <LinearGradient colors={isLoading ? ['#bbb', '#ccc'] : ['#E1306C', '#F56040']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>{isLoading ? 'Creating Account...' : 'Create Account'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              /* Verify Step */
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput, errors.code && styles.inputError]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#aaa"
                    value={otpData.code}
                    onChangeText={(value) => handleOtpChange('code', value)}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                    inputMode="numeric"
                  />
                  {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                  <Text style={styles.codeHint}>Enter the 6-digit code from your email</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={isLoading} activeOpacity={0.8}>
                  <LinearGradient colors={isLoading ? ['#bbb', '#ccc'] : ['#E1306C', '#F56040']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify Account'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={async () => {
                  // Clear registration state when going back
                  await Storage.removeItem('registration_step');
                  await Storage.removeItem('registration_otp_data');
                  await Storage.removeItem('registration_username');
                  setIsStepLocked(false);
                  setStep('register');
                }}>
                  <Text style={styles.backButtonText}>← Back to Registration</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.linkContainer}>
              <Text style={styles.linkBaseText}>
                {step === 'register' ? 'Already have an account? ' : 'Back to registration? '}
              </Text>
              {step === 'register' ? (
                <TouchableOpacity onPress={async () => {
                  // Clear registration state when navigating to login
                  await Storage.removeItem('registration_step');
                  await Storage.removeItem('registration_otp_data');
                  await Storage.removeItem('registration_username');
                  navigation.navigate('Login' as never);
                }}>
                  <Text style={styles.linkText}>Sign in</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={async () => {
                  // Clear registration state when going back
                  await Storage.removeItem('registration_step');
                  await Storage.removeItem('registration_otp_data');
                  await Storage.removeItem('registration_username');
                  setIsStepLocked(false);
                  setStep('register');
                }}>
                  <Text style={styles.linkText}>Go back</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ========== Styles ========== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafc' },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
  },
  logoText: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#222', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  form: { marginBottom: 25 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  inputError: { borderColor: '#dc3545' },
  errorText: { color: '#dc3545', fontSize: 13, marginTop: 4 },
  usernamePreview: { marginBottom: 20 },
  usernameBox: {
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef',
    borderRadius: 8, padding: 12, marginTop: 6,
  },
  usernameText: { fontSize: 16, fontWeight: '600', color: '#333' },
  usernameHint: { fontSize: 14, color: '#666', marginTop: 4 },
  button: { marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  buttonGradient: { padding: 15, alignItems: 'center', borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  codeInput: { fontSize: 20, fontWeight: '700', letterSpacing: 3 },
  codeHint: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 6 },
  backButton: { alignItems: 'center', marginTop: 15 },
  backButtonText: { color: '#007AFF', fontSize: 15, fontWeight: '500' },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  linkBaseText: { color: '#666', fontSize: 15 },
  linkText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
});

export default RegisterScreen;