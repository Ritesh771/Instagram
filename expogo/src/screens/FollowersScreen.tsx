import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';

const FollowersScreen: React.FC = ({ navigation, route }: any) => {
  // Dummy fallback data
  const dummyFollowers = [
    { id: 1, username: 'johndoe', full_name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 2, username: 'janesmith', full_name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { id: 3, username: 'mike_tyson', full_name: 'Mike Tyson', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { id: 4, username: 'anna_lee', full_name: 'Anna Lee', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' },
    { id: 5, username: 'tech_guru', full_name: 'Tech Guru', avatar: 'https://randomuser.me/api/portraits/men/5.jpg' },
  ];

  // Initialize followers state with isFollowing property
  const initialFollowers = route.params?.followers?.length > 0 ? route.params.followers : dummyFollowers;
  const [followersList, setFollowersList] = useState(initialFollowers.map(f => ({ ...f, isFollowing: false })));
  const [search, setSearch] = useState('');

  // Filter followers by search
  const filteredFollowers = followersList.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle follow/unfollow
  const toggleFollow = (id: number) => {
    setFollowersList(prev =>
      prev.map(f => f.id === id ? { ...f, isFollowing: !f.isFollowing } : f)
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={() => console.log('Go to user profile', item.username)}>
        <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          { backgroundColor: item.isFollowing ? '#fff' : '#3897f0', borderWidth: item.isFollowing ? 1 : 0, borderColor: '#3897f0' }
        ]}
        onPress={() => toggleFollow(item.id)}
      >
        <Text style={[styles.followButtonText, { color: item.isFollowing ? '#3897f0' : '#fff' }]}>
          {item.isFollowing ? 'Following' : 'Follow'}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Followers</Text>
      </View>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search followers..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredFollowers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginBottom: 10 },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: 50, 
  },

  searchContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },

  avatarWrapper: { marginRight: 15 },
  avatarImage: {
    width: 55,
    height: 55,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ff5a5f',
  },

  info: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: '#111' },
  fullName: { fontSize: 14, color: '#888', marginTop: 2 },

  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 50, marginBottom: 15 },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
});

export default FollowersScreen;
