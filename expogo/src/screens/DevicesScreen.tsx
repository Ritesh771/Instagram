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

const DevicesScreen: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Simulate fetching device data
    setTimeout(() => {
      setDevices([
        {
          id: 1,
          name: 'iPhone 14 Pro',
          platform: 'iOS',
          location: 'Bangalore, India',
          last_active: 'Oct 11, 2025 - 8:24 PM',
          image: 'https://cdn-icons-png.flaticon.com/512/831/831276.png',
        },
        {
          id: 2,
          name: 'Samsung Galaxy S22',
          platform: 'Android',
          location: 'Hyderabad, India',
          last_active: 'Oct 10, 2025 - 5:10 PM',
          image: 'https://cdn-icons-png.flaticon.com/512/882/882747.png',
        },
        {
          id: 3,
          name: 'Chrome Browser',
          platform: 'Web',
          location: 'Mumbai, India',
          last_active: 'Oct 6, 2025 - 1:02 PM',
          image: 'https://cdn-icons-png.flaticon.com/512/5968/5968875.png',
        },
      ]);
      setLoading(false);
    }, 1200);
  }, []);

  const handleLogoutDevice = (deviceId: number) => {
    Alert.alert(
      'Log Out Device',
      'Are you sure you want to log out from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            setDevices((prev) => prev.filter((d) => d.id !== deviceId));
            Alert.alert('Success', 'Device logged out successfully.');
          },
        },
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Log Out All Devices',
      'This will log you out from all devices except this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out All',
          style: 'destructive',
          onPress: () => {
            setLoggingOut(true);
            setTimeout(() => {
              setDevices([]);
              setLoggingOut(false);
              Alert.alert('Success', 'All devices have been logged out.');
            }, 1000);
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

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 30 }} />
      ) : devices.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Ionicons name="devices-outline" size={60} color="#aaa" />
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
