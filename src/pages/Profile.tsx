import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Grid, Camera, Plus, Settings, Shield, Edit3, Save, X, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import apiService from '@/services/api';

// Define the UserProfile interface with all necessary properties
interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  biometric_enabled?: boolean;
  bio?: string;
  profile_pic?: string;
  can_view_posts?: boolean;
  is_private?: boolean;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { posts } = usePosts();
  const { user, updateProfile, enableBiometricLogin, disableBiometricLogin, isBiometricAvailable } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and follow counts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, you would fetch the user profile by username
        // For now, we'll use the current user's data
        if (user) {
          setUserProfile({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            is_verified: user.is_verified,
            two_factor_enabled: user.two_factor_enabled,
            biometric_enabled: user.biometric_enabled,
            bio: user.bio,
            profile_pic: user.profile_pic
          });
          setFollowersCount(0); // Placeholder - in a real app, fetch from API
          setFollowingCount(0); // Placeholder - in a real app, fetch from API
          
          // Check if current user is following this profile (if not own profile)
          if (user.username !== username) {
            // Fetch the actual user profile by username
            // This is a placeholder - in a real implementation you would have an API endpoint to get user by username
            const response = await apiService.searchUsers(username || '');
            if (response.data.length > 0) {
              const targetUser = response.data[0];
              setUserProfile({
                id: targetUser.id,
                username: targetUser.username,
                first_name: targetUser.first_name,
                last_name: targetUser.last_name,
                email: targetUser.email,
                is_verified: targetUser.is_verified,
                two_factor_enabled: targetUser.two_factor_enabled,
                biometric_enabled: targetUser.biometric_enabled,
                bio: targetUser.bio,
                profile_pic: targetUser.profile_pic
              });
              
              // Fetch followers and following counts
              const followersResponse = await apiService.getFollowers(targetUser.id);
              const followingResponse = await apiService.getFollowing(targetUser.id);
              setFollowersCount(followersResponse.data.length);
              setFollowingCount(followingResponse.data.length);
              
              // Check if current user is following this profile
              const followStatusResponse = await apiService.checkFollowStatus(targetUser.id);
              setIsFollowing(followStatusResponse.data.is_following);
            }
          } else {
            // Own profile
            setUserProfile({
              id: user.id,
              username: user.username,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              is_verified: user.is_verified,
              two_factor_enabled: user.two_factor_enabled,
              biometric_enabled: user.biometric_enabled,
              bio: user.bio,
              profile_pic: user.profile_pic
            });
            setFollowersCount(0); // Placeholder - in a real app, fetch from API
            setFollowingCount(0); // Placeholder - in a real app, fetch from API
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, user]);

  const userPosts = posts.filter(post => post.user.username === username);
  const isOwnProfile = user?.username === username;
  
  // Determine if we can show posts based on the new can_view_posts flag or fallback logic
  const canViewPosts = userProfile?.can_view_posts !== undefined 
    ? userProfile.can_view_posts 
    : (!userProfile?.is_private || isOwnProfile || isFollowing);

  const handleToggle2FA = async (enabled: boolean) => {
    if (!isOwnProfile) return;
    
    setIsUpdating(true);
    const result = await updateProfile({ two_factor_enabled: enabled });
    
    if (result.success) {
      toast({
        title: enabled ? "2FA Enabled" : "2FA Disabled",
        description: enabled 
          ? "Two-factor authentication is now enabled. You'll receive OTP codes for future logins."
          : "Two-factor authentication is now disabled. You can log in with just your password.",
      });
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Failed to update 2FA settings",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const handleSaveBio = async () => {
    if (!isOwnProfile) return;
    
    setIsUpdating(true);
    const result = await updateProfile({ bio: editBio });
    
    if (result.success) {
      toast({
        title: "Bio Updated",
        description: "Your bio has been updated successfully.",
      });
      setIsEditing(false);
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Failed to update bio",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const handleCancelEdit = () => {
    setEditBio(user?.bio || '');
    setIsEditing(false);
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!isOwnProfile) return;

    if (enabled) {
      // Check if biometrics are available
      const biometricCheck = await isBiometricAvailable();
      if (!biometricCheck.available) {
        toast({
          title: "Biometrics Unavailable",
          description: "Biometric authentication is not available on this device.",
          variant: "destructive",
        });
        return;
      }

      // Enable biometric login directly
      setIsUpdating(true);
      const result = await enableBiometricLogin();
      if (result.success) {
        toast({
          title: "Biometric Login Enabled",
          description: "You can now log in using biometric authentication.",
        });
      } else {
        toast({
          title: "Setup Failed",
          description: result.message || "Failed to enable biometric login",
          variant: "destructive",
        });
      }
      setIsUpdating(false);
    } else {
      // Disable biometric login
      setIsUpdating(true);
      const result = await disableBiometricLogin();
      
      if (result.success) {
        toast({
          title: "Biometric Login Disabled",
          description: "Biometric authentication has been disabled for your account.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "Failed to disable biometric login",
          variant: "destructive",
        });
      }
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Profile not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
      <Navbar />
      
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8 bg-gradient-card border-border/50 shadow-lg">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6 sm:flex-row sm:space-x-8 sm:space-y-0">
              {/* Avatar */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-instagram shadow-lg">
                <User className="h-12 w-12 text-white" />
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">@{username}</h1>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? 'Your profile' : `${username}'s profile`}
                  </p>
                </div>

                {/* Bio Section */}
                <div className="space-y-2">
                  {isOwnProfile && isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself..."
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="min-h-[60px] resize-none"
                        maxLength={150}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {editBio.length}/150 characters
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveBio}
                            disabled={isUpdating}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">
                        {userProfile?.bio || (isOwnProfile ? 'No bio yet. Click edit to add one!' : 'No bio available')}
                      </p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex justify-center space-x-8 sm:justify-start">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{userPosts.length}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{followersCount}</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{followingCount}</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                </div>

                {isOwnProfile && (
                  <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
                    <Button asChild className="bg-gradient-instagram text-white hover:opacity-90">
                      <Link to="/upload">
                        <Plus className="mr-2 h-4 w-4" />
                        Add new post
                      </Link>
                    </Button>
                  </div>
                )}
                
                {/* Follow button for other users */}
                {!isOwnProfile && (
                  <Button 
                    className={isFollowing ? "bg-white text-black border border-gray-300 hover:bg-gray-100" : "bg-blue-500 text-white hover:bg-blue-600"}
                    onClick={() => {
                      // In a real implementation, you would handle follow/unfollow here
                      setIsFollowing(!isFollowing);
                      if (isFollowing) {
                        setFollowersCount(prev => Math.max(0, prev - 1));
                      } else {
                        setFollowersCount(prev => prev + 1);
                      }
                    }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings - Only for own profile */}
        {isOwnProfile && (
          <Card className="mb-8 bg-gradient-card border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="2fa-toggle" className="text-base font-medium">
                    Two-Factor Authentication (2FA)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.two_factor_enabled 
                      ? "2FA is enabled. You'll receive OTP codes for login."
                      : "2FA is disabled. Enable for extra security."
                    }
                  </p>
                </div>
                <Switch
                  id="2fa-toggle"
                  checked={user?.two_factor_enabled || false}
                  onCheckedChange={handleToggle2FA}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="biometric-toggle" className="text-base font-medium flex items-center gap-2">
                    <Fingerprint className="h-4 w-4" />
                    Biometric Login
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.biometric_enabled
                      ? "Biometric login is enabled. You can log in with fingerprint/face ID."
                      : "Biometric login is disabled. Enable for quick authentication."
                    }
                  </p>
                </div>
                <Switch
                  id="biometric-toggle"
                  checked={user?.biometric_enabled || false}
                  onCheckedChange={handleToggleBiometric}
                  disabled={isUpdating}
                />
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>How 2FA works:</strong>
                  <br />
                  • When enabled, you'll receive an OTP code via email during login
                  <br />
                  • Enter the code to complete authentication
                  <br />
                  • This adds an extra layer of security to your account
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>How Biometric Login works:</strong>
                  <br />
                  • Use fingerprint, face ID, or other biometric methods to log in
                  <br />
                  • Your biometric data is stored securely on your device
                  <br />
                  • You can always fall back to password login
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Grid */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Grid className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Posts</h2>
          </div>

          {/* Posts Grid - Only show if user can view posts or if it's a public profile */}
          {canViewPosts ? (
            userPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {userPosts.map((post) => (
                  <Card
                    key={post.id + post.likes_count}
                    className="group cursor-pointer overflow-hidden bg-gradient-card border-border/50 shadow-lg transition-transform hover:scale-105"
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={post.image.startsWith('http') ? post.image : `http://localhost:8000${post.image}`}
                          alt={post.caption}
                          className="aspect-square w-full object-cover transition-opacity group-hover:opacity-75"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="text-center text-white">
                            <p className="text-lg font-bold">{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</p>
                            <p className="text-sm">{post.caption.slice(0, 50)}{post.caption.length > 50 ? '...' : ''}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
                </h3>
                <p className="mb-6 max-w-sm text-muted-foreground">
                  {isOwnProfile 
                    ? "Share your first moment and start building your collection!"
                    : `${username} hasn't shared any posts yet.`
                  }
                </p>
                {isOwnProfile && (
                  <Button asChild className="bg-gradient-instagram text-white hover:opacity-90">
                    <Link to="/upload">
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first post
                    </Link>
                  </Button>
                )}
              </div>
            )
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                This account is private
              </h3>
              <p className="mb-6 max-w-sm text-muted-foreground">
                Follow @{username} to see their photos.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;