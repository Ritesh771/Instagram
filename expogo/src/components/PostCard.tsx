import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '@/context/PostsContext';
import { useAuth } from '@/context/AuthContext';
import { useSecurity } from '@/context/SecurityContext';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { getBaseUrl } from '@/config/network';
import { Post, apiService } from '@/services/api';

interface PostCardProps {
  post: Post;
}

const { width } = Dimensions.get('window');

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { deletePost, updatePost } = usePosts();
  const { user } = useAuth();
  const { screenshotProtectionEnabled } = useSecurity();
  const isOwner = user?.id === post.user.id;
  
  // Local state for like status
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  // Enable screenshot protection for posts
  const { showWarning, isProtected } = useScreenshotProtection({
    enabled: screenshotProtectionEnabled,
    message: 'Screenshots of posts are not allowed'
  });

  const handleLike = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to like posts");
      return;
    }

    try {
      let response;
      if (isLiked) {
        response = await apiService.unlikePost(post.id);
      } else {
        response = await apiService.likePost(post.id);
      }
      
      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
      
      // Update the post in the context
      updatePost(post.id, {
        is_liked: response.data.liked,
        likes_count: response.data.likes_count
      });
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const result = await deletePost(post.id);
            if (!result.success) {
              Alert.alert("Delete Failed", result.message || "Failed to delete post");
            }
          }
        },
      ]
    );
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
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `${getBaseUrl()}${imagePath}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <LinearGradient
            colors={['#E1306C', '#F56040']}
            style={styles.avatar}
          >
            <Ionicons name="person" size={16} color="white" />
          </LinearGradient>
          <View style={styles.userDetails}>
            <Text style={styles.username}>@{post.user.username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {screenshotProtectionEnabled && (
            <TouchableOpacity 
              style={styles.protectionButton}
              onPress={showWarning}
            >
              <Ionicons name="shield-checkmark" size={16} color="#E1306C" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getImageUrl(post.image) }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "#E1306C" : "#6c757d"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#6c757d" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="send-outline" size={24} color="#6c757d" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes Count */}
      {likesCount > 0 && (
        <View style={styles.likesContainer}>
          <Text style={styles.likesText}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </View>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.usernameText}>@{post.user.username}</Text>
          <Text style={styles.captionText}> {post.caption}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  protectionButton: {
    padding: 6,
    marginRight: 4,
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderRadius: 12,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  usernameText: {
    fontWeight: '600',
    color: '#212529',
  },
  captionText: {
    color: '#212529',
  },
  likesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
});

export default PostCard;
