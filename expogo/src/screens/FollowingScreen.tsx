import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';

const FollowingScreen: React.FC = ({ navigation, route }: any) => {
  // Dummy following data
  const dummyFollowing = [
    { id: 1, username: 'alice_w', full_name: 'Alice Walker', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 2, username: 'bob_the_builder', full_name: 'Bob Builder', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    { id: 3, username: 'charlie_chaplin', full_name: 'Charlie Chaplin', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { id: 4, username: 'diana_prince', full_name: 'Diana Prince', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' },
    { id: 5, username: 'elton_john', full_name: 'Elton John', avatar: 'https://randomuser.me/api/portraits/men/5.jpg' },
    { id: 6, username: 'fiona_shrek', full_name: 'Fiona Shrek', avatar: 'https://randomuser.me/api/portraits/women/6.jpg' },
    { id: 7, username: 'george_clooney', full_name: 'George Clooney', avatar: 'https://randomuser.me/api/portraits/men/7.jpg' },
    { id: 8, username: 'harry_potter', full_name: 'Harry Potter', avatar: 'https://randomuser.me/api/portraits/men/8.jpg' },
  ];

  const initialFollowing = route.params?.following?.length > 0 ? route.params.following : dummyFollowing;

  // Track follow state for each user
  const [followingList, setFollowingList] = useState(
    initialFollowing.map(user => ({ ...user, isFollowing: true }))
  );

  const [search, setSearch] = useState('');

  // Filter following by search
  const filteredFollowing = followingList.filter((f: any) =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle follow/unfollow
  const toggleFollow = (id: number) => {
    setFollowingList(prev =>
      prev.map(user =>
        user.id === id ? { ...user, isFollowing: !user.isFollowing } : user
      )
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={() => console.log('Go to user profile', item.username)}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {item.first_name?.[0]}{item.last_name?.[0]}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          { backgroundColor: item.isFollowing ? '#3897f0' : '#fff', borderWidth: item.isFollowing ? 0 : 1, borderColor: '#3897f0' }
        ]}
        onPress={() => toggleFollow(item.id)}
      >
        <Text style={[styles.followButtonText, { color: item.isFollowing ? '#fff' : '#3897f0' }]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>➡️</Text>
      </View>
      <Text style={styles.emptyTitle}>Not Following Anyone Yet</Text>
      <Text style={styles.emptySubtitle}>Once you follow someone, they will appear here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Following</Text>
      </View>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search following..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredFollowing}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: 50, 
  },

  // 🔍 Search Bar
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
  avatarFallback: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

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
  header: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginBottom: 10 },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 50, marginBottom: 15 },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
});

export default FollowingScreen;
