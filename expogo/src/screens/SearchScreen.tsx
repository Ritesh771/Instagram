import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, User } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/context/FollowContext';

// Define TypeScript interfaces
interface UserData extends User {
  followers_count: number;
  following_count: number;
  is_private?: boolean;
  isFollowing?: boolean;
  isRequested?: boolean;
  full_name?: string;
  avatar?: string;
}

interface SearchResponse {
  data: User[];
}

interface StatusResponse {
  data: {
    status: string;
  };
}

interface ApiErrorResponse {
  data?: {
    detail?: string;
    error?: string;
  };
  status?: number;
}

interface ApiError {
  response?: ApiErrorResponse;
  message?: string;
}

// Define the navigation parameter types
type RootStackParamList = {
  UserProfile: { userId: number };
};

const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const { followStatus, updateFollowStatus, refreshAllRequestedStatus, followUser, unfollowUser, refreshFollowStatus } = useFollow();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search users based on query
  const searchUsers = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!text.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // If the query is a number, try to search by ID first
        let response: SearchResponse;
        if (/^\d+$/.test(text.trim())) {
          // Try to get user by ID directly
          try {
            const userResponse = await apiService.getUserById(parseInt(text.trim()));
            response = { data: [userResponse.data] };
          } catch (idError: unknown) {
            console.log('Error getting user by ID:', idError);
            // If getting by ID fails, fall back to search
            response = await apiService.searchUsers(text);
          }
        } else {
          // Regular search
          response = await apiService.searchUsers(text);
        }
        
        console.log('Search response for query "' + text + '":', response.data); // Debug log
        
        const users = response.data
          .filter((userData: User) => {
            const shouldFilter = userData.id !== user?.id; // Don't show the current user in search results
            return shouldFilter;
          })
          .map((userData: User) => {
            console.log('Mapping user data:', userData); // Debug log
            return {
              ...userData,
              full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              avatar: userData.profile_pic || `https://ui-avatars.com/api/?name=${userData.first_name || 'U'}+${userData.last_name || 'N'}&background=random`,
            } as UserData
          });
        
        // Fetch follow status for each user from context or API
        const usersWithStatus = await Promise.all(
          users.map(async (userData: UserData) => {
            console.log('Processing user with ID:', userData.id); // Debug log
            // Check if we already have the status in context
            const contextStatus = followStatus[userData.id];
            if (contextStatus) {
              console.log('Using context status for user:', userData.id, contextStatus); // Debug log
              return {
                ...userData,
                isFollowing: contextStatus.isFollowing,
                isRequested: contextStatus.isRequested
              };
            }
            
            // Otherwise fetch from API to ensure we have the latest status
            try {
              const statusResponse: StatusResponse = await apiService.checkFollowStatus(userData.id);
              console.log('API status response for user:', userData.id, statusResponse.data); // Debug log
              // Update context with the fetched status
              updateFollowStatus(userData.id, statusResponse.data.status === 'following', statusResponse.data.status === 'requested');
              return {
                ...userData,
                isFollowing: statusResponse.data.status === 'following',
                isRequested: statusResponse.data.status === 'requested'
              };
            } catch (err: unknown) {
              // If we can't get follow status, default to not following
              console.error(`Error checking follow status for user ${userData.id}:`, err);
              return {
                ...userData,
                isFollowing: false,
                isRequested: false
              };
            }
          })
        );
        
        console.log('Final search results:', usersWithStatus); // Debug log
        setResults(usersWithStatus);
      } catch (err: unknown) {
        const apiError = apiService.handleError(err);
        setError(apiError.message);
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Periodically refresh requested statuses
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllRequestedStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update search results when follow status changes
  useEffect(() => {
    setResults(prevResults => 
      prevResults.map(user => {
        const status = followStatus[user.id];
        if (status) {
          return {
            ...user,
            isFollowing: status.isFollowing,
            isRequested: status.isRequested
          };
        }
        return user;
      })
    );
  }, [followStatus]);

  // Add a more aggressive refresh when coming back to the screen
  useEffect(() => {
    const refreshOnFocus = navigation.addListener('focus', () => {
      // Refresh all results with current follow status
      if (query.trim()) {
        searchUsers(query);
      }
    });

    return refreshOnFocus;
  }, [navigation, query]);

  const handleFollowUser = async (userId: number, username: string) => {
    try {
      const success = await followUser(userId);
      if (success) {
        // Get the updated status from context
        const status = followStatus[userId] || { isFollowing: false, isRequested: false };
        
        if (status.isRequested) {
          Alert.alert('Follow Request Sent', `Your follow request to @${username} has been sent.`);
        } else if (status.isFollowing) {
          Alert.alert('Success', `You are now following @${username}.`);
        }
        
        // Refresh the specific user's status to ensure consistency
        setTimeout(async () => {
          await refreshFollowStatus(userId);
        }, 1000);
      } else {
        Alert.alert('Error', 'Failed to follow user');
      }
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      Alert.alert('Error', apiError.message);
      console.error('Error following user:', err);
    }
  };

  const handleUnfollowUser = async (userId: number, username: string) => {
    try {
      const success = await unfollowUser(userId);
      if (success) {
        Alert.alert('Success', `You have unfollowed @${username}.`);
        
        // Refresh the specific user's status to ensure consistency
        setTimeout(async () => {
          await refreshFollowStatus(userId);
        }, 1000);
      } else {
        Alert.alert('Error', 'Failed to unfollow user');
      }
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      Alert.alert('Error', apiError.message);
      console.error('Error unfollowing user:', err);
    }
  };

  const toggleFollow = async (userId: number, username: string, isFollowing: boolean, isRequested: boolean) => {
    if (isFollowing || isRequested) {
      handleUnfollowUser(userId, username);
    } else {
      handleFollowUser(userId, username);
    }
  };

  const renderUser = ({ item }: { item: UserData }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userContent}
        onPress={() => {
          console.log('Navigating to UserProfile with userId:', item.id);
          navigation.navigate('UserProfile', { userId: item.id });
        }}
      >
        <Image
          source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=U&background=random' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username || `user${item.id}`}</Text>
          {item.full_name && item.full_name.trim() !== '' && <Text style={styles.fullName}>{item.full_name}</Text>}
          {item.is_private && (
            <Text style={styles.privateIndicator}>Private account</Text>
          )}
          {item.bio && <Text style={styles.bioText} numberOfLines={1}>{item.bio}</Text>}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowing || item.isRequested
            ? styles.followingButton 
            : styles.followButtonDefault
        ]}
        onPress={() => toggleFollow(item.id, item.username || `user${item.id}`, item.isFollowing || false, item.isRequested || false)}
      >
        <Text style={[
          styles.followButtonText,
          item.isFollowing || item.isRequested
            ? styles.followingButtonText 
            : styles.followButtonDefaultText
        ]}>
          {item.isRequested ? 'Requested' : item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="small" color="#007AFF" />
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Search</Text>
      </View>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={query}
          onChangeText={searchUsers}
          autoFocus
          clearButtonMode="always"
        />
      </View>

      {/* Search Results */}
      {loading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={results}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            query.trim() ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    paddingVertical: 5, 
    alignItems: 'center', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#ccc',
    marginBottom: 10,
    marginTop: 40
  },
  headerText: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#111' 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    margin: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  userInfo: {
    marginLeft: 12,
  },
  username: { 
    fontWeight: '600', 
    fontSize: 16, 
    color: '#000' 
  },
  fullName: { 
    fontSize: 14, 
    color: '#555' 
  },
  privateIndicator: { 
    fontSize: 12, 
    color: '#888',
    fontStyle: 'italic'
  },
  bioText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  followButtonDefault: {
    backgroundColor: '#007AFF',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  followButtonDefaultText: {
    color: '#fff',
  },
  followingButtonText: {
    color: '#007AFF',
  },
  emptyContainer: { 
    marginTop: 50, 
    alignItems: 'center' 
  },
  emptyText: { 
    color: '#888', 
    fontSize: 16 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: { 
    color: 'red', 
    fontSize: 16, 
    textAlign: 'center',
  },
});

export default SearchScreen;