import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const NotificationsScreen: React.FC = () => {
  const notifications = [
    { id: 1, type: 'follow_request', message: 'John Doe sent you a follow request', avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, type: 'like', message: 'Jane liked your post', avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, type: 'follow_request', message: 'Alice sent you a follow request', avatar: 'https://i.pravatar.cc/150?img=3' },
  ];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'follow_request':
        return <Ionicons name="person-add-outline" size={22} color="#007AFF" />;
      case 'like':
        return <Ionicons name="heart-outline" size={22} color="#FF2D55" />;
      default:
        return <MaterialIcons name="notifications-none" size={22} color="#888" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.notificationCard}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{item.message}</Text>
        {item.type === 'follow_request' && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3897f0' }]}>
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }]}>
              <Text style={[styles.actionText, { color: '#333' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {item.type !== 'follow_request' && <View style={styles.iconContainer}>{renderIcon(item.type)}</View>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', paddingHorizontal: 10, paddingTop: 10 },

  // Header
  header: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginBottom: 10 },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#111' },

  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  messageContainer: { flex: 1 },
  message: { fontSize: 16, color: '#111', fontWeight: '500' },

  actions: { flexDirection: 'row', marginTop: 8, gap: 10 },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  iconContainer: { marginLeft: 10 },

  emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontSize: 16 },
});

export default NotificationsScreen;
