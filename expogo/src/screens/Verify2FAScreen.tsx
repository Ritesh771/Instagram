import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Verify2FA: { username: string };
  Main: undefined;
};

type Verify2FAScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Verify2FA'>;

const Verify2FAScreen: React.FC = () => {
  const [code, setCode] = useState('');
  const { verify2FA, isLoading } = useAuth();
  const navigation = useNavigation<Verify2FAScreenNavigationProp>();
  const route = useRoute();
  const { username } = route.params as { username: string };

  const handleVerify2FA = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the 2FA code');
      return;
    }

    const result = await verify2FA(username, code);
    
    if (!result.success) {
      Alert.alert('Verification Failed', result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>Enter the code from your authenticator app</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        maxLength={6}
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleVerify2FA}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default Verify2FAScreen;
