import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { apiService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/context/FollowContext';

// Define TypeScript interfaces
interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_pic?: string;
}

interface Post {
  id: number;
}

interface NotificationItem {
  id: number;
  actor: User;
  notification_type: string;
  post?: Post;
  message: string;
  is_read: boolean;
  created_at: string;
  timestamp: string;
  read: boolean;
}

interface ApiResponse<T> {
  data: T;
}

interface NotificationResponse {
  id: number;
  actor: User;
  notification_type: string;
  post?: Post;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ApiError {
  response?: {
    status?: number;
  };
}

// Define navigation parameter types
type RootStackParamList = {
  UserProfile: { userId: number };
  PostView: { postId: number };
};

const NotificationsScreen: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { updateFollowStatus, refreshFollowStatus } = useFollow();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const notificationsResponse: ApiResponse<NotificationResponse[]> = await apiService.getNotifications();
      const allNotifications: NotificationItem[] = notificationsResponse.data.map((notification) => ({
        ...notification,
        timestamp: notification.created_at,
        read: notification.is_read
      }));
      
      setNotifications(allNotifications);
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      setError(apiError.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh notifications
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const notificationsResponse: ApiResponse<NotificationResponse[]> = await apiService.getNotifications();
      const allNotifications: NotificationItem[] = notificationsResponse.data.map((notification) => ({
        ...notification,
        timestamp: notification.created_at,
        read: notification.is_read
      }));
      
      setNotifications(allNotifications);
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      console.error('Error refreshing notifications:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      // Update the notification in the list
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      console.error('Error marking notification as read:', err);
    }
  };

  const handleAcceptRequest = async (requesterId: number, requesterName: string) => {
    try {
      await apiService.acceptFollowRequest(requesterId);
      
      // Update the follow status in the context - requester is now following current user
      updateFollowStatus(requesterId, true, false);
      
      // Also refresh the follow status from the backend to ensure consistency
      await refreshFollowStatus(requesterId);
      
      // Refresh notifications to show the new follow_accept notification
      await onRefresh();
      
      Alert.alert('Success', `You are now following ${requesterName}.`);
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      Alert.alert('Error', apiError.message);
      console.error('Error accepting follow request:', err);
      
      // If it's a 404 error, it might mean the request was already processed
      if (isApiErrorWithStatus(err, 404)) {
        // Refresh notifications to get the updated state
        await onRefresh();
      }
    }
  };

  const handleRejectRequest = async (requesterId: number, requesterName: string) => {
    try {
      await apiService.rejectFollowRequest(requesterId);
      
      // Update the follow status in the context - requester is not following and not requested
      updateFollowStatus(requesterId, false, false);
      
      // Also refresh the follow status from the backend to ensure consistency
      await refreshFollowStatus(requesterId);
      
      // Refresh notifications to ensure the list is up to date
      await onRefresh();
      
      Alert.alert('Success', `Follow request from ${requesterName} has been rejected.`);
    } catch (err: unknown) {
      const apiError = apiService.handleError(err);
      Alert.alert('Error', apiError.message);
      console.error('Error rejecting follow request:', err);
      
      // If it's a 404 error, it might mean the request was already processed
      if (isApiErrorWithStatus(err, 404)) {
        // Refresh notifications to get the updated state
        await onRefresh();
      }
    }
  };

  // Helper function to check if error has specific status
  const isApiErrorWithStatus = (err: unknown, status: number): boolean => {
    return (
      err instanceof Error && 
      'response' in err && 
      (err as ApiError).response?.status === status
    );
  };

  const renderFollowRequest = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
      <TouchableOpacity 
        style={styles.userContent}
        onPress={() => {
          handleMarkAsRead(item.id);
          navigation.navigate('UserProfile', { userId: item.actor.id });
        }}
      >
        <Image
          source={{ uri: item.actor.profile_pic || `https://ui-avatars.com/api/?name=${item.actor.first_name}+${item.actor.last_name}&background=random` }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.usernameText}>@{item.actor.username}</Text> wants to follow you
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item.actor.id, item.actor.username)}
        >
          <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item.actor.id, item.actor.username)}
        >
          <Text style={[styles.actionText, styles.acceptText]}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLikeNotification = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
      <TouchableOpacity 
        style={styles.userContent}
        onPress={() => {
          handleMarkAsRead(item.id);
          if (item.post) {
            navigation.navigate('PostView', { postId: item.post.id });
          }
        }}
      >
        <Image
          source={{ uri: item.actor.profile_pic || `https://ui-avatars.com/api/?name=${item.actor.first_name}+${item.actor.last_name}&background=random` }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.usernameText}>@{item.actor.username}</Text> liked your post
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderFollowAcceptNotification = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
      <TouchableOpacity 
        style={styles.userContent}
        onPress={() => {
          handleMarkAsRead(item.id);
          navigation.navigate('UserProfile', { userId: item.actor.id });
        }}
      >
        <Image
          source={{ uri: item.actor.profile_pic || `https://ui-avatars.com/api/?name=${item.actor.first_name}+${item.actor.last_name}&background=random` }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.usernameText}>@{item.actor.username}</Text> accepted your follow request
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCommentNotification = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
      <TouchableOpacity 
        style={styles.userContent}
        onPress={() => {
          handleMarkAsRead(item.id);
          if (item.post) {
            navigation.navigate('PostView', { postId: item.post.id });
          }
        }}
      >
        <Image
          source={{ uri: item.actor.profile_pic || `https://ui-avatars.com/api/?name=${item.actor.first_name}+${item.actor.last_name}&background=random` }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.usernameText}>@{item.actor.username}</Text> commented on your post: {item.message.substring(item.message.indexOf(':') + 2)}
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    switch (item.notification_type) {
      case 'follow_request':
        return renderFollowRequest({ item });
      case 'follow_accept':
        return renderFollowAcceptNotification({ item });
      case 'like':
        return renderLikeNotification({ item });
      case 'comment':
        return renderCommentNotification({ item });
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    marginTop: 40
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  usernameText: {
    fontWeight: 'bold',
  },
  timestampText: {
    fontSize: 12,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectText: {
    color: '#ff3b30',
  },
  acceptText: {
    color: '#fff',
  },
});

export default NotificationsScreen;