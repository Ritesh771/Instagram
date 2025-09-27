import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

export function useScreenshotProtection() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Activate screenshot protection
      const activate = async () => {
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('[Security] Screenshot protection activated');
      };

      // Activate immediately
      activate().catch(error => {
        console.warn('[Security] Failed to activate screenshot protection:', error);
      });

      // Add listener for when app comes back to foreground
      const subscription = ScreenCapture.addScreenshotListener(() => {
        // Re-enable protection in case it was disabled
        ScreenCapture.preventScreenCaptureAsync().catch(console.warn);
      });

      // Cleanup
      return () => {
        subscription.remove();
        // Optionally disable protection when component unmounts
        // ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
      };
    } else {
      console.log('Screenshot protection is active (web platform - limited protection)');
    }
  }, []);
}