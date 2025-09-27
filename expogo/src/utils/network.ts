import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export async function checkNetworkConnectivity() {
  try {
    const state = await NetInfo.fetch();
    
    console.log('[Network] Connectivity state:', {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
      details: state.details
    });
    
    return {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
      platform: Platform.OS
    };
  } catch (error) {
    console.error('[Network] Error checking connectivity:', error);
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform: Platform.OS
    };
  }
}