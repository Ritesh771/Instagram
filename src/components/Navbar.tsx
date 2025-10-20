import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusSquare, User, LogOut, Camera, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await apiService.getPendingFollowRequests();
        setPendingRequestsCount(response.data.length);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    if (user) {
      fetchPendingRequests();
      // Poll every 30 seconds for updates
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-gradient-card backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/feed" className="flex items-center space-x-2">
          <Camera className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-gradient">InstaPics</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6">
          <Link
            to="/feed"
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive('/feed') ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Feed</span>
          </Link>

          <Link
            to="/upload"
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive('/upload') ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlusSquare className="h-5 w-5" />
            <span className="hidden sm:inline">Upload</span>
          </Link>

          <Link
            to="/search"
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive('/search') ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="hidden sm:inline">Search</span>
          </Link>

          <Link
            to={`/profile/${user.username}`}
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive(`/profile/${user.username}`) ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <Link
            to="/follow-requests"
            className={`relative flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive('/follow-requests') ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-5 w-5" />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </span>
            )}
            <span className="hidden sm:inline">Requests</span>
          </Link>

          {/* User info and logout */}
          <div className="flex items-center space-x-3">
            <span className="hidden text-sm font-medium text-foreground md:inline">
              @{user.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;