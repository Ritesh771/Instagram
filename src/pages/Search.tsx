import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, User, UserPlus, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import apiService, { User as UserType } from '@/services/api';

const Search: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingStatus, setFollowingStatus] = useState<Record<number, string>>({});
  const [recentSearches, setRecentSearches] = useState<UserType[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.searchUsers(searchQuery.trim());
        setSearchResults(response.data);

        // Fetch follow status for each user
        const statusMap: Record<number, string> = {};
        await Promise.all(
          response.data.map(async (searchedUser) => {
            if (searchedUser.id !== user?.id) {
              try {
                const statusResponse = await apiService.checkFollowStatus(searchedUser.id);
                statusMap[searchedUser.id] = statusResponse.data.status;
              } catch (error) {
                console.error('Error fetching follow status:', error);
                statusMap[searchedUser.id] = 'not_following';
              }
            }
          })
        );
        setFollowingStatus(statusMap);
      } catch (error) {
        console.error('Error searching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to search users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user, toast]);

  const handleFollowToggle = async (targetUserId: number, currentStatus: string) => {
    try {
      if (currentStatus === 'following') {
        await apiService.unfollowUser(targetUserId);
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: 'not_following',
        }));
        toast({
          title: 'Unfollowed',
          description: 'You have unfollowed this user',
        });
      } else if (currentStatus === 'requested') {
        await apiService.unfollowUser(targetUserId);
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: 'not_following',
        }));
        toast({
          title: 'Request Cancelled',
          description: 'Follow request cancelled',
        });
      } else {
        const response = await apiService.followUser(targetUserId);
        const newStatus = response.data.detail === 'Follow request sent' ? 'requested' : 'following';
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: newStatus,
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

  const saveToRecentSearches = (searchedUser: UserType) => {
    const updated = [
      searchedUser,
      ...recentSearches.filter((u) => u.id !== searchedUser.id),
    ].slice(0, 10); // Keep only 10 recent searches
    
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
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

  const renderUserItem = (searchedUser: UserType, showFollowButton: boolean = true) => (
    <div
      key={searchedUser.id}
      className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
    >
      <Link
        to={`/profile/${searchedUser.username}`}
        className="flex items-center space-x-4 flex-1"
        onClick={() => saveToRecentSearches(searchedUser)}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-instagram shadow-md flex-shrink-0">
          {searchedUser.profile_pic ? (
            <img
              src={searchedUser.profile_pic}
              alt={searchedUser.username}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">@{searchedUser.username}</p>
          <p className="text-sm text-muted-foreground truncate">
            {searchedUser.first_name} {searchedUser.last_name}
          </p>
          {searchedUser.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {searchedUser.bio}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{searchedUser.followers_count || 0} followers</span>
            <span>•</span>
            <span>{searchedUser.following_count || 0} following</span>
          </div>
        </div>
      </Link>

      {showFollowButton && searchedUser.id !== user?.id && (
        <Button
          variant={getFollowButtonVariant(followingStatus[searchedUser.id] || 'not_following')}
          size="sm"
          onClick={() => handleFollowToggle(searchedUser.id, followingStatus[searchedUser.id] || 'not_following')}
          className="ml-4 flex-shrink-0"
        >
          {followingStatus[searchedUser.id] === 'following' ? (
            <UserMinus className="h-4 w-4 mr-1" />
          ) : (
            <UserPlus className="h-4 w-4 mr-1" />
          )}
          {getFollowButtonText(followingStatus[searchedUser.id] || 'not_following')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Search</h1>
          
          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim().length >= 2 ? (
          <Card className="bg-gradient-card border-border/50 shadow-lg">
            <CardContent className="p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-subtle">
                    <SearchIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">No results found</h3>
                  <p className="text-muted-foreground">
                    Try searching for a different username
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                      {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'}
                    </h3>
                  </div>
                  {searchResults.map((searchedUser) => renderUserItem(searchedUser, true))}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Recent Searches */
          recentSearches.length > 0 && (
            <Card className="bg-gradient-card border-border/50 shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Recent</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                </div>
                {recentSearches.map((searchedUser) => renderUserItem(searchedUser, false))}
              </CardContent>
            </Card>
          )
        )}

        {/* Empty State */}
        {!searchQuery && recentSearches.length === 0 && (
          <Card className="bg-gradient-card border-border/50 shadow-lg">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-subtle">
                  <SearchIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Search for users</h3>
                <p className="text-muted-foreground max-w-sm">
                  Start typing in the search box above to find users by their username
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Search;
