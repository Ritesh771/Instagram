import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Grid, Camera, Plus, Settings, Shield, Edit3, Save, X } from 'lucide-react';
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

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { posts } = usePosts();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const userPosts = posts.filter(post => post.user.username === username);
  const isOwnProfile = user?.username === username;

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
                        {user?.bio || (isOwnProfile ? 'No bio yet. Click edit to add one!' : 'No bio available')}
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
                    <p className="text-xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">0</p>
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
            </CardContent>
          </Card>
        )}

        {/* Posts Grid */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Grid className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Posts</h2>
          </div>

          {userPosts.length > 0 ? (
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
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;