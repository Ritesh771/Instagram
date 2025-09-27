import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Storage } from '@/utils/storage';
import { useScreenshotProtection } from '@/hooks/use-screenshot-protection';

interface SecurityContextType {
  screenshotProtectionEnabled: boolean;
  toggleScreenshotProtection: () => Promise<void>;
  updateSecuritySettings: (settings: { screenshotProtectionEnabled: boolean }) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] = useState(true); // Default enabled

  // Always use screenshot protection regardless of the enabled state
  // This ensures maximum security across the app
  useScreenshotProtection();

  useEffect(() => {
    // Load security settings from storage
    const loadSecuritySettings = async () => {
      try {
        const settings = await Storage.getItem('security_settings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          setScreenshotProtectionEnabled(parsedSettings.screenshotProtectionEnabled ?? true);
        }
      } catch (error) {
        console.error('Error loading security settings:', error);
      }
    };

    loadSecuritySettings();
  }, []);

  const updateSecuritySettings = async (settings: { screenshotProtectionEnabled: boolean }) => {
    try {
      await Storage.setItem('security_settings', JSON.stringify(settings));
      setScreenshotProtectionEnabled(settings.screenshotProtectionEnabled);
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  };

  const toggleScreenshotProtection = async () => {
    const newValue = !screenshotProtectionEnabled;
    await updateSecuritySettings({ screenshotProtectionEnabled: newValue });
  };

  const value: SecurityContextType = {
    screenshotProtectionEnabled,
    toggleScreenshotProtection,
    updateSecuritySettings,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
