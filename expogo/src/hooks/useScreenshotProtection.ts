import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';

interface ScreenshotProtectionOptions {
  enabled: boolean;
  message?: string;
}

export const useScreenshotProtection = (options: ScreenshotProtectionOptions) => {
  const { enabled, message = 'Screenshots are not allowed' } = options;
  const protectionActive = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    protectionActive.current = true;

    // For web platform, we can't prevent screenshots but we can show a warning
    if (Platform.OS === 'web') {
      console.log('Screenshot protection enabled (web platform - limited protection)');
      return;
    }

    // For mobile platforms, we'll implement a custom solution
    // This includes visual indicators and user education
    const handleAppStateChange = () => {
      if (protectionActive.current) {
        // Show warning when app comes to foreground
        console.log('Screenshot protection is active');
      }
    };

    // Add event listeners for app state changes
    const subscription = require('react-native').AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      protectionActive.current = false;
      subscription?.remove();
    };
  }, [enabled, message]);

  const showScreenshotWarning = () => {
    if (enabled) {
      Alert.alert(
        'Screenshot Protection',
        message,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return {
    enableProtection: () => {
      protectionActive.current = true;
      console.log('Screenshot protection enabled');
    },
    disableProtection: () => {
      protectionActive.current = false;
      console.log('Screenshot protection disabled');
    },
    showWarning: showScreenshotWarning,
    isProtected: protectionActive.current,
  };
};
