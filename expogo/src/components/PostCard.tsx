import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Post, apiService } from '@/services/api';

interface PostCardProps {
  post: Post;
}

const { width } = Dimensions.get('window');

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { deletePost } = usePosts();
  const { user } = useAuth();
  const navigation = useNavigation();

  const isOwner = user?.id === post.user.id;

  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number | null>(null);

  const triggerHeartAnimation = () => {
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const toggleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }
    try {
      let response;
      if (isLiked) {
        response = await apiService.unlikePost(post.id);
        setIsLiked(false);
        setLikesCount(response.data.likes_count);
      } else {
        response = await apiService.likePost(post.id);
        setIsLiked(true);
        setLikesCount(response.data.likes_count);
      }
    } catch (error: any) {
      if (error.response?.data?.error === 'Already liked') {
        setIsLiked(true);
        return;
      }
      Alert.alert('Error', error.response?.data?.error || 'Failed to update like status');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      if (!isLiked) toggleLike();
      triggerHeartAnimation();
    } else {
      lastTap.current = now;
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePost(post.id);
          if (!result.success) {
            Alert.alert('Delete Failed', result.message || 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const handleGoToProfile = () => {
    navigation.navigate('Profile' as never, { userId: post.user.id } as never);
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    return `http://192.168.2.7:8000${imagePath}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleGoToProfile}>
          <LinearGradient
            colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {post.user?.first_name?.[0]}{post.user?.last_name?.[0]}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.username}>{post.user?.username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#212529" />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Image */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: getImageUrl(post.image) }} style={styles.image} />
          <Animated.View
            style={[
              styles.heartOverlay,
              { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
            ]}
          >
            <Ionicons name="heart" size={100} color="white" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={toggleLike}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? 'red' : '#212529'} style={{ marginRight: 16 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes */}
      {likesCount > 0 && (
        <View style={styles.likesContainer}>
          <Text style={styles.likesText}>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</Text>
        </View>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.usernameText}>@{post.user.username}</Text>
        <Text style={styles.captionText}> {post.caption}</Text>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestampText}>{formatTimestamp(post.created_at)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarImage: { width: 34, height: 34, borderRadius: 17 },
  timestamp: { fontSize: 12, color: '#6c757d' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },  
  username: { fontWeight: '600', fontSize: 16, color: '#212529' },
  imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  heartOverlay: { position: 'absolute', top: '40%' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  leftActions: { flexDirection: 'row' },
  likesContainer: { paddingHorizontal: 12, paddingBottom: 6 },
  likesText: { fontWeight: '600', fontSize: 14 },
  captionContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  usernameText: { fontWeight: '600', fontSize: 14, color: '#212529', marginRight: 5 },
  captionText: { fontSize: 14, color: '#212529' },
  timestampText: { fontSize: 12, color: '#6c757d', paddingHorizontal: 12, paddingTop: 4 },
  
});

export default PostCard;
