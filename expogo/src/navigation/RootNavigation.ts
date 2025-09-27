import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function resetToLogin() {
  if (navigationRef.isReady()) {
    // Reset the navigation state to the authentication flow (Login screen)
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
}

export default navigationRef;
