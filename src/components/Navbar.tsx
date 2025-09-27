import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusSquare, User, LogOut, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

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
            to={`/profile/${user.username}`}
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-secondary ${
              isActive(`/profile/${user.username}`) ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
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