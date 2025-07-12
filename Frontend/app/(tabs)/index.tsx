import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl, // Import RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  TrendingDown,
  ShoppingCart,
  CircleAlert as AlertCircle,
  Clock,
  DollarSign,
  ChartBar as BarChart3,
  ArrowRight,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import authService from '@/services/authService';

const API_HOST = 'http://10.198.218.8:3000';

interface InventoryItem {
  stock_id: string;
  products: {
    product_name: string;
    unit: string;
  };
  quantity: number;
  predicted_finish_date: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const mockSuggestions: SuggestionItem[] = [
  {
    id: '1',
    name: 'Bananas',
    reason: 'Running low based on usage',
    priority: 'high',
  },
  {
    id: '2',
    name: 'Chicken Breast',
    reason: 'Weekly protein schedule',
    priority: 'medium',
  },
  {
    id: '3',
    name: 'Yogurt',
    reason: 'Family preference pattern',
    priority: 'low',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true); // For initial load
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  const monthlyBudget = 500;
  const currentSpend = 320;

  // Function to fetch dashboard data
  const fetchData = async (isRefreshing = false) => {
    if (!userId) {
      // If userId is not yet available, and it's not a refresh, set loading
      if (!isRefreshing) setLoading(true);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null); // Clear previous errors on new fetch attempt

    try {
      console.log('Fetching dashboard data for user:', userId);
      const response = await axios.get(
        `${API_HOST}/api/users/${userId}/stocks`,
        {
          timeout: 10000,
        }
      );
      console.log(
        'Dashboard data fetched successfully:',
        response.data?.length || 0,
        'items'
      );
      setInventory(response.data || []);
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          setError('User not found');
        } else if (e.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else if (e.code === 'ECONNABORTED') {
          setError('Request timeout. Please check your connection.');
        } else {
          // Only show network error if it's not a 404 or 500
          if (!e.response) {
            setError(`Network error: ${e.message}`);
          } else {
            setError(e.response.data?.error || 'An unexpected error occurred');
          }
        }
      } else {
        setError('An unexpected error occurred');
      }
      setInventory([]); // Set empty inventory on error
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Initial fetch of user ID
  useEffect(() => {
    const getUserId = async () => {
      try {
        const id = await authService.getUserId();
        console.log('User ID fetched:', id);
        setUserId(id);
      } catch (error) {
        console.error('Error fetching user ID:', error);
        setError('Failed to get user information');
        setLoading(false); // Stop loading if user ID fetch fails
      }
    };
    getUserId();
  }, []);

  // Fetch dashboard data when userId changes or on refresh
  useEffect(() => {
    if (userId) {
      fetchData(); // Initial fetch or re-fetch if userId changes
    }
  }, [userId]);

  // onRefresh handler for RefreshControl
  const onPullToRefresh = () => {
    fetchData(true); // Pass true to indicate it's a refresh
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFB347';
      default:
        return '#4ECDC4';
    }
  };

  const urgentItems = inventory.filter((item) => {
    const daysLeft =
      (new Date(item.predicted_finish_date).getTime() - new Date().getTime()) /
      (1000 * 3600 * 24);
    return daysLeft <= 3;
  });

  const totalItems = inventory.length;

  const handleViewAllInventory = () => {
    if (!userId) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    router.push(`/inventory-list?userId=${userId}`);
  };

  const renderInventoryItem = (item: InventoryItem) => {
    const daysLeft = Math.ceil(
      (new Date(item.predicted_finish_date).getTime() - new Date().getTime()) /
      (1000 * 3600 * 24)
    );

    return (
      <View key={item.stock_id} style={styles.inventoryItem}>
        <View style={styles.inventoryItemContent}>
          <View>
            <Text style={styles.inventoryItemName}>
              {item.products.product_name}
            </Text>
            <Text style={styles.inventoryItemDetails}>
              {item.quantity} {item.products.unit}
            </Text>
          </View>
          <View style={styles.inventoryItemRight}>
            <View
              style={[
                styles.daysLeftBadge,
                { backgroundColor: daysLeft <= 3 ? '#FFE5E5' : '#E8F5E8' },
              ]}
            >
              <Text
                style={[
                  styles.daysLeftText,
                  { color: daysLeft <= 3 ? '#FF6B6B' : '#52C41A' },
                ]}
              >
                {daysLeft > 0 ? `${daysLeft}d` : 'Due'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSuggestion = (suggestion: SuggestionItem) => (
    <TouchableOpacity key={suggestion.id} style={styles.suggestionItem}>
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionLeft}>
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: getPriorityColor(suggestion.priority) },
            ]}
          />
          <View>
            <Text style={styles.suggestionName}>{suggestion.name}</Text>
            <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
          </View>
        </View>
        <View style={styles.suggestionActions}>
          <TouchableOpacity style={styles.buyNowButton}>
            <Text style={styles.buyNowText}>Buy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show error state
  if (error && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              fetchData(); // Retry fetching data
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            tintColor="#6BCF7F" // Customize spinner color
          />
        }
      >
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning! 🌱</Text>
            <Text style={styles.subtitle}>Here's your grocery overview</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <LinearGradient
              colors={['#6BCF7F', '#4ECDC4']}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileText}>JD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          {/* Stats Cards */}
          <Animated.View
            entering={FadeInDown.delay(300)}
            style={styles.statsContainer}
          >
            <Card style={styles.statCard} variant="glass">
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Package size={24} color="#6BCF7F" />
                </View>
                <View>
                  {loading ? (
                    <ActivityIndicator size="small" color="#6BCF7F" />
                  ) : (
                    <Text style={styles.statValue}>{totalItems}</Text>
                  )}
                  <Text style={styles.statLabel}>Items in Stock</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.statCard} variant="glass">
              <View style={styles.statContent}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: '#FFE5E5' },
                  ]}
                >
                  <AlertCircle size={24} color="#FF6B6B" />
                </View>
                <View>
                  {loading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.statValue}>{urgentItems.length}</Text>
                  )}
                  <Text style={styles.statLabel}>Running Low</Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Budget Overview */}
          <Animated.View entering={FadeInDown.delay(400)}>
            <Card style={styles.budgetCard} variant="elevated">
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <View style={styles.budgetIconContainer}>
                    <DollarSign size={20} color="#6BCF7F" />
                  </View>
                  <Text style={styles.cardTitle}>Monthly Budget</Text>
                </View>
                <TouchableOpacity style={styles.chartButton}>
                  <BarChart3 size={20} color="#8B9DC3" />
                </TouchableOpacity>
              </View>
              <View style={styles.budgetContent}>
                <View style={styles.budgetNumbers}>
                  <Text style={styles.budgetSpent}>${currentSpend}</Text>
                  <Text style={styles.budgetTotal}>of ${monthlyBudget}</Text>
                </View>
                <ProgressIndicator
                  progress={currentSpend}
                  total={monthlyBudget}
                  color="#6BCF7F"
                />
                <Text style={styles.budgetRemaining}>
                  ${monthlyBudget - currentSpend} remaining this month
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Inventory Overview */}
          <Animated.View entering={FadeInDown.delay(500)}>
            <Card style={styles.inventoryCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <View style={styles.inventoryIconContainer}>
                    <Package size={20} color="#4ECDC4" />
                  </View>
                  <Text style={styles.cardTitle}>Inventory</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  activeOpacity={0.8}
                  onPress={handleViewAllInventory}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <ArrowRight size={16} color="#6BCF7F" />
                </TouchableOpacity>
              </View>
              <View style={styles.inventoryList}>
                {loading ? (
                  <ActivityIndicator style={{ marginTop: 20 }} />
                ) : inventory.length > 0 ? (
                  inventory.slice(0, 4).map(renderInventoryItem)
                ) : (
                  <Text style={styles.emptyText}>No inventory items found</Text>
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Smart Suggestions */}
          <Animated.View entering={FadeInDown.delay(600)}>
            <Card style={styles.suggestionsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <View style={styles.suggestionsIconContainer}>
                    <TrendingDown size={20} color="#4ECDC4" />
                  </View>
                  <Text style={styles.cardTitle}>Smart Suggestions</Text>
                </View>
                <TouchableOpacity>
                  <Clock size={16} color="#8B9DC3" />
                </TouchableOpacity>
              </View>
              <View style={styles.suggestionsList}>
                {mockSuggestions.map(renderSuggestion)}
              </View>
              <Button
                title="Shop Suggestions"
                onPress={() => {
                  if (userId) {
                    router.push(`/shop-suggestions?userId=${userId}`);
                  }
                }}
                variant="outline"
                icon={<ShoppingCart size={16} color="#6BCF7F" />}
                style={styles.shopButton}
              />
            </Card>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6BCF7F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    // fontFamily: 'Inter-Bold', // Ensure this font is loaded
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    // fontFamily: 'Inter-Regular', // Ensure this font is loaded
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // backgroundColor: 'linear-gradient(135deg, #6BCF7F 0%, #4ECDC4 100%)', // LinearGradient handles this
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileText: {
    fontSize: 16,
    // fontFamily: 'Inter-Bold', // Ensure this font is loaded
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    gap: 20,
    paddingBottom: 40,
    backgroundColor: '#FDFEFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(107, 207, 127, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderRadius: 16,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    // fontFamily: 'Inter-Bold', // Ensure this font is loaded
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    // fontFamily: 'Inter-Medium', // Ensure this font is loaded
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  budgetCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    // fontFamily: 'Inter-SemiBold', // Ensure this font is loaded
    fontWeight: '600',
    color: '#1F2937',
  },
  chartButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
  },
  budgetContent: {
    gap: 16,
  },
  budgetNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  budgetSpent: {
    fontSize: 32,
    // fontFamily: 'Inter-Bold', // Ensure this font is loaded
    fontWeight: 'bold',
    color: '#1F2937',
  },
  budgetTotal: {
    fontSize: 18,
    // fontFamily: 'Inter-Regular', // Ensure this font is loaded
    color: '#6B7280',
  },
  budgetRemaining: {
    fontSize: 14,
    // fontFamily: 'Inter-Regular', // Ensure this font is loaded
    color: '#6B7280',
  },
  inventoryCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderRadius: 16,
  },
  inventoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E6F9ED',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  viewAllText: {
    fontSize: 14,
    // fontFamily: 'Inter-SemiBold', // Ensure this font is loaded
    fontWeight: '600',
    color: '#6BCF7F',
    marginRight: 4, // spacing before the arrow
  },
  inventoryList: {
    gap: 16,
  },
  inventoryItem: {
    paddingVertical: 12,
  },
  inventoryItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryItemName: {
    fontSize: 16,
    // fontFamily: 'Inter-SemiBold', // Ensure this font is loaded
    fontWeight: '600',
    color: '#1F2937',
  },
  inventoryItemDetails: {
    fontSize: 14,
    // fontFamily: 'Inter-Regular', // Ensure this font is loaded
    color: '#6B7280',
    marginTop: 4,
  },
  inventoryItemRight: {
    alignItems: 'flex-end',
  },
  daysLeftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  daysLeftText: {
    fontSize: 12,
    // fontFamily: 'Inter-Bold', // Ensure this font is loaded
    fontWeight: 'bold',
  },
  suggestionsCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderRadius: 16,
  },
  suggestionsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsList: {
    gap: 20,
    marginBottom: 24,
  },
  suggestionItem: {
    paddingVertical: 4,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  suggestionName: {
    fontSize: 16,
    // fontFamily: 'Inter-SemiBold', // Ensure this font is loaded
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionReason: {
    fontSize: 14,
    // fontFamily: 'Inter-Regular', // Ensure this font is loaded
    color: '#6B7280',
    marginTop: 2,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  buyNowButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6BCF7F',
    borderRadius: 12,
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buyNowText: {
    fontSize: 13,
    // fontFamily: 'Inter-SemiBold', // Ensure this font is loaded
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shopButton: {
    width: '100%',
  },
});
