import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/PostCard';
import { Ionicons } from '@expo/vector-icons'; // For notification icon

const FeedScreen: React.FC = ({ navigation }: any) => {
  const { posts, isLoading, error, fetchPosts } = usePosts();
  const { user } = useAuth();

  const renderPost = ({ item }: { item: any }) => <PostCard post={item} />;

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Notification Icon */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchPosts} />}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  welcomeText: { fontSize: 18, fontWeight: 'bold' },
  notificationButton: { padding: 5 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
});

export default FeedScreen;
