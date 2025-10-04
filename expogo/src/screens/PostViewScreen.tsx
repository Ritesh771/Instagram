import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const PostViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { posts, initialIndex = 0 } = route.params as { posts: any[]; initialIndex?: number };
  const { user } = useAuth();

  // Enhance posts with local state for like, bookmark, and animations
  const [postList, setPostList] = useState(
    posts.map(post => ({
      ...post,
      isLiked: post.is_liked,
      likesCount: post.likes_count,
      isBookmarked: post.is_bookmarked || false,
      scaleAnim: new Animated.Value(0),
      lastTap: null as number | null,
    }))
  );

  const flatListRef = useRef<FlatList>(null);

  // Scroll to the tapped post when screen mounts
  useEffect(() => {
    setTimeout(() => {
      if (flatListRef.current && initialIndex < postList.length) {
        flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      }
    }, 200);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const triggerHeartAnimation = (index: number) => {
    const scaleAnim = postList[index].scaleAnim;
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => {
      Animated.timing(scaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    });
  };

  const toggleLike = async (index: number) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }
    try {
      const post = postList[index];
      let response;
      if (post.isLiked) response = await apiService.unlikePost(post.id);
      else response = await apiService.likePost(post.id);

      const updated = [...postList];
      updated[index].isLiked = response.data.liked;
      updated[index].likesCount = response.data.likes_count;
      setPostList(updated);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleDoubleTap = (index: number) => {
    const now = Date.now();
    const post = postList[index];
    if (post.lastTap && now - post.lastTap < 300) {
      if (!post.isLiked) toggleLike(index);
      triggerHeartAnimation(index);
    } else {
      const updated = [...postList];
      updated[index].lastTap = now;
      setPostList(updated);
    }
  };

  const renderPost = ({ item, index }: { item: any; index: number }) => {
    return (
      <View style={styles.postContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {item.user?.first_name?.[0]}
                {item.user?.last_name?.[0]}
              </Text>
            </LinearGradient>
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>{item.user?.username}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Image */}
        <TouchableWithoutFeedback onPress={() => handleDoubleTap(index)}>
          <View>
            <Image source={{ uri: item.image }} style={styles.postImage} />
            <Animated.View
              style={[
                styles.heartOverlay,
                { transform: [{ scale: item.scaleAnim }], opacity: item.scaleAnim },
              ]}
            >
              <Ionicons name="heart" size={100} color="white" />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity onPress={() => toggleLike(index)} style={styles.iconButton}>
              <Ionicons
                name={item.isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={item.isLiked ? 'red' : '#000'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Likes */}
        {item.likesCount > 0 && (
          <Text style={styles.likes}>
            {item.likesCount} {item.likesCount === 1 ? 'like' : 'likes'}
          </Text>
        )}

        {/* Caption */}
        {item.caption && (
          <Text style={styles.caption}>
            <Text style={styles.username}>{item.user?.username} </Text>
            {item.caption}
          </Text>
        )}

        {/* Timestamp */}
        <Text style={styles.timestampBottom}>{formatTimestamp(item.created_at).toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={postList}
      renderItem={renderPost}
      keyExtractor={item => item.id.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    />
  );
};

const styles = StyleSheet.create({
  postContainer: { flex: 1, backgroundColor: '#fff', marginBottom: 20 },
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
