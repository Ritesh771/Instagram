import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const DevicesScreen: React.FC = () => {
  const { logout } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch device data from backend
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.getDevices();
        setDevices(response.data.map((device: any) => ({
          ...device,
          name: device.device_name || 'Unknown Device',
          platform: `${device.os || 'Unknown OS'} ${device.browser || 'Unknown Browser'}`,
          location: device.ip_address || 'Unknown Location',
          last_active: new Date(device.last_activity).toLocaleString(),
          image: getDeviceImage(device.os, device.browser)
        })));
      } catch (err) {
        const apiError = apiService.handleError(err);
        setError(apiError.message);
        console.error('Error fetching devices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const getDeviceImage = (os: string, browser: string) => {
    const osLower = (os || '').toLowerCase();
    const browserLower = (browser || '').toLowerCase();
    
    if (osLower.includes('android')) {
      return 'https://cdn-icons-png.flaticon.com/512/882/882747.png';
    } else if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) {
      return 'https://cdn-icons-png.flaticon.com/512/831/831276.png';
    } else if (osLower.includes('windows')) {
      return 'https://cdn-icons-png.flaticon.com/512/883/883506.png';
    } else if (osLower.includes('mac') || osLower.includes('darwin')) {
      return 'https://cdn-icons-png.flaticon.com/512/831/831584.png';
    } else if (osLower.includes('linux')) {
      return 'https://cdn-icons-png.flaticon.com/512/5185/5185388.png';
    } else {
      return 'https://cdn-icons-png.flaticon.com/512/5968/5968875.png'; // Web browser
    }
  };

  const handleLogoutDevice = async (deviceId: number) => {
    Alert.alert(
      'Log Out Device',
      'Are you sure you want to log out from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current refresh token to exclude it from logout
              const refreshToken = await apiService.getRefreshToken();
              await apiService.logoutDevice(deviceId, refreshToken || undefined);
              setDevices((prev) => prev.filter((d) => d.id !== deviceId));
              Alert.alert('Success', 'Device logged out successfully.');
              
              // Check if this was the current device (we can't easily determine this)
              // In a real implementation, the backend would tell us if this was the current device
              // For now, we'll assume it wasn't since we're still logged in
            } catch (err) {
              const apiError = apiService.handleError(err);
              Alert.alert('Error', apiError.message);
              console.error('Error logging out device:', err);
            }
          },
        },
      ]
    );
  };

  const handleLogoutAll = async () => {
    Alert.alert(
      'Log Out All Devices',
      'This will log you out from all devices including this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              // Log out all devices including current one
              await apiService.logoutAllDevices();
              setDevices([]);
              Alert.alert('Success', 'All devices have been logged out.');
              // Also logout locally
              logout();
            } catch (err) {
              const apiError = apiService.handleError(err);
              Alert.alert('Error', apiError.message);
              console.error('Error logging out all devices:', err);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const renderDevice = ({ item }: { item: any }) => (
    <View style={styles.deviceCard}>
      <Image source={{ uri: item.image }} style={styles.deviceImage} />
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceDetails}>
          {item.platform} • {item.location}
        </Text>
        <Text style={styles.deviceSubText}>Last Active: {item.last_active}</Text>
      </View>
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => handleLogoutDevice(item.id)}
      >
        <MaterialIcons name="logout" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {devices.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Ionicons name="phone-portrait-outline" size={60} color="#aaa" />
          <Text style={{ color: '#666', marginTop: 10 }}>
            No active devices found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDevice}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
        />
      )}

      {devices.length > 0 && (
        <TouchableOpacity
          style={[styles.logoutAllBtn, loggingOut && { opacity: 0.7 }]}
          onPress={handleLogoutAll}
          disabled={loggingOut}
        >
          <Text style={styles.logoutAllText}>
            {loggingOut ? 'Logging out...' : 'Log Out All Devices'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 20,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  deviceImage: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 10,
  },
  deviceName: { fontSize: 16, fontWeight: '600', color: '#333' },
  deviceDetails: { fontSize: 14, color: '#555', marginTop: 4 },
  deviceSubText: { fontSize: 12, color: '#999', marginTop: 3 },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  logoutAllBtn: {
    backgroundColor: '#d63031',
    paddingVertical: 15,
    borderRadius: 12,
    marginVertical: 20,
  },
  logoutAllText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default DevicesScreen;