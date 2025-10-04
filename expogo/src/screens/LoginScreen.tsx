import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import BiometricLogin from '../components/BiometricLogin';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
  Main: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, verify2FA, isAuthenticated, pendingOtpData, clearPendingOtp } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // Determine current step based on pendingOtpData from AuthContext
  const step = pendingOtpData ? 'verify2fa' : 'login';

  // Redirect if already logged in - this handles automatic navigation
  useEffect(() => {
    // Don't manually navigate here - let React Navigation handle it automatically
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!formData.username.trim() || !formData.password) {
      setErrors({ general: 'Username and password are required' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // Don't manually navigate - authentication state change will trigger automatic navigation
    } else if (result.requires2FA) {
      // No need to set local state - pendingOtpData in AuthContext will trigger step change
    } else {
      setErrors({ general: result.message || 'Login failed' });
      if (result.details) {
        const newErrors: Record<string, string> = {};
        Object.entries(result.details).forEach(([field, messages]) => {
          if (messages.length > 0) {
            newErrors[field] = messages[0];
          }
        });
        setErrors({ ...newErrors, general: result.message || 'Login failed' });
      }
    }
    setIsLoading(false);
  };

  const handleVerify2FA = async () => {
    if (!otpCode.trim()) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    if (!pendingOtpData?.username) {
      setErrors({ code: 'Session expired. Please login again.' });
      clearPendingOtp();
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    const result = await verify2FA(pendingOtpData.username, otpCode);
    
    if (result.success) {
      // Don't manually navigate - authentication state change will trigger automatic navigation
    } else {
      setErrors({ code: result.message || 'Verification failed' });
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleOtpChange = (field: string, value: string) => {
    if (field === 'code') {
      // Only allow digits for the code field
      value = value.replace(/\D/g, '');
      setOtpCode(value);
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Debug: Log current step during render

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E1306C', '#F56040']}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          style={styles.innerContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.logoContainer}>
            <Animatable.View animation="pulse" iterationCount="infinite" style={styles.logo}>
              <Text style={styles.logoText}>📷</Text>
            </Animatable.View>
            <Text style={styles.title}>
              {step === 'login' ? 'Welcome Back' : 'Verify 2FA'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'login' 
                ? 'Sign in to continue your journey' 
                : 'Enter the verification code from your email'
              }
            </Text>
          </View>

          {step === 'login' ? (
            <View style={styles.inputContainer}>
              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                <Ionicons name="person" size={24} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  autoCapitalize="none"
                />
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed" size={24} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <Animatable.View animation="bounceIn" style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>

              {/* Biometric Login Option */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Or</Text>
                <View style={styles.divider} />
              </View>

              <BiometricLogin onSuccess={() => {
                // Don't manually navigate - authentication state change will trigger automatic navigation
              }} />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.code && styles.inputError]}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#999"
                  value={otpCode}
                  onChangeText={(value) => handleOtpChange('code', value)}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                />
              </View>
              {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
              <Text style={styles.codeHint}>Check your email for the verification code</Text>

              <Animatable.View animation="bounceIn" style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerify2FA}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            </View>
          )}

          <View style={styles.linkContainer}>
            {step === 'login' && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            
            {step === 'verify2fa' && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  clearPendingOtp();
                  setOtpCode('');
                  setErrors({});
                }}
              >
                <Text style={styles.linkText}>← Back to login</Text>
              </TouchableOpacity>
            )}
          </View>

          {step === 'login' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.linkText}>Don't have an account? Register</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 20,
  },
  logoText: {
    fontSize: 60,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputIcon: {
    marginRight: 10,
    color: '#fff',
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 5,
  },
  eyeIcon: {
    padding: 5,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  codeHint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#E1306C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#fff',
    marginHorizontal: 15,
    fontSize: 16,
    opacity: 0.8,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkButton: {
    padding: 10,
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
});

export default LoginScreen;