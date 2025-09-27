import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostsContext';

const ProfileScreen: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { posts } = usePosts();
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const userPosts = posts.filter(post => post.user.id === user?.id);

  const handleToggle2FA = async (enabled: boolean) => {
    setIsUpdating(true);
    const result = await updateProfile({ two_factor_enabled: enabled });
    
    if (result.success) {
      Alert.alert(
        enabled ? "2FA Enabled" : "2FA Disabled",
        enabled 
          ? "Two-factor authentication is now enabled. You'll receive OTP codes for future logins."
          : "Two-factor authentication is now disabled. You can log in with just your password."
      );
    } else {
      Alert.alert("Update Failed", result.message || "Failed to update 2FA settings");
    }
    setIsUpdating(false);
  };

  const handleSaveBio = async () => {
    setIsUpdating(true);
    const result = await updateProfile({ bio: editBio });
    
    if (result.success) {
      Alert.alert("Bio Updated", "Your bio has been updated successfully.");
      setIsEditingBio(false);
    } else {
      Alert.alert("Update Failed", result.message || "Failed to update bio");
    }
    setIsUpdating(false);
  };

  const handleCancelEdit = () => {
    setEditBio(user?.bio || '');
    setIsEditingBio(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      <View style={styles.bioContainer}>
        <View style={styles.bioHeader}>
          <Text style={styles.bioLabel}>Bio:</Text>
          {!isEditingBio && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditingBio(true)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isEditingBio ? (
          <View style={styles.bioEditContainer}>
            <TextInput
              style={styles.bioInput}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell us about yourself..."
              multiline
              maxLength={150}
              numberOfLines={3}
            />
            <Text style={styles.charCount}>{editBio.length}/150</Text>
            <View style={styles.bioEditButtons}>
              <TouchableOpacity 
                style={[styles.bioButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.bioButton, styles.saveButton]}
                onPress={handleSaveBio}
                disabled={isUpdating}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.bioText}>{user?.bio || 'No bio yet'}</Text>
        )}
      </View>

      <View style={styles.settingsContainer}>
        <TouchableOpacity style={styles.settingButton}>
          <Text style={styles.settingText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <View style={styles.settingButton}>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Two-Factor Auth: {user?.two_factor_enabled ? 'On' : 'Off'}</Text>
            <Switch
              value={user?.two_factor_enabled || false}
              onValueChange={handleToggle2FA}
              disabled={isUpdating}
            />
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.settingButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
  bioContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bioText: {
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioEditContainer: {
    marginTop: 10,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 10,
  },
  bioEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  bioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: 'red',
  },
});

export default ProfileScreen;
