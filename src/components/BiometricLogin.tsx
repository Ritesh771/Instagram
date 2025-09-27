import React, { useState } from 'react';
import { Fingerprint, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BiometricLoginProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const BiometricLogin: React.FC<BiometricLoginProps> = ({ onSuccess, onError }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [username, setUsername] = useState('');
  const { biometricLogin, isBiometricAvailable } = useAuth();
  const { toast } = useToast();

  const handleBiometricLogin = async () => {
    if (!showUsernameInput) {
      setShowUsernameInput(true);
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your username",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        const message = 'Web Authentication is not supported on this browser.';
        toast({
          title: "Biometrics Unavailable",
          description: message,
          variant: "destructive",
        });
        onError?.(message);
        return;
      }

      // Check if biometrics are available
      const biometricCheck = await isBiometricAvailable();
      if (!biometricCheck.available) {
        const message = 'Biometric authentication is not available on this device.';
        toast({
          title: "Biometrics Unavailable",
          description: message,
          variant: "destructive",
        });
        onError?.(message);
        return;
      }

      // Store username temporarily for authentication
      localStorage.setItem('biometric_auth_username', username.trim());

      // Attempt biometric authentication using WebAuthn
      const result = await biometricLogin();

      if (result.success) {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        // Clear temporary username
        localStorage.removeItem('biometric_auth_username');
        onSuccess?.();
      } else {
        const message = result.message || 'Biometric authentication failed';
        toast({
          title: "Authentication Failed",
          description: message,
          variant: "destructive",
        });
        onError?.(message);
      }
    } catch (error) {
      const message = 'An error occurred during biometric authentication';
      console.error('Biometric login error:', error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      onError?.(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCancel = () => {
    setShowUsernameInput(false);
    setUsername('');
    localStorage.removeItem('biometric_auth_username');
  };

  if (showUsernameInput) {
    return (
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <Label htmlFor="biometric-username">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="biometric-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleBiometricLogin}
            disabled={isAuthenticating || !username.trim()}
            className="flex-1"
          >
            <Fingerprint className={`h-4 w-4 mr-2 ${isAuthenticating ? 'animate-pulse' : ''}`} />
            {isAuthenticating ? 'Authenticating...' : 'Continue with Biometrics'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isAuthenticating}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBiometricLogin}
      disabled={isAuthenticating}
      className="w-full h-12 border-2 border-primary/20 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-center gap-3">
        <Fingerprint
          className={`h-5 w-5 ${isAuthenticating ? 'animate-pulse text-primary' : 'text-primary'}`}
        />
        <span className="font-medium">
          Login with Biometrics
        </span>
      </div>
    </Button>
  );
};

export default BiometricLogin;