import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronRight,
  CreditCard as Edit,
  Users,
  MapPin,
  Smartphone,
  Mail,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import authService from '@/services/authService';
import * as ImagePicker from 'expo-image-picker'; // If using Expo
import { useRouter } from 'expo-router'; // Add this import
import { useFocusEffect } from '@react-navigation/native';

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  region: string;
  familyMembers: number;
  picture?: string | null;
}

interface NotificationSettings {
  lowStock: boolean;
  budgetAlerts: boolean;
  suggestions: boolean;
  weeklyReports: boolean;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData>();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    lowStock: true,
    budgetAlerts: true,
    suggestions: false,
    weeklyReports: true,
  });
  const router = useRouter(); // Add this line

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // Fetch latest user data from backend and update AsyncStorage and state
  const fetchProfile = async () => {
    try {
      const userId = await authService.getUserId();
      if (!userId) throw new Error('User ID not found');
      const response = await fetch(
        `http://10.33.19.24:3000/api/users/${userId}`
      );
      let latestUser = await response.json();
      if (Array.isArray(latestUser)) latestUser = latestUser[0];
      if (!latestUser) throw new Error('No user data returned from backend');
      // Map user_id to id and user_name to name for compatibility
      const userToStore = {
        ...latestUser,
        id: latestUser.id || latestUser.user_id,
        name: latestUser.name || latestUser.user_name,
      };
      await authService.storeUserData(userToStore);
      setProfile({
        name:
          userToStore.user_metadata?.user_name ||
          userToStore.user_metadata?.name ||
          userToStore.user_name ||
          userToStore.name ||
          '',
        email: userToStore.email || '',
        phone: userToStore.phone_number || userToStore.phone || '',
        region: userToStore.region || '',
        familyMembers: userToStore.familyMembers || 1,
        picture: userToStore.profile_picture_url || userToStore.picture || null,
      });
    } catch (error) {
      console.error('Failed to fetch profile from backend:', error);
      // fallback to local storage if backend fails
      const userData = await authService.getUserData();
      if (userData) {
        setProfile({
          name:
            userData.user_metadata?.user_name ||
            userData.user_metadata?.name ||
            userData.user_name ||
            userData.name ||
            '',
          email: userData.email || '',
          phone: userData.phone_number || userData.phone || '',
          region: userData.region || '',
          familyMembers: userData.familyMembers || 1,
          picture: userData.profile_picture_url || userData.picture || null,
        });
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const menuItems = [
    {
      id: 'family',
      title: 'Family Members',
      subtitle: 'View and Modify Family Members',
      icon: Users,
      color: '#6BCF7F',
      bgColor: '#E8F5E8',
      onPress: () => {
        router.push('/family-members' as any);
      },
    },
    {
      id: 'preferences',
      title: 'Food Preferences',
      subtitle: 'Dietary restrictions & favorites',
      icon: Settings,
      color: '#4ECDC4',
      bgColor: '#E0F7FA',
      onPress: () => {},
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      subtitle: 'Manage your data and privacy',
      icon: Shield,
      color: '#A78BFA',
      bgColor: '#F3E8FF',
      onPress: () => {},
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: HelpCircle,
      color: '#FFB347',
      bgColor: '#FFF7ED',
      onPress: () => {},
    },
  ];
  const renderProfileInfo = () => (
    <Animated.View entering={FadeInUp.delay(200)}>
      <Card style={styles.profileCard} variant="elevated">
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.picture ? (
              <Image
                source={{ uri: profile.picture }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile
                    ? profile.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                    : ''}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: '/EditProfileScreen',
                params: {
                  profile: profile ? JSON.stringify(profile) : undefined,
                },
              })
            }
          >
            <Edit size={20} color="#6BCF7F" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileDetails}>
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Mail size={16} color="#718096" />
            </View>
            <Text style={styles.detailText}>{profile?.email}</Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Smartphone size={16} color="#718096" />
            </View>
            <Text style={styles.detailText}>{profile?.phone}</Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <MapPin size={16} color="#718096" />
            </View>
            <Text style={styles.detailText}>{profile?.region}</Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderNotificationSettings = () => (
    <Animated.View entering={FadeInDown.delay(300)}>
      <Card style={styles.notificationCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.notificationIconContainer}>
              <Bell size={20} color="#6BCF7F" />
            </View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
        </View>

        <View style={styles.notificationsList}>
          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationTitle}>Low Stock Alerts</Text>
              <Text style={styles.notificationSubtitle}>
                Get notified when items are running low
              </Text>
            </View>
            <Switch
              value={notifications.lowStock}
              onValueChange={() => handleNotificationToggle('lowStock')}
              trackColor={{ false: '#E2E8F0', true: '#C6F6D5' }}
              thumbColor={notifications.lowStock ? '#6BCF7F' : '#CBD5E0'}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationTitle}>Budget Alerts</Text>
              <Text style={styles.notificationSubtitle}>
                Alerts when approaching budget limits
              </Text>
            </View>
            <Switch
              value={notifications.budgetAlerts}
              onValueChange={() => handleNotificationToggle('budgetAlerts')}
              trackColor={{ false: '#E2E8F0', true: '#C6F6D5' }}
              thumbColor={notifications.budgetAlerts ? '#6BCF7F' : '#CBD5E0'}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationTitle}>Smart Suggestions</Text>
              <Text style={styles.notificationSubtitle}>
                Personalized shopping recommendations
              </Text>
            </View>
            <Switch
              value={notifications.suggestions}
              onValueChange={() => handleNotificationToggle('suggestions')}
              trackColor={{ false: '#E2E8F0', true: '#C6F6D5' }}
              thumbColor={notifications.suggestions ? '#6BCF7F' : '#CBD5E0'}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={styles.notificationTitle}>Weekly Reports</Text>
              <Text style={styles.notificationSubtitle}>
                Summary of your grocery activities
              </Text>
            </View>
            <Switch
              value={notifications.weeklyReports}
              onValueChange={() => handleNotificationToggle('weeklyReports')}
              trackColor={{ false: '#E2E8F0', true: '#C6F6D5' }}
              thumbColor={notifications.weeklyReports ? '#6BCF7F' : '#CBD5E0'}
            />
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderMenuItem = (item: any, index: number) => (
    <Animated.View key={item.id} entering={FadeInDown.delay(400 + 100 * index)}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <View
            style={[styles.menuItemIcon, { backgroundColor: item.bgColor }]}
          >
            <item.icon size={20} color={item.color} />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>{item.title}</Text>
            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#CBD5E0" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={24} color="#8B9DC3" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileInfo()}
        {renderNotificationSettings()}

        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={styles.menuCard}>
            <View style={styles.menuList}>
              {menuItems.map((item, index) => renderMenuItem(item, index))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(600)}
          style={styles.logoutContainer}
        >
          <Button
            title="Sign Out"
            onPress={() => {}}
            variant="outline"
            icon={<LogOut size={20} color="#FF6B6B" />}
            style={styles.logoutButton}
            textStyle={styles.logoutText}
          />
        </Animated.View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>GrocyGenie v1.0.0</Text>
          <Text style={styles.appInfoText}>
            Made with 💚 for smart grocery management
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  settingsButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6BCF7F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
  },
  profileRegion: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  editButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
  },
  profileDetails: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
  },
  notificationCard: {
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  notificationsList: {
    gap: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  notificationSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  menuCard: {
    padding: 8,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  menuList: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  menuItemSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  logoutContainer: {
    marginBottom: 32,
  },
  logoutButton: {
    borderColor: '#FF6B6B',
  },
  logoutText: {
    color: '#FF6B6B',
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: 32,
    gap: 6,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
