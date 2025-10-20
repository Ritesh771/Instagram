import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Monitor, Tablet, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import apiService, { Device } from '@/services/api';

const DeviceManagement: React.FC = () => {
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutDeviceId, setLogoutDeviceId] = useState<number | null>(null);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<number | null>(null);

  // Auto-refresh device list every 5 seconds to show devices from other browsers
  useEffect(() => {
    fetchDevices();
    
    // Set up polling to refresh device list
    const intervalId = setInterval(() => {
      fetchDevices();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      setDevices(response.data);
      
      // Identify current device by matching refresh token
      const currentRefreshToken = apiService.getRefreshToken();
      if (currentRefreshToken && response.data.length > 0) {
        // The backend should ideally send which device is current
        // For now, we'll assume the most recent device is current
        // or we can mark it based on the first device in the list
        setCurrentDeviceId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId: number) => {
    try {
      // Logout the specific device
      await apiService.logoutDevice(deviceId);
      
      // Remove from local state immediately for better UX
      setDevices((prev) => prev.filter((device) => device.id !== deviceId));
      
      toast({
        title: 'Device Logged Out',
        description: 'Successfully logged out from the selected device',
      });
      setLogoutDeviceId(null);
    } catch (error) {
      console.error('Error logging out device:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout device',
        variant: 'destructive',
      });
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      // Call backend to logout all OTHER devices (keeping current device active)
      const response = await apiService.logoutAllDevices();
      
      // Remove logged out devices from local state
      setDevices((prev) => prev.filter((device) => device.id === currentDeviceId));
      
      // Show success message
      toast({
        title: 'Other Devices Logged Out',
        description: response.data.detail || 'Successfully logged out from other devices',
      });
      
      setShowLogoutAllDialog(false);
    } catch (error) {
      console.error('Error logging out all devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout all devices',
        variant: 'destructive',
      });
    }
  };

  const getDeviceIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('android') || osLower.includes('ios')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (osLower.includes('ipad') || osLower.includes('tablet')) {
      return <Tablet className="h-5 w-5" />;
    } else {
      return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Active Devices</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading devices...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-card border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Active Devices</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Manage devices where you're currently logged in
              </CardDescription>
            </div>
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutAllDialog(true)}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Logout Other Devices
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">No Active Devices</h3>
              <p className="text-muted-foreground">
                You are not logged in on any devices
              </p>
            </div>
          ) : (
            devices.map((device, index) => (
              <div
                key={device.id}
                className="flex items-start justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/50"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-instagram/10 text-primary flex-shrink-0">
                    {getDeviceIcon(device.os)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{device.device_name}</p>
                      {device.id === currentDeviceId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {device.os} • {device.browser}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      IP: {device.ip_address}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Last active: {formatDateTime(device.last_activity)}
                      </span>
                      <span>•</span>
                      <span>
                        Logged in: {formatDateTime(device.login_time)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Only show logout button for other devices, not current device */}
                {device.id !== currentDeviceId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoutDeviceId(device.id)}
                    className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                )}
              </div>
            ))
          )}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Security Notice</p>
                <p className="text-xs text-amber-700 mt-1">
                  If you see a device you don't recognize, logout that device immediately and change your password. 
                  The device list refreshes automatically every 5 seconds.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Single Device Dialog */}
      <AlertDialog open={logoutDeviceId !== null} onOpenChange={() => setLogoutDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout from This Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the session on the selected device. That device will need to login again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logoutDeviceId && handleLogoutDevice(logoutDeviceId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Logout Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout All Devices Dialog */}
      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout from All Other Devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all active sessions on other devices, but keep your current device logged in.
              Other devices will need to login again to access your account.
              This is useful if you suspect unauthorized access to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAllDevices}
              className="bg-red-600 hover:bg-red-700"
            >
              Logout Other Devices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeviceManagement;
