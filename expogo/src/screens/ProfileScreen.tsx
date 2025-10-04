import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  TextInput, ScrollView, FlatList, Image, 
  Dimensions, Alert, Modal, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostsContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; // make sure to import this


const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

const ProfileScreen: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { posts } = usePosts();
  const navigation = useNavigation();

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null); // for modal
  const scaleAnim = useState(new Animated.Value(0))[0]; // scale animation
  const userPosts = posts.filter(post => post.user.id === user?.id);

  const handleSaveBio = async () => {
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
    setEditBio(user?.bio || '');
    setIsEditingBio(false);
  };

  const handleLongPress = (post: any) => {
    setSelectedPost(post);
    setIsPreviewing(true); // user is holding
    scaleAnim.setValue(0);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleRelease = () => {
    if (!isPreviewing) return; // only close if actually previewing
    setIsPreviewing(false);

    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setSelectedPost(null));
  };

  const renderPhoto = ({ item, index }: { item: any; index: number }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => {
      // Navigate to PostView with full list and index
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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Top Profile Section */}
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.userInfo}>
            <LinearGradient
              colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => {
                if (userPosts.length > 0) {
                  // Navigate to PostView with all posts and start from first one
                  navigation.navigate('PostView', {
                    posts: userPosts,
                    initialIndex: 0, // start from first post
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
                navigation.navigate('Followers', { followers: user?.followers || [] })
              }
            >
              <Text style={styles.statNumber}>{user?.followers?.length || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate('Following', { following: user?.following || [] })
              }
            >
              <Text style={styles.statNumber}>{user?.following?.length || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username & Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.usernameText}>{user?.username}</Text>
          {isEditingBio ? (
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
            <Text style={styles.bioText}>{user?.bio || ''}</Text>
          )}
        </View>

        {/* Edit Profile + Settings */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditingBio(true)}>
            <Text>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Text>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={styles.tabButton}>
            <Text style={[styles.tabText && styles.activeTab]}>Posts</Text>
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
            <Text style={styles.modalLikes}>{selectedPost?.likes || 0} Likes</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topSection: { flexDirection: 'row', padding: 15, alignItems: 'center' },
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
