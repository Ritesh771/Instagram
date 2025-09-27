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

const ResetPasswordScreen = ({ navigation, route }: any) => {
  const { email: routeEmail } = route.params || {};
  const [formData, setFormData] = useState({
    email: routeEmail || '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { confirmPasswordReset } = useAuth();

  const handleResetPassword = async () => {
    // Validation
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!formData.code.trim()) {
      setErrors({ code: 'Reset code is required' });
      return;
    }
    if (!formData.newPassword) {
      setErrors({ newPassword: 'New password is required' });
      return;
    }
    if (formData.newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters' });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    const result = await confirmPasswordReset(
      formData.email,
      formData.code,
      formData.newPassword
    );
    
    if (result.success) {
      Alert.alert(
        "Password Reset Successful",
        result.message || "Your password has been reset successfully.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } else {
      Alert.alert("Reset Failed", result.message);
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
            {/* Header */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#212529" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#E1306C', '#F56040', '#F77737']}
                style={styles.logo}
              >
                <Ionicons name="key" size={40} color="white" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the code from your email and your new password
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email}</Text>
                )}
              </View>

              {/* Reset Code Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="key-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={[styles.input, errors.code && styles.inputError]}
                  placeholder="Reset Code"
                  value={formData.code}
                  onChangeText={(value) => handleInputChange('code', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.code && (
                  <Text style={styles.fieldError}>{errors.code}</Text>
                )}
              </View>

              {/* New Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={[styles.input, errors.newPassword && styles.inputError]}
                  placeholder="New Password"
                  value={formData.newPassword}
                  onChangeText={(value) => handleInputChange('newPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.newPassword && (
                  <Text style={styles.fieldError}>{errors.newPassword}</Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6c757d" />
                </View>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  placeholder="Confirm New Password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.confirmPassword && (
                  <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#E1306C', '#F56040']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Back to Login Link */}
            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>
                Remember your password?{' '}
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.backToLoginLink}>Sign in</Text>
                </TouchableOpacity>
              </Text>
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
    padding: 20,
  },
  content: {
    alignItems: 'center',
    paddingTop: 50,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
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
    paddingHorizontal: 20,
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
  inputError: {
    borderColor: '#dc3545',
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
  backToLoginContainer: {
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  backToLoginLink: {
    color: '#E1306C',
    fontWeight: '600',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 15,
  },
});

export default ResetPasswordScreen;
