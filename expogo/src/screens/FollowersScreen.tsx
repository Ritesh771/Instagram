import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { apiService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@react-navigation/native';
import { useFollow } from '@/context/FollowContext';

const FollowersScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const { followStatus, updateFollowStatus, refreshAllRequestedStatus, followUser, unfollowUser } = useFollow();
  const route = useRoute();
  const { userId } = route.params as { userId?: number } || {};
  
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch followers data from backend
  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the user ID from route params or use current user's ID
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) {
          throw new Error('User ID not found');
        }
        
        const response = await apiService.getFollowers(targetUserId);
        const followersData = response.data.map((follower: any) => ({
          ...follower,
          full_name: `${follower.first_name} ${follower.last_name}`.trim(),
          avatar: follower.profile_pic || `https://ui-avatars.com/api/?name=${follower.first_name}+${follower.last_name}&background=random`
        }));
        
        // Fetch follow status for each user from context or API
        const followersWithStatus = await Promise.all(
          followersData.map(async (follower: any) => {
            // Check if we already have the status in context
            const contextStatus = followStatus[follower.id];
            if (contextStatus) {
              return {
                ...follower,
                isFollowing: contextStatus.isFollowing,
                isRequested: contextStatus.isRequested
              };
            }
            
            // Otherwise fetch from API to ensure we have the latest status
            try {
              const statusResponse = await apiService.checkFollowStatus(follower.id);
              // Update context with the fetched status
              updateFollowStatus(follower.id, statusResponse.data.is_following, statusResponse.data.is_requested || false);
              return {
                ...follower,
                isFollowing: statusResponse.data.is_following,
                isRequested: statusResponse.data.is_requested || false
              };
            } catch (err) {
              // If we can't get follow status, default to not following
              console.error(`Error checking follow status for user ${follower.id}:`, err);
              return {
                ...follower,
                isFollowing: false,
                isRequested: false
              };
            }
          })
        );
        
        setFollowersList(followersWithStatus);
      } catch (err) {
        const apiError = apiService.handleError(err);
        setError(apiError.message);
        console.error('Error fetching followers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId, user?.id]); // Removed followStatus from dependencies to prevent continuous polling

  // Periodically refresh requested statuses
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllRequestedStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update followers list when followStatus changes
  useEffect(() => {
    setFollowersList(prevFollowers => 
      prevFollowers.map(follower => {
        const status = followStatus[follower.id];
        if (status) {
          return {
            ...follower,
            isFollowing: status.isFollowing,
            isRequested: status.isRequested
          };
        }
        return follower;
      })
    );
  }, [followStatus]);

  // Filter followers by search
  const filteredFollowers = followersList.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle follow/unfollow
  const toggleFollow = async (id: number, username: string, isFollowing: boolean) => {
    try {
      if (isFollowing || followStatus[id]?.isRequested) {
        // Unfollow user
        const success = await unfollowUser(id);
        if (success) {
          Alert.alert('Success', `You have unfollowed @${username}.`);
        } else {
          Alert.alert('Error', 'Failed to unfollow user');
        }
      } else {
        // Follow user
        const success = await followUser(id);
        if (success) {
          // Get the updated status from context
          const status = followStatus[id] || { isFollowing: false, isRequested: false };
          
          if (status.isRequested) {
            Alert.alert('Follow Request Sent', `Your follow request to @${username} has been sent.`);
          } else if (status.isFollowing) {
            Alert.alert('Success', `You are now following @${username}.`);
          }
        } else {
          Alert.alert('Error', 'Failed to follow user');
        }
      }
    } catch (err) {
      const apiError = apiService.handleError(err);
      Alert.alert('Error', apiError.message);
      console.error('Error toggling follow:', err);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <TouchableOpacity 
        style={styles.avatarWrapper} 
        onPress={() => (navigation as any).navigate('UserProfile', { userId: item.id })}
      >
        <Image 
          source={{ uri: item.avatar }} 
          style={styles.avatarImage} 
        />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          { 
            backgroundColor: item.isFollowing || item.isRequested ? '#fff' : '#3897f0', 
            borderWidth: item.isFollowing || item.isRequested ? 1 : 0, 
            borderColor: '#3897f0' 
          }
        ]}
        onPress={() => toggleFollow(item.id, item.username, item.isFollowing)}
      >
        <Text style={[styles.followButtonText, { color: item.isFollowing || item.isRequested ? '#3897f0' : '#fff' }]}>
          {item.isRequested ? 'Requested' : item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>👥</Text>
      </View>
      <Text style={styles.emptyTitle}>No Followers Found</Text>
      <Text style={styles.emptySubtitle}>Try a different search.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Followers</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search followers..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Followers</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search followers..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginTop: 40,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  info: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullName: {
    color: '#666',
    fontSize: 14,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
  },
});

export default FollowersScreen;