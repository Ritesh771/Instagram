import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';

const FollowingScreen: React.FC = ({ navigation, route }: any) => {
  const { following } = route.params;

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.item} onPress={() => console.log('Go to user profile', item.username)}>
      <View style={styles.avatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.first_name?.[0]}{item.last_name?.[0]}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
      </View>
    </TouchableOpacity>
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
      <FlatList
        data={following}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  info: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: '#333' },
  fullName: { fontSize: 14, color: '#666', marginTop: 2 },

  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { backgroundColor: '#f0f0f0', padding: 20, borderRadius: 50, marginBottom: 15 },
  emptyIconText: { fontSize: 32 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
});

export default FollowingScreen;
