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

  useEffect(() => {
    console.log('RegisterScreen - isAuthenticated changed:', isAuthenticated);
    // Don't manually navigate here - let React Navigation handle it automatically
  }, [isAuthenticated, navigation]);

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
      if (result.details) {
        const newErrors: Record<string, string> = {};
        Object.entries(result.details).forEach(([field, messages]) => {
          if (messages.length > 0) {
            newErrors[field] = messages[0]; // Take the first error message for each field
          }
        });
        setErrors(newErrors);
      } else {
        Alert.alert('Registration Failed', result.message);
      }
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
          onPress: () => {
            console.log('OTP verification successful - waiting for auth state change');
            // Don't manually navigate - authentication state change will trigger automatic navigation
          },
        },
      ]);
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
        Alert.alert('Verification Failed', result.message);
      }
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
                  ? 'Create your account to start sharing moments'
                  : `Verify your email to complete registration.\nYour username will be @${finalUsername}`}
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
                  <LinearGradient colors={isLoading ? ['#bbb', '#ccc'] : ['#007AFF', '#005BBB']} style={styles.buttonGradient}>
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
                    value={otpData.code}
                    onChangeText={(value) => handleOtpChange('code', value)}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                  />
                  {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                  <Text style={styles.codeHint}>Check your email for the verification code</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={isLoading} activeOpacity={0.8}>
                  <LinearGradient colors={isLoading ? ['#bbb', '#ccc'] : ['#34c759', '#28a745']} style={styles.buttonGradient}>
                    <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify Account'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => setStep('register')}>
                  <Text style={styles.backButtonText}>← Back to Registration</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'register' && (
              <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login' as never)}>
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            )}
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
  linkButton: { alignItems: 'center', marginTop: 20 },
  linkText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
});

export default RegisterScreen;
