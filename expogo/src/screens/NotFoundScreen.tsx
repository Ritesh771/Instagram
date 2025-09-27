import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const NotFoundScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <LinearGradient colors={["#ffffff", "#f8f9fa"]} style={styles.gradient}>
        <View style={styles.content}>
          <Ionicons name="alert-circle-outline" size={64} color="#E1306C" />
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.subtitle}>The page you are looking for doesn't exist.</Text>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Feed')}>
            <LinearGradient colors={["#E1306C", "#F56040"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Go to Feed</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 16, color: '#212529' },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  button: { width: '80%', borderRadius: 25, overflow: 'hidden' },
  buttonGradient: { paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default NotFoundScreen;
