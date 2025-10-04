import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Mock user data
const MOCK_USERS = [
  { id: 1, username: 'john_doe', first_name: 'John', last_name: 'Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, username: 'jane_smith', first_name: 'Jane', last_name: 'Smith', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, username: 'alex99', first_name: 'Alex', last_name: 'Johnson', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { id: 4, username: 'sarah_lee', first_name: 'Sarah', last_name: 'Lee', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' },
  { id: 5, username: 'michael22', first_name: 'Michael', last_name: 'Brown', avatar: 'https://randomuser.me/api/portraits/men/5.jpg' },
  { id: 6, username: 'emma_w', first_name: 'Emma', last_name: 'Wilson', avatar: 'https://randomuser.me/api/portraits/women/6.jpg' },
  { id: 7, username: 'daniel_k', first_name: 'Daniel', last_name: 'Kim', avatar: 'https://randomuser.me/api/portraits/men/7.jpg' },
];

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(MOCK_USERS);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Filter mock users based on query
  const searchUsers = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!text.trim()) {
        setResults(MOCK_USERS);
        return;
      }
      const filtered = MOCK_USERS.filter(user =>
        user.username.toLowerCase().includes(text.toLowerCase()) ||
        user.first_name.toLowerCase().includes(text.toLowerCase()) ||
        user.last_name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
    }, 300);
  };

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('Profile', { userId: item.id })}
    >
      <Image
        source={{ uri: item.avatar }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>{item.first_name} {item.last_name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
      <FlatList
        data={results}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff',paddingTop: 60 },
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
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
  username: { fontWeight: '600', fontSize: 16, color: '#000' },
  fullName: { fontSize: 14, color: '#555' },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
});

export default SearchScreen;
