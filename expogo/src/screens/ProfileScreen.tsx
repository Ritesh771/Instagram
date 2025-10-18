import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  TextInput, ScrollView, FlatList, Image, 
  Dimensions, Alert, Modal, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostsContext';
import { useFollow } from '@/context/FollowContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { User, apiService } from '@/services/api';

// Define the Post type
type Post = {
  id: number;
  user: User;
  image: string;
  caption: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
};

// Define navigation parameter types
type RootStackParamList = {
  PostView: { posts: Post[]; initialIndex: number };
  Followers: { userId?: number };
  Following: { userId?: number };
  Settings: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PostView'>;

// Extend the User interface to include the new can_view_posts property
interface UserProfile extends User {
  can_view_posts?: boolean;
  is_private?: boolean;
  followers_count?: number;
  following_count?: number;
}

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

const ProfileScreen: React.FC = () => {
  const { user: currentUser, updateProfile } = useAuth();
  const { posts } = usePosts();
  const { followStatus, updateFollowStatus, getFollowStatus, followUser, unfollowUser } = useFollow();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as { userId?: number } || {};

  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileFollowing, setProfileFollowing] = useState(false);
  const [profileRequested, setProfileRequested] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const scaleAnim = useState(new Animated.Value(0))[0];
  
  // Determine which user's profile to display
  const targetUserId = userId || currentUser?.id || 0;

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      // Reset loading state when userId changes
      if (targetUserId && targetUserId !== 0) {
        setLoading(true);
        setProfileUser(null);
        setIsPrivateProfile(false);
      }
      
      if (!targetUserId || targetUserId === 0) return;
      
      try {
        // Fetch user profile
        const userResponse = await apiService.getUserById(targetUserId);
        const userProfile: UserProfile = userResponse.data;
        setProfileUser(userProfile);
        setEditBio(userProfile.bio || '');
        
        // Check if it's the current user's own profile
        const isOwn = targetUserId === currentUser?.id;
        setIsOwnProfile(isOwn);
        setIsPrivateProfile(userProfile.is_private || false);
        
        // Set followers and following counts from the user profile
        setFollowersCount(userProfile.followers_count || 0);
        setFollowingCount(userProfile.following_count || 0);
        
        // Check if current user is following this profile (if not own profile)
        if (!isOwn && currentUser) {
          const contextFollowStatus = getFollowStatus(targetUserId);
          // If we don't have the status in context or it's outdated, refresh from API
          if (!contextFollowStatus || (!contextFollowStatus.isFollowing && !contextFollowStatus.isRequested)) {
            const followStatusResponse = await apiService.checkFollowStatus(targetUserId);
            setProfileFollowing(followStatusResponse.data.is_following);
            setProfileRequested(followStatusResponse.data.is_requested || false);
            // Update context with the fetched status
            updateFollowStatus(targetUserId, followStatusResponse.data.is_following, followStatusResponse.data.is_requested || false);
          } else {
            setProfileFollowing(contextFollowStatus.isFollowing);
            setProfileRequested(contextFollowStatus.isRequested);
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching profile data:', error);
        
        // Handle 403 error for private accounts
        const is403Error = error instanceof Error && 
          'response' in error && 
          (error as { response?: { status?: number } }).response?.status === 403;
        
        if (is403Error) {
          // For private accounts, we still want to show basic profile info
          setIsPrivateProfile(true);
          const isOwn = targetUserId === currentUser?.id;
          setIsOwnProfile(isOwn);
          
          // Try to get the username from any previous interactions or context
          let username = `user${targetUserId}`;
          let firstName = '';
          let lastName = '';
          let bio = 'Private account';
          
          // Try to get follow status which should work even for private accounts
          try {
            const followStatusResponse = await apiService.checkFollowStatus(targetUserId);
            setProfileFollowing(followStatusResponse.data.is_following);
            setProfileRequested(followStatusResponse.data.is_requested || false);
            // Update context with the fetched status
            updateFollowStatus(targetUserId, followStatusResponse.data.is_following, followStatusResponse.data.is_requested || false);
          } catch (followStatusError: unknown) {
            console.error('Error fetching follow status:', followStatusError);
            setProfileFollowing(false);
            setProfileRequested(false);
          }
          
          // Try to get user info from followers/following lists if we have them in context
          try {
            // Check if we can get the user from our own followers list
            if (currentUser) {
              const followersResponse = await apiService.getFollowers(currentUser.id);
              const follower = followersResponse.data.find((f: User) => f.id === targetUserId);
              if (follower) {
                username = follower.username;
                firstName = follower.first_name;
                lastName = follower.last_name;
                bio = follower.bio || 'Private account';
              } else {
                // Check if we can get the user from our own following list
                const followingResponse = await apiService.getFollowing(currentUser.id);
                const following = followingResponse.data.find((f: User) => f.id === targetUserId);
                if (following) {
                  username = following.username;
                  firstName = following.first_name;
                  lastName = following.last_name;
                  bio = following.bio || 'Private account';
                }
              }
            }
          } catch (listError: unknown) {
            console.error('Error fetching user from lists:', listError);
          }
          
          // Create a profile for private accounts with whatever information we could gather
          const privateProfile: UserProfile = {
            id: targetUserId,
            username: username,
            first_name: firstName,
            last_name: lastName,
            email: '',
            is_verified: false,
            two_factor_enabled: false,
            bio: bio,
            is_private: true,
            followers_count: 0,
            following_count: 0
          };
          
          console.log('Setting private profile:', privateProfile); // Debug log
          setProfileUser(privateProfile);
          setEditBio(bio);
        } else {
          Alert.alert('Error', 'Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [targetUserId, currentUser?.id]); // Removed followStatus from dependencies to prevent continuous polling

  // Update profile requested state when followStatus changes
  useEffect(() => {
    if (targetUserId && currentUser && !isOwnProfile) {
      const contextFollowStatus = getFollowStatus(targetUserId);
      setProfileFollowing(contextFollowStatus.isFollowing);
      setProfileRequested(contextFollowStatus.isRequested);
    }
  }, [followStatus, targetUserId, currentUser, isOwnProfile]);

  // Add a focus listener to refresh follow status when returning to the profile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh follow status when returning to the profile screen
      if (targetUserId && currentUser && !isOwnProfile) {
        const fetchFollowStatus = async () => {
          try {
            const followStatusResponse = await apiService.checkFollowStatus(targetUserId);
            setProfileFollowing(followStatusResponse.data.status === 'following');
            setProfileRequested(followStatusResponse.data.status === 'requested');
            // Update context with the fetched status
            updateFollowStatus(targetUserId, followStatusResponse.data.status === 'following', followStatusResponse.data.status === 'requested');
          } catch (error: unknown) {
            console.error('Error refreshing follow status:', error);
          }
        };
        
        fetchFollowStatus();
      }
    });

    return unsubscribe;
  }, [navigation, targetUserId, currentUser, isOwnProfile]);

  // Filter posts based on the profile being viewed
  const userPosts = useMemo(() => {
    if (!targetUserId || targetUserId === 0) return [];
    return posts.filter(post => post.user.id === (profileUser?.id || targetUserId));
  }, [posts, profileUser?.id, targetUserId]);

  const handleSaveBio = async () => {
    if (!isOwnProfile || !editBio.trim()) {
      Alert.alert('Error', 'Bio cannot be empty');
      return;
    }
    setIsUpdating(true);
    const result = await updateProfile({ bio: editBio });
    setIsUpdating(false);

    if (result.success) {
      Alert.alert('Success', 'Bio updated successfully');
      setIsEditingBio(false);
      // Update the profile user with the new bio
      if (profileUser) {
        setProfileUser({ ...profileUser, bio: editBio });
      }
    } else {
      Alert.alert('Error', result.message || 'Failed to update bio');
    }
  };

  const handleCancelEdit = () => {
    setEditBio(profileUser?.bio || '');
    setIsEditingBio(false);
  };

  const handleFollowUser = async () => {
    if (!profileUser || isOwnProfile) return;
    
    try {
      const success = await followUser(profileUser.id);
      if (success) {
        // Get the updated status from context
        const status = followStatus[profileUser.id] || { isFollowing: false, isRequested: false };
        
        if (status.isRequested) {
          Alert.alert('Follow Request Sent', `Your follow request to @${profileUser.username} has been sent.`);
          setProfileFollowing(false);
          setProfileRequested(true);
        } else if (status.isFollowing) {
          Alert.alert('Success', `You are now following @${profileUser.username}.`);
          setProfileFollowing(true);
          setProfileRequested(false);
          // Update follower count
          setFollowersCount(prev => prev + 1);
        }
        
        // Refresh the profile data to get updated counts if possible
        try {
          const updatedProfileResponse = await apiService.getUserById(profileUser.id);
          const updatedProfile: UserProfile = updatedProfileResponse.data;
          setProfileUser(updatedProfile);
          setFollowersCount(updatedProfile.followers_count || 0);
          setFollowingCount(updatedProfile.following_count || 0);
        } catch (error) {
          // If we can't refresh the profile (e.g., still private), that's okay
          console.error('Error refreshing profile data:', error);
        }
      } else {
        Alert.alert('Error', 'Failed to follow user');
      }
    } catch (error) {
      const apiError = apiService.handleError(error);
      Alert.alert('Error', apiError.message);
    }
  };

  const handleUnfollowUser = async () => {
    if (!profileUser || isOwnProfile) return;
    
    try {
      const success = await unfollowUser(profileUser.id);
      if (success) {
        Alert.alert('Success', `You have unfollowed @${profileUser.username}.`);
        setProfileFollowing(false);
        setProfileRequested(false);
        // Update follower count
        setFollowersCount(prev => Math.max(0, prev - 1));
        
        // Refresh the profile data to get updated counts if possible
        try {
          const updatedProfileResponse = await apiService.getUserById(profileUser.id);
          const updatedProfile: UserProfile = updatedProfileResponse.data;
          setProfileUser(updatedProfile);
          setFollowersCount(updatedProfile.followers_count || 0);
          setFollowingCount(updatedProfile.following_count || 0);
        } catch (error) {
          // If we can't refresh the profile (e.g., still private), that's okay
          console.error('Error refreshing profile data:', error);
        }
      } else {
        Alert.alert('Error', 'Failed to unfollow user');
      }
    } catch (error) {
      const apiError = apiService.handleError(error);
      Alert.alert('Error', apiError.message);
    }
  };

  const handleLongPress = (post: Post) => {
    setSelectedPost(post);
    setIsPreviewing(true);
    scaleAnim.setValue(0);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleRelease = () => {
    if (!isPreviewing) return;
    setIsPreviewing(false);

    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setSelectedPost(null));
  };

  const renderPhoto = ({ item }: { item: Post }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        // Navigate to post view with all user posts and the selected post index
        const postIndex = userPosts.findIndex((p: Post) => p.id === item.id);
        navigation.navigate('PostView', { 
          posts: userPosts, 
          initialIndex: postIndex 
        });
      }}
      onLongPress={() => handleLongPress(item)}
      onPressOut={handleRelease}
    >
      <Image source={{ uri: item.image }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show a limited profile view for private accounts we can't access
  if (!profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine if we can show posts based on the new can_view_posts flag or fallback logic
  // Also handle the case where we couldn't fetch the profile due to privacy restrictions
  const canViewPosts = profileUser && profileUser.can_view_posts !== undefined 
    ? profileUser.can_view_posts 
    : (profileUser && (!profileUser.is_private || isOwnProfile || profileFollowing));
  
  console.log('Profile user:', profileUser); // Debug log
  console.log('Can view posts:', canViewPosts); // Debug log
  console.log('Is own profile:', isOwnProfile); // Debug log
  console.log('Profile following:', profileFollowing); // Debug log

  return (
    <SafeAreaView style={styles.container}>
      {/* Use a single scrollable container */}
      <ScrollView>
        {/* Top Profile Section */}
        <View style={styles.topSection}>
          <View style={styles.userInfoContainer}>
            <LinearGradient
              colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {profileUser.first_name?.[0]}{profileUser.last_name?.[0]}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => {
                if (userPosts.length > 0 && canViewPosts) {
                  navigation.navigate('PostView', { 
                    posts: userPosts, 
                    initialIndex: 0 
                  });
                }
              }}
            >
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate('Followers', { userId: profileUser.id })
              }
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate('Following', { userId: profileUser.id })
              }
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username & Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.usernameText}>{profileUser.username}</Text>
          {isEditingBio && isOwnProfile ? (
            <View>
              <TextInput
                style={styles.bioInput}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />
              <View style={styles.bioEditButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveBio}>
                  <Text>{isUpdating ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.bioText}>{profileUser.bio || ''}</Text>
              {!isOwnProfile && (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    profileFollowing || profileRequested
                      ? styles.followingButton 
                      : styles.followButtonDefault
                  ]}
                  onPress={profileFollowing || profileRequested ? handleUnfollowUser : handleFollowUser}
                >
                  <Text style={[
                    styles.followButtonText,
                    profileFollowing || profileRequested
                      ? styles.followingButtonText 
                      : styles.followButtonDefaultText
                  ]}>
                    {profileRequested ? 'Requested' : profileFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Edit Profile + Settings */}
        {isOwnProfile && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditingBio(true)}>
              <Text>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
              <Text>Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('posts')}>
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTab]}>Posts</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid - Only show if user can view posts or if it's a public profile */}
        {canViewPosts && (
          <View>
            {/* Render posts directly instead of using FlatList to avoid nesting issue */}
            {userPosts.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {userPosts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      // Navigate to post view with all user posts and the selected post index
                      const postIndex = userPosts.findIndex((p: Post) => p.id === post.id);
                      navigation.navigate('PostView', { 
                        posts: userPosts, 
                        initialIndex: postIndex 
                      });
                    }}
                    onLongPress={() => handleLongPress(post)}
                    onPressOut={handleRelease}
                  >
                    <Image source={{ uri: post.image }} style={styles.gridImage} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPostsContainer}>
                <Text style={styles.emptyPostsText}>No posts yet</Text>
              </View>
            )}
          </View>
        )}

        {/* Private Account Message */}
        {!canViewPosts && (
          <View style={styles.privateAccountContainer}>
            <Text style={styles.privateAccountText}>
              This account is private. Follow to see their photos.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Post Preview Modal */}
      <Modal
        visible={isPreviewing}
        transparent
        onRequestClose={handleRelease}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleRelease}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {selectedPost && (
              <Image 
                source={{ uri: selectedPost.image }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  userInfoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsRow: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  bioEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  editProfileButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
  },
  settingsButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTab: {
    fontWeight: 'bold',
    color: '#000',
  },
  gridImage: {
    width: imageSize,
    height: imageSize,
    aspectRatio: 1,
  },
  emptyPostsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPostsText: {
    color: '#666',
    fontSize: 16,
  },
  privateAccountContainer: {
    padding: 40,
    alignItems: 'center',
  },
  privateAccountText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 100,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileScreen;