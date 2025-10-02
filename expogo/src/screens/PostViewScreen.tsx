import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const PostViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { post } = route.params as { post: any };
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked || false);

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
      Alert.alert("Login Required", "Please log in to like posts");
      return;
    }
    try {
      let response;
      if (isLiked) response = await apiService.unlikePost(post.id);
      else response = await apiService.likePost(post.id);

      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to bookmark posts");
      return;
    }
    try {
      if (isBookmarked) {
        await apiService.unbookmarkPost(post.id);
        setIsBookmarked(false);
      } else {
        await apiService.bookmarkPost(post.id);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update bookmark status");
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      if (!isLiked) toggleLike();
      triggerHeartAnimation();
    } else lastTap.current = now;
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

  return (
    <ScrollView style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <LinearGradient
            colors={["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {post.user?.first_name?.[0]}{post.user?.last_name?.[0]}
            </Text>
          </LinearGradient>
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>{post.user?.username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Image */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View>
          <Image source={{ uri: post.image }} style={styles.postImage} />
          <Animated.View
            style={[styles.heartOverlay, { transform: [{ scale: scaleAnim }], opacity: scaleAnim }]}
          >
            <Ionicons name="heart" size={100} color="white" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={toggleLike} style={styles.iconButton}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "red" : "#000"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes */}
      {likesCount > 0 && (
        <Text style={styles.likes}>{likesCount} {likesCount === 1 ? "like" : "likes"}</Text>
      )}

      {/* Caption */}
      {post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.user?.username} </Text>
          {post.caption}
        </Text>
      )}

      {/* Timestamp */}
      <Text style={styles.timestampBottom}>{formatTimestamp(post.created_at).toUpperCase()}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, marginTop: 40 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  usernameContainer: { flexDirection: 'column', justifyContent: 'center', maxWidth: screenWidth - 120 },
  username: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  timestamp: { fontSize: 12, color: '#888', marginTop: 2 },
  postImage: { width: screenWidth, height: screenWidth, resizeMode: 'cover' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  leftActions: { flexDirection: 'row' },
  iconButton: { marginRight: 15 },
  likes: { fontWeight: 'bold', marginHorizontal: 10, marginTop: 5 },
  caption: { marginHorizontal: 10, marginTop: 5 },
  heartOverlay: { position: 'absolute', alignSelf: 'center', top: '40%' },
  timestampBottom: { fontSize: 10, color: '#888', marginHorizontal: 10, marginTop: 5, textTransform: 'uppercase' },
});

export default PostViewScreen;
