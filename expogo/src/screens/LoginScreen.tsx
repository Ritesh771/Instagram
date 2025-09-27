import React, { useState, useEffect } from 'react';
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
import { Storage } from '@/utils/storage';
import { getApiUrl } from '@/config/network';

const LoginScreen = ({ navigation }: any) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, isAuthenticated } = useAuth();
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ apiUrl: '', access: null as string | null, refresh: null as string | null, user: null as string | null });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      // Navigation will be handled by AppNavigator
    }
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
      // Navigation will be handled by AppNavigator
    } else if (result.requires2FA) {
      // Navigate to 2FA verification screen
      navigation.navigate('Verify2FA', { username: formData.username });
    } else {
      setErrors({ general: result.message || 'Login failed' });
      Alert.alert("Login Failed", result.message);
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const loadDebugInfo = async () => {
    const apiUrl = getApiUrl();
    const access = await Storage.getItem('access_token');
    const refresh = await Storage.getItem('refresh_token');
    const user = await Storage.getItem('user');
    setDebugInfo({ apiUrl, access, refresh, user });
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
                colors={['#110408ff', '#e90a0aff', '#d817bfff']}
                style={styles.logo}
              >
                <Ionicons name="camera" size={40} color="white" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {/* Error Message */}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#E1306C', '#F56040']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.linkText}>Forgot your password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don't have an account?{' '}
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.signupLink}>Sign up</Text>
                </TouchableOpacity>
              </Text>
            </View>
            {/* Debug Toggle */}
            <TouchableOpacity style={{ marginTop: 12 }} onPress={async () => { setDebugOpen(v => !v); if (!debugOpen) await loadDebugInfo(); }}>
              <Text style={{ color: '#6c757d', textAlign: 'center' }}>{debugOpen ? 'Hide Debug Info' : 'Show Debug Info'}</Text>
            </TouchableOpacity>

            {debugOpen && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info</Text>
                <Text style={styles.debugText}>API URL: {debugInfo.apiUrl}</Text>
                <Text style={styles.debugText}>Access Token: {debugInfo.access ? 'present' : 'null'}</Text>
                <Text style={styles.debugText}>Refresh Token: {debugInfo.refresh ? 'present' : 'null'}</Text>
                <Text style={styles.debugText}>User: {debugInfo.user ? debugInfo.user : 'null'}</Text>
              </View>
            )}
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
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    top: 15,
    zIndex: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 25,
    paddingHorizontal: 50,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#212529',
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
    marginBottom: 20,
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
  signupContainer: {
    marginTop: 20,
  },
  signupText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  signupLink: {
    color: '#E1306C',
    fontWeight: '600',
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
  debugContainer: {
    marginTop: 16,
    padding: 12,
    width: '100%',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
  },
  debugTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#212529',
  },
  debugText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 4,
  },
});

export default LoginScreen;
