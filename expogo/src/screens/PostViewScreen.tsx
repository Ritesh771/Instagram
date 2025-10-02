import React from 'react';
import { 
  View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const PostViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { post } = route.params as { post: any };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.user?.first_name?.[0]}{post.user?.last_name?.[0]}
            </Text>
          </View>
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>{post.user?.username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Post Image */}
      <Image source={{ uri: post.image }} style={styles.postImage} />

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons
              name={post.liked ? "heart" : "heart-outline"}
              size={28}
              color={post.liked ? "red" : "#000"}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="bookmark-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      <Text style={styles.likes}>{post.likes || 0} likes</Text>

      {/* Caption */}
      {post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.user?.username} </Text>
          {post.caption}
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, marginTop: 40 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  usernameContainer: { flexDirection: 'column', justifyContent: 'center', maxWidth: screenWidth - 100 },
  username: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  timestamp: { fontSize: 12, color: '#888', marginTop: 2 },
  postImage: { width: screenWidth, height: screenWidth, resizeMode: 'cover' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  leftActions: { flexDirection: 'row' },
  iconButton: { marginRight: 15 },
  likes: { fontWeight: 'bold', marginHorizontal: 10, marginTop: 5 },
  caption: { marginHorizontal: 10, marginTop: 5 },
});

export default PostViewScreen;
