import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  TextInput, ScrollView, FlatList, Image, 
  Dimensions, Alert, Modal, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostsContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, User } from '@/services/api';

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

// Define follower/following data structure based on FollowersScreen and FollowingScreen
type FollowUser = {
  id: number;
  username: string;
  full_name?: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  isFollowing?: boolean;
};

// Define navigation parameter types
type RootStackParamList = {
  PostView: { posts: Post[]; initialIndex: number };
  Followers: { followers: FollowUser[] };
  Following: { following: FollowUser[] };
  Settings: undefined;
  Profile: { userId?: number };
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

type ProfileScreenRouteParams = {
  userId?: number;
};

type Post = {
  id: number;
  user: User;
  image: string;
  caption: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
};

// Define user with additional properties for followers/following counts
type UserProfile = User & {
  followers_count?: number;
  following_count?: number;
};

const ProfileScreen: React.FC = () => {
  const { user: currentUser, updateProfile } = useAuth();
  const { posts } = usePosts();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute();
  const { userId } = route.params as ProfileScreenRouteParams;

  // State for the user whose profile is being viewed
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const scaleAnim = useState(new Animated.Value(0))[0];
  
  // Determine if we're viewing our own profile
  const isOwnProfile = !userId || userId === currentUser?.id;
  const userPosts = posts.filter(post => post.user.id === (isOwnProfile ? currentUser?.id : profileUser?.id));

  // Fetch user data if viewing another user's profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || userId === currentUser?.id) {
        // Viewing own profile
        setProfileUser({
          ...currentUser,
          followers_count: 0, // In a real app, this would come from the API
          following_count: 0  // In a real app, this would come from the API
        } as UserProfile);
        setEditBio(currentUser?.bio || '');
        return;
      }
      
      // Viewing another user's profile
      setLoadingUser(true);
      try {
        const response = await apiService.getProfile();
        // Note: We're using the existing getProfile API, but in a real app you would have
        // a specific endpoint to get another user's profile by ID
        setProfileUser({
          ...response.data,
          followers_count: 0, // In a real app, this would come from the API
          following_count: 0  // In a real app, this would come from the API
        });
      } catch (error) {
        console.log('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load user profile');
        navigation.goBack();
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchUserProfile();
  }, [userId, currentUser]);

  // Update bio when profile user changes
  useEffect(() => {
    if (profileUser) {
      setEditBio(profileUser.bio || '');
    }
  }, [profileUser]);

  const handleSaveBio = async () => {
    if (!isOwnProfile) return;
    
    if (!editBio.trim()) {
      Alert.alert('Error', 'Bio cannot be empty');
      return;
    }
    setIsUpdating(true);
    const result = await updateProfile({ bio: editBio });
    setIsUpdating(false);

    if (result.success) {
      Alert.alert('Success', 'Bio updated successfully');
      setIsEditingBio(false);
    } else {
      Alert.alert('Error', result.message || 'Failed to update bio');
    }
  };

  const handleCancelEdit = () => {
    setEditBio(profileUser?.bio || '');
    setIsEditingBio(false);
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

  const renderPhoto = ({ item, index }: { item: Post; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        navigation.navigate('PostView', { 
          posts: userPosts, 
          initialIndex: index 
        });
      }}
      onLongPress={() => handleLongPress(item)}
      onPressOut={handleRelease}
    >
      <Image source={{ uri: item.image }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  // Show loading state
  if (loadingUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no profile user, show nothing
  if (!profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Top Profile Section */}
        <View style={styles.topSection}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {profileUser?.first_name?.[0]}{profileUser?.last_name?.[0]}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => {
                if (userPosts.length > 0) {
                  navigation.navigate('PostView', {
                    posts: userPosts,
                    initialIndex: 0,
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
                navigation.navigate('Followers', { followers: [] })
              }
            >
              <Text style={styles.statNumber}>{profileUser?.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate('Following', { following: [] })
              }
            >
              <Text style={styles.statNumber}>{profileUser?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username & Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.usernameText}>{profileUser?.username}</Text>
          {isOwnProfile && isEditingBio ? (
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
            <Text style={styles.bioText}>{profileUser?.bio || ''}</Text>
          )}
        </View>

        {/* Edit Profile + Settings - only for own profile */}
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
          <TouchableOpacity style={styles.tabButton}>
            <Text style={[styles.tabText, styles.activeTab]}>Posts</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <FlatList
          data={userPosts}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Modal for Long Press Preview */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="none"
        onRequestClose={handleRelease}
      >
        <View style={styles.modalBackground}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <Image source={{ uri: selectedPost?.image }} style={styles.modalImage} />
            <Text style={styles.modalLikes}>{selectedPost?.likes_count || 0} Likes</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topSection: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  stat: { alignItems: 'center' },
  statNumber: { fontWeight: 'bold', fontSize: 16 },
  statLabel: { fontSize: 14, color: '#666' },
  bioSection: { paddingHorizontal: 15, paddingVertical: 10 },
  usernameText: { fontWeight: 'bold', fontSize: 16 },
  bioText: { fontSize: 14, color: '#333' },
  bioInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginVertical: 8 },
  bioEditButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginRight: 10 },
  saveButton: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#007AFF', borderRadius: 6 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15, marginVertical: 10 },
  editProfileButton: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginRight: 5, alignItems: 'center' },
  settingsButton: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginLeft: 5, alignItems: 'center' },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e5e5', marginTop: 10 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { color: '#888', fontSize: 16 },
  activeTab: { color: '#000', fontWeight: 'bold' },
  gridImage: { width: imageSize, height: imageSize, margin: 1 },

  // Modal styles
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { alignItems: 'center' },
  modalImage: { width: screenWidth * 0.9, height: screenWidth * 0.9, resizeMode: 'cover', borderRadius: 10 },
  modalLikes: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '600' },
  closeButton: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#fff', borderRadius: 6 },
  closeButtonText: { color: '#000', fontWeight: '600' },
});

export default ProfileScreen;