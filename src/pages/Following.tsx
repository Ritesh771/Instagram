import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import apiService, { User as UserType } from '@/services/api';

const Following: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [following, setFollowing] = useState<UserType[]>([]);
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

        // Fetch following list
        const response = await apiService.getFollowing(parseInt(userId));
        setFollowing(response.data);

        // Fetch follow status for each user being followed
        const statusMap: Record<number, string> = {};
        await Promise.all(
          response.data.map(async (followedUser) => {
            if (followedUser.id !== user?.id) {
              const statusResponse = await apiService.checkFollowStatus(followedUser.id);
              statusMap[followedUser.id] = statusResponse.data.status;
            }
          })
        );
        setFollowingStatus(statusMap);
      } catch (error) {
        console.error('Error fetching following:', error);
        toast({
          title: 'Error',
          description: 'Failed to load following list',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, user, toast]);

  const handleFollowToggle = async (followedUserId: number, currentStatus: string) => {
    try {
      if (currentStatus === 'following') {
        // Unfollow
        await apiService.unfollowUser(followedUserId);
        setFollowingStatus((prev) => ({
          ...prev,
          [followedUserId]: 'not_following',
        }));
        
        // If viewing own following list, remove from the list
        if (parseInt(userId || '0') === user?.id) {
          setFollowing((prev) => prev.filter((u) => u.id !== followedUserId));
        }
        
        toast({
          title: 'Unfollowed',
          description: 'You have unfollowed this user',
        });
      } else if (currentStatus === 'requested') {
        // Cancel request
        await apiService.unfollowUser(followedUserId);
        setFollowingStatus((prev) => ({
          ...prev,
          [followedUserId]: 'not_following',
        }));
        toast({
          title: 'Request Cancelled',
          description: 'Follow request cancelled',
        });
      } else {
        // Follow or send request
        const response = await apiService.followUser(followedUserId);
        const newStatus = response.data.detail === 'Follow request sent' ? 'requested' : 'following';
        setFollowingStatus((prev) => ({
          ...prev,
          [followedUserId]: newStatus,
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
            <p>Loading following...</p>
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
            {profileUser?.username}'s Following
          </h1>
        </div>

        {/* Following List */}
        <Card className="bg-gradient-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>
              {following.length} Following
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {following.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Not following anyone yet</h3>
                <p className="text-muted-foreground">
                  When this user follows people, they'll appear here.
                </p>
              </div>
            ) : (
              following.map((followedUser) => (
                <div
                  key={followedUser.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <Link
                    to={`/profile/${followedUser.username}`}
                    className="flex items-center space-x-4 flex-1"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-instagram shadow-md">
                      {followedUser.profile_pic ? (
                        <img
                          src={followedUser.profile_pic}
                          alt={followedUser.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">@{followedUser.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {followedUser.first_name} {followedUser.last_name}
                      </p>
                      {followedUser.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {followedUser.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Follow/Unfollow Button - Only show if not current user */}
                  {followedUser.id !== user?.id && (
                    <Button
                      variant={getFollowButtonVariant(followingStatus[followedUser.id] || 'not_following')}
                      size="sm"
                      onClick={() => handleFollowToggle(followedUser.id, followingStatus[followedUser.id] || 'not_following')}
                      className="ml-4"
                    >
                      {followingStatus[followedUser.id] === 'following' ? (
                        <UserMinus className="h-4 w-4 mr-1" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-1" />
                      )}
                      {getFollowButtonText(followingStatus[followedUser.id] || 'not_following')}
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

export default Following;
