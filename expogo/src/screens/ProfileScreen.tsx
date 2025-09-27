import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostsContext';
import { useSecurity } from '@/context/SecurityContext';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

const ProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile, logout } = useAuth();
  const { posts } = usePosts();
  const { screenshotProtectionEnabled, toggleScreenshotProtection } = useSecurity();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
  const [isLoading, setIsLoading] = useState(false);

  // Enable screenshot protection for the profile
  useScreenshotProtection({
    enabled: screenshotProtectionEnabled,
    message: 'Screenshots of profiles are not allowed'
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    
    const result = await updateProfile({
      bio: bio.trim(),
      two_factor_enabled: twoFactorEnabled,
    });
    
    if (result.success) {
      setIsEditing(false);
      Alert.alert("Profile Updated", "Your profile has been updated successfully!");
    } else {
      Alert.alert("Update Failed", result.message);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ]
    );
  };

  const userPosts = posts.filter(post => post.user.id === user?.id);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#E1306C', '#F56040']}
                  style={styles.avatar}
                >
                  <Ionicons name="person" size={40} color="white" />
                </LinearGradient>
              </View>
              
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              
              {user?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {/* Bio Section */}
            <View style={styles.bioSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(!isEditing)}
                >
                  <Ionicons 
                    name={isEditing ? "close" : "pencil"} 
                    size={16} 
                    color="#E1306C" 
                  />
                  <Text style={styles.editButtonText}>
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.bioInput}
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  
                  <View style={styles.twoFactorContainer}>
                    <Text style={styles.twoFactorLabel}>Two-Factor Authentication</Text>
                    <TouchableOpacity
                      style={styles.toggleContainer}
                      onPress={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    >
                      <View style={[
                        styles.toggle,
                        twoFactorEnabled && styles.toggleActive
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          twoFactorEnabled && styles.toggleThumbActive
                        ]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSaveProfile}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#E1306C', '#F56040']}
                      style={styles.saveButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.bioText}>
                  {user?.bio || 'No bio available'}
                </Text>
              )}
            </View>

            {/* Security Settings */}
            <View style={styles.securitySection}>
              <Text style={styles.sectionTitle}>Security Settings</Text>
              
              <View style={styles.securityItem}>
                <View style={styles.securityItemContent}>
                  <Ionicons name="shield-checkmark" size={20} color="#E1306C" />
                  <View style={styles.securityItemText}>
                    <Text style={styles.securityItemTitle}>Screenshot Protection</Text>
                    <Text style={styles.securityItemSubtitle}>
                      Prevent screenshots of posts and profiles
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.toggleContainer}
                  onPress={toggleScreenshotProtection}
                >
                  <View style={[
                    styles.toggle,
                    screenshotProtectionEnabled && styles.toggleActive
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      screenshotProtectionEnabled && styles.toggleThumbActive
                    ]} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Posts */}
            <View style={styles.postsSection}>
              <Text style={styles.sectionTitle}>Recent Posts</Text>
              {userPosts.length > 0 ? (
                <View style={styles.postsGrid}>
                  {userPosts.slice(0, 6).map((post) => (
                    <View key={post.id} style={styles.postThumbnail}>
                      <Text style={styles.postThumbnailText}>📷</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noPostsContainer}>
                  <Ionicons name="camera-outline" size={40} color="#6c757d" />
                  <Text style={styles.noPostsText}>No posts yet</Text>
                  <TouchableOpacity
                    style={styles.createPostButton}
                    onPress={() => navigation.navigate('Upload')}
                  >
                    <LinearGradient
                      colors={['#E1306C', '#F56040']}
                      style={styles.createPostButtonGradient}
                    >
                      <Ionicons name="add" size={16} color="white" />
                      <Text style={styles.createPostButtonText}>Create Post</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  logoutButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 4,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  bioSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#E1306C',
    marginLeft: 4,
    fontWeight: '600',
  },
  editForm: {
    marginTop: 16,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#212529',
    minHeight: 80,
    marginBottom: 16,
  },
  twoFactorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  twoFactorLabel: {
    fontSize: 16,
    color: '#212529',
  },
  toggleContainer: {
    padding: 4,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dee2e6',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#E1306C',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 24,
  },
  securitySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  securityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  securityItemText: {
    marginLeft: 12,
    flex: 1,
  },
  securityItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  securityItemSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  postsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  postThumbnail: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  postThumbnailText: {
    fontSize: 24,
  },
  noPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPostsText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 20,
  },
  createPostButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createPostButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createPostButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default ProfileScreen;
