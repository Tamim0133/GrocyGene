import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TriangleAlert as AlertTriangle,
  Info,
  CircleCheck as CheckCircle,
  Clock,
  ShoppingBag,
  DollarSign,
  Settings,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import axios from 'axios';
import { Card } from '@/components/ui/Card';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleProp, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '@/services/authService';


const API_HOST = 'http://192.168.0.110:3000';

type NotificationType = 'alert' | 'info' | 'success' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  category: 'inventory' | 'budget' | 'suggestion' | 'system';
  read: boolean;
  actionable?: boolean;
}

export default function NotificationsScreen() {

  const router = useRouter();


  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await authService.getUserId();
        console.log("Fetching user ID from AsyncStorage:", id);
        if (id) {
          setUserId(id);
        }
      } catch (err) {
        console.error("Error fetching userId:", err);
      }
    };

    fetchUserId(); // Runs only once
  }, []); // 👈 this empty array is important

  // Extracted notification fetching logic
  const loadNotifications = async (uid: string) => {
    try {
      setLoading(true);
      const finishDateResponse = await axios.get(`${API_HOST}/api/finish_date/${uid}`);
      const finishData = finishDateResponse.data;

      const notificationsList: Notification[] = await Promise.all(
        finishData
          .filter((item: any) => {
            const finishDate = new Date(item.predicted_finish_date);
            const today = new Date();
            const diffTime = finishDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 8; // Filter out items finishing in more than 8 days
          })
          .map(async (item: any) => {

            const today = new Date();
            const finishDate = new Date(item.predicted_finish_date);
            const diffTime = finishDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let type: NotificationType = 'info';
            let title = '';
            let message = '';

            if (diffDays <= 2) {
              type = 'alert';
              title = `${item.product_name} running low`;
              message = `You have ${item.quantity} ${item.unit} of ${item.product_name} left. Expected to finish in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`;
            } else {
              title = `${item.product_name} stock update`;
              message = `You have ${item.quantity} ${item.unit}. Expected finish: ${finishDate.toLocaleDateString()}.`;
            }

            return {
              id: item.stock_id,
              type,
              title,
              message,
              timestamp: `${diffDays <= 0 ? 'Today' : `${diffDays} day${diffDays !== 1 ? 's' : ''} left`}`,
              category: 'inventory',
              read: false,
              actionable: type === 'alert',
            };
          })
      );

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadNotifications(userId);
    }
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      await loadNotifications(userId);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const getIcon = (type: NotificationType, category: string) => {
    if (category === 'inventory') return AlertTriangle;
    if (category === 'budget') return DollarSign;
    if (category === 'suggestion') return ShoppingBag;

    switch (type) {
      case 'alert': return AlertTriangle;
      case 'warning': return Clock;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'alert': return '#FF6B6B';
      case 'warning': return '#FFB347';
      case 'success': return '#4ECDC4';
      default: return '#6BCF7F';
    }
  };

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case 'alert': return '#FFF5F5';
      case 'warning': return '#FFFBEB';
      case 'success': return '#F0FDFA';
      default: return '#F0FDF4';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const groupNotificationsByDate = () => {
    const groups: Record<string, Notification[]> = {
      'Soon': [],
      'Later': [],
    };

    filteredNotifications.forEach(notification => {
      // Logic for 'Soon' notifications: type 'alert'
      if (notification.type === 'alert') {
        groups['Soon'].push(notification);
      } else {
        // All other notifications go to 'Later'
        groups['Later'].push(notification);
      }
    });

    return groups;
  };

  const renderNotification = (notification: Notification, index: number, groupName: string) => {
    const IconComponent = getIcon(notification.type, notification.category);
    const iconColor = getIconColor(notification.type);
    const bgColor = getBgColor(notification.type);

    // Determine border color based on the group
    // If 'Soon' group, set to red. Otherwise, use green for unread and transparent for read.
    const borderColor = groupName === 'Soon' ? '#FF6B6B' : (notification.read ? 'transparent' : '#6BCF7F');

    return (
      <Animated.View
        key={notification.id}
        entering={FadeInDown.delay(100 * index)}
      >
        <TouchableOpacity
          onPress={() => markAsRead(notification.id)}
          activeOpacity={0.7}
        >
          {/* Apply conditional borderLeftColor here */}
          <Card style={Object.assign({}, styles.notificationCard, { borderLeftColor: borderColor }, !notification.read ? styles.unreadCard : undefined)}>
            <View style={styles.notificationContent}>
              <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                <IconComponent size={20} color={iconColor} />
              </View>

              <View style={styles.textContainer}>
                <View style={styles.headerRow}>
                  <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]}>
                    {notification.title}
                  </Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.timestampText}>{notification.timestamp}</Text>
                  {notification.actionable && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/inventory-list?userId=${userId}`)}>
                      <Text style={styles.actionButtonText}>Take Action</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const groupedNotifications = groupNotificationsByDate();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up! 🎉'}
          </Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={24} color="#8B9DC3" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.filterContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => {
            if (groupNotifications.length === 0) return null;

            return (
              <View key={dateGroup} style={styles.dateGroup}>
                <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
                <View style={styles.notificationsList}>
                  {groupNotifications.map((notification, index) =>
                    renderNotification(notification, index, dateGroup) // Pass dateGroup here
                  )}
                </View>
              </View>
            );
          })}

          {filteredNotifications.length === 0 && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
              <CheckCircle size={64} color="#4ECDC4" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications to show'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter-Bold', color: '#2D3748' },
  subtitle: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#718096', marginTop: 4 },
  settingsButton: { padding: 12, borderRadius: 16, backgroundColor: '#F7FAFC' },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  filterButtons: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 16, padding: 4 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  filterButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#6BCF7F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  filterButtonText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#718096' },
  filterButtonTextActive: { color: '#2D3748' },
  markAllButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0FDF4' },
  markAllText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#6BCF7F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24 },
  dateGroup: { marginBottom: 28 },
  dateGroupTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#2D3748', marginBottom: 16, paddingLeft: 4 },
  notificationsList: { gap: 16 },
  // Reverted to borderLeftWidth and made it transparent by default
  notificationCard: { padding: 20, borderLeftWidth: 4, borderLeftColor: 'transparent', backgroundColor: '#FFFFFF' },
  // Updated unreadCard to *not* override borderLeftColor directly
  unreadCard: { backgroundColor: '#FEFEFE', shadowColor: '#6BCF7F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  notificationContent: { flexDirection: 'row', gap: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#2D3748', flex: 1 },
  unreadTitle: { color: '#2D3748' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6BCF7F', marginLeft: 8 },
  notificationMessage: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#4A5568', lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  timestampText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#A0AEC0' },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6BCF7F', borderRadius: 12, shadowColor: '#6BCF7F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  actionButtonText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 24, fontFamily: 'Inter-SemiBold', color: '#2D3748', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#718096', textAlign: 'center' },
});