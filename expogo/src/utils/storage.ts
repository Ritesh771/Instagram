import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Storage abstraction that uses localStorage on web and SecureStore on native (Expo Go).
// Falls back to a small in-memory store if SecureStore is unavailable.
const memoryStore: Record<string, string> = {};

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }

      // Native (Expo Go) - use SecureStore
      if (SecureStore && SecureStore.getItemAsync) {
        const value = await SecureStore.getItemAsync(key);
        return value;
      }

      // Fallback to in-memory store
      console.warn('SecureStore not available, using in-memory storage (data lost on restart)');
      return memoryStore[key] ?? null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }

      if (SecureStore && SecureStore.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      // Fallback to in-memory store
      console.warn('SecureStore not available, using in-memory storage (data lost on restart)');
      memoryStore[key] = value;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }

      if (SecureStore && SecureStore.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
        return;
      }

      // Fallback to in-memory store
      console.warn('SecureStore not available, using in-memory storage (data lost on restart)');
      delete memoryStore[key];
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
        return;
      }

      // SecureStore does not provide a global clear - remove common keys used by app
      const keysToRemove = ['access_token', 'refresh_token', 'user', 'security_settings'];
      if (SecureStore && SecureStore.deleteItemAsync) {
        for (const k of keysToRemove) {
          await SecureStore.deleteItemAsync(k);
        }
        return;
      }

      // Fallback to in-memory store
      console.warn('SecureStore not available, using in-memory storage (data lost on restart)');
      for (const k of Object.keys(memoryStore)) {
        delete memoryStore[k];
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
};
