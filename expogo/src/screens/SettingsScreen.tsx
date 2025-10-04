import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const SettingsScreen: React.FC = () => {
  const { user, logout, updateProfile, enableBiometricLogin, disableBiometricLogin, isBiometricAvailable } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBiometricUpdating, setIsBiometricUpdating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available.available);
  };

  const handleToggle2FA = async (enabled: boolean) => {
    setIsUpdating(true);
    const result = await updateProfile({ two_factor_enabled: enabled });
    if (result.success) {
      Alert.alert(enabled ? '2FA Enabled' : '2FA Disabled');
    } else {
      Alert.alert('Failed to update 2FA');
    }
    setIsUpdating(false);
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    setIsBiometricUpdating(true);
    
    if (enabled) {
      const result = await enableBiometricLogin();
      if (result.success) {
        Alert.alert('Biometric Authentication Enabled', 'Your app will now require biometric authentication when reopened.');
      } else {
        Alert.alert('Failed to Enable Biometric Authentication', result.message || 'Please try again.');
      }
    } else {
      const result = await disableBiometricLogin();
      if (result.success) {
        Alert.alert('Biometric Authentication Disabled', 'Biometric authentication has been turned off.');
      } else {
        Alert.alert('Failed to Disable Biometric Authentication', result.message || 'Please try again.');
      }
    }
    
    setIsBiometricUpdating(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  // Determine descriptive text
  const twoFAText = user?.two_factor_enabled
    ? "Two-Factor Authentication is ON. You'll need a code when logging in."
    : "Two-Factor Authentication is OFF. Your account is less secure.";

  const biometricText = user?.biometric_enabled
    ? "Biometric Authentication is ON. The app will lock when you leave and return."
    : biometricAvailable
      ? "Biometric Authentication is OFF. Enable for enhanced security."
      : "Biometric Authentication is not available on this device.";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
        <Text style={styles.header}>Settings</Text>

        {/* Two-Factor Authentication */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
              <Text style={styles.cardSubtitle}>{twoFAText}</Text>
            </View>
            <Switch
              value={user?.two_factor_enabled || false}
              onValueChange={handleToggle2FA}
              disabled={isUpdating}
            />
          </View>
        </View>

        {/* Biometric Authentication */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardTitle}>Biometric Authentication</Text>
              <Text style={styles.cardSubtitle}>{biometricText}</Text>
            </View>
            <Switch
              value={user?.biometric_enabled || false}
              onValueChange={handleToggleBiometric}
              disabled={isBiometricUpdating || !biometricAvailable}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.card} onPress={handleLogout}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, { color: 'red' }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
});

export default SettingsScreen;
