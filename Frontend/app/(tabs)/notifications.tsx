import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TriangleAlert as AlertTriangle, Info, CircleCheck as CheckCircle, Clock, ShoppingBag, TrendingUp, DollarSign, Settings } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';

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

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Milk Running Low',
    message: 'You have 1 liter of milk left. Based on your usage, it will finish in 2 days.',
    timestamp: '2 hours ago',
    category: 'inventory',
    read: false,
    actionable: true,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Budget Alert',
    message: 'You\'ve spent $320 of your $500 monthly grocery budget (64%).',
    timestamp: '5 hours ago',
    category: 'budget',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Smart Suggestion',
    message: 'Based on your family\'s preferences, consider buying bananas this week.',
    timestamp: '1 day ago',
    category: 'suggestion',
    read: true,
    actionable: true,
  },
  {
    id: '4',
    type: 'alert',
    title: 'Bread Expires Soon',
    message: 'Your bread will expire in 1 day. Consider using it or adding toast to your meal plan.',
    timestamp: '1 day ago',
    category: 'inventory',
    read: true,
  },
  {
    id: '5',
    type: 'success',
    title: 'Weekly Goal Achieved',
    message: 'Great job! You stayed within budget this week and tried 2 new healthy recipes.',
    timestamp: '2 days ago',
    category: 'system',
    read: true,
  },
  {
    id: '6',
    type: 'warning',
    title: 'Usage Pattern Change',
    message: 'Your rice consumption has increased by 40% this month. Consider buying in bulk.',
    timestamp: '3 days ago',
    category: 'suggestion',
    read: true,
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, Notification[]> = {
      'Today': [],
      'Yesterday': [],
      'Earlier': [],
    };

    filteredNotifications.forEach(notification => {
      const notifDate = notification.timestamp;
      if (notifDate.includes('hour') || notifDate.includes('minute')) {
        groups['Today'].push(notification);
      } else if (notifDate.includes('1 day ago')) {
        groups['Yesterday'].push(notification);
      } else {
        groups['Earlier'].push(notification);
      }
    });

    return groups;
  };

  const renderNotification = (notification: Notification, index: number) => {
    const IconComponent = getIcon(notification.type, notification.category);
    const iconColor = getIconColor(notification.type);
    const bgColor = getBgColor(notification.type);

    return (
      <Animated.View 
        key={notification.id}
        entering={FadeInDown.delay(100 * index)}
      >
        <TouchableOpacity
          onPress={() => markAsRead(notification.id)}
          activeOpacity={0.7}
        >
          <Card style={[
            styles.notificationCard,
            !notification.read && styles.unreadCard
          ]}>
            <View style={styles.notificationContent}>
              <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                <IconComponent size={20} color={iconColor} />
              </View>
              
              <View style={styles.textContainer}>
                <View style={styles.headerRow}>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read && styles.unreadTitle
                  ]}>
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
                    <TouchableOpacity style={styles.actionButton}>
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
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive
            ]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'unread' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[
              styles.filterButtonText,
              filter === 'unread' && styles.filterButtonTextActive
            ]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => {
          if (groupNotifications.length === 0) return null;
          
          return (
            <View key={dateGroup} style={styles.dateGroup}>
              <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
              <View style={styles.notificationsList}>
                {groupNotifications.map((notification, index) => 
                  renderNotification(notification, index)
                )}
              </View>
            </View>
          );
        })}

        {filteredNotifications.length === 0 && (
          <Animated.View 
            entering={FadeInDown.delay(300)}
            style={styles.emptyState}
          >
            <CheckCircle size={64} color="#4ECDC4" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread' 
                ? 'No unread notifications'
                : 'No notifications to show'
              }
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#718096',
  },
  filterButtonTextActive: {
    color: '#2D3748',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6BCF7F',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dateGroup: {
    marginBottom: 28,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginBottom: 16,
    paddingLeft: 4,
  },
  notificationsList: {
    gap: 16,
  },
  notificationCard: {
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    backgroundColor: '#FFFFFF',
  },
  unreadCard: {
    backgroundColor: '#FEFEFE',
    borderLeftColor: '#6BCF7F',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  notificationContent: {
    flexDirection: 'row',
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    flex: 1,
  },
  unreadTitle: {
    color: '#2D3748',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6BCF7F',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestampText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#A0AEC0',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6BCF7F',
    borderRadius: 12,
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    textAlign: 'center',
  },
});