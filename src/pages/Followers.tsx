import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import apiService, { User as UserType } from '@/services/api';

const Followers: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [followers, setFollowers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<number, string>>({});
  const [profileUser, setProfileUser] = useState<UserType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        
        // Fetch the profile user details
        const userResponse = await apiService.getUserById(parseInt(userId));
        setProfileUser(userResponse.data);

        // Fetch followers list
        const response = await apiService.getFollowers(parseInt(userId));
        setFollowers(response.data);

        // Fetch follow status for each follower
        const statusMap: Record<number, string> = {};
        await Promise.all(
          response.data.map(async (follower) => {
            if (follower.id !== user?.id) {
              const statusResponse = await apiService.checkFollowStatus(follower.id);
              statusMap[follower.id] = statusResponse.data.status;
            }
          })
        );
        setFollowingStatus(statusMap);
      } catch (error) {
        console.error('Error fetching followers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load followers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, user, toast]);

  const handleFollowToggle = async (followerId: number, currentStatus: string) => {
    try {
      if (currentStatus === 'following') {
        // Unfollow
        await apiService.unfollowUser(followerId);
        setFollowingStatus((prev) => ({
          ...prev,
          [followerId]: 'not_following',
        }));
        toast({
          title: 'Unfollowed',
          description: 'You have unfollowed this user',
        });
      } else if (currentStatus === 'requested') {
        // Cancel request
        await apiService.unfollowUser(followerId);
        setFollowingStatus((prev) => ({
          ...prev,
          [followerId]: 'not_following',
        }));
        toast({
          title: 'Request Cancelled',
          description: 'Follow request cancelled',
        });
      } else {
        // Follow or send request
        const response = await apiService.followUser(followerId);
        const newStatus = response.data.detail === 'Follow request sent' ? 'requested' : 'following';
        setFollowingStatus((prev) => ({
          ...prev,
          [followerId]: newStatus,
        }));
        toast({
          title: newStatus === 'requested' ? 'Request Sent' : 'Following',
          description: newStatus === 'requested' 
            ? 'Follow request sent' 
            : 'You are now following this user',
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  const getFollowButtonText = (status: string) => {
    switch (status) {
      case 'following':
        return 'Following';
      case 'requested':
        return 'Requested';
      default:
        return 'Follow';
    }
  };

  const getFollowButtonVariant = (status: string): 'default' | 'outline' => {
    return status === 'following' || status === 'requested' ? 'outline' : 'default';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading followers...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {profileUser?.username}'s Followers
          </h1>
        </div>

        {/* Followers List */}
        <Card className="bg-gradient-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>
              {followers.length} {followers.length === 1 ? 'Follower' : 'Followers'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {followers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">No followers yet</h3>
                <p className="text-muted-foreground">
                  When people follow this user, they'll appear here.
                </p>
              </div>
            ) : (
              followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <Link
                    to={`/profile/${follower.username}`}
                    className="flex items-center space-x-4 flex-1"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-instagram shadow-md">
                      {follower.profile_pic ? (
                        <img
                          src={follower.profile_pic}
                          alt={follower.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">@{follower.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {follower.first_name} {follower.last_name}
                      </p>
                      {follower.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {follower.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Follow/Unfollow Button - Only show if not current user */}
                  {follower.id !== user?.id && (
                    <Button
                      variant={getFollowButtonVariant(followingStatus[follower.id] || 'not_following')}
                      size="sm"
                      onClick={() => handleFollowToggle(follower.id, followingStatus[follower.id] || 'not_following')}
                      className="ml-4"
                    >
                      {followingStatus[follower.id] === 'following' ? (
                        <UserMinus className="h-4 w-4 mr-1" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-1" />
                      )}
                      {getFollowButtonText(followingStatus[follower.id] || 'not_following')}
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Followers;
