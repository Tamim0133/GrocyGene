import React, { useState, useEffect } from 'react'; // Removed 'use' as it's not a standard React hook
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions, // Import Dimensions to get screen width for responsive spacing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed useNavigation, useRoute, RouteProp as they seem unused with expo-router
import axios from 'axios';
import { Trash2, Edit, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button'; // Assuming this Button component is functional
import { useLocalSearchParams } from 'expo-router';

// Define your API host
const API_HOST = 'http://10.198.218.8:3000';

interface StockItem {
  stock_id: string;
  quantity: number;
  predicted_finish_date: string;
  products: {
    product_name: string;
    unit: string;
    base_consumption?: number; // Added base_consumption to product for calculation
  };
}

// --- NEW: Define Global Colors and Spacing ---
const colors = {
  primaryText: '#2D3748',
  secondaryText: '#718096',
  lightBackground: '#F8FBFF', // Overall page background
  cardBackground: '#FFFFFF',
  accent: '#4A90E2', // Blue for edit, primary actions
  warning: '#FF6B6B', // Red for delete
  progressGreen: '#2ECC71', // Healthy stock
  progressYellow: '#F1C40F', // Low stock
  progressRed: '#E74C3C', // Critical/depleted stock
  lightGreyButton: '#F1F5F9', // Action button background
  border: '#E2E8F0',
  modalOverlay: 'rgba(0,0,0,0.4)',
};

const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

const screenWidth = Dimensions.get('window').width; // Get screen width for dynamic padding/margin

export default function InventoryListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId;

  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [newDate, setNewDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      // NOTE: Ensure your backend endpoint returns products.base_consumption
      // for the predicted finish date calculation to work as intended.
      const response = await axios.get(`${API_HOST}/api/users/${userId}/stocks`);
      setInventory(response.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch inventory.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${API_HOST}/api/users/${userId}/stocks`);
      setInventory(response.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch inventory.');
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [userId]); // Add userId to dependencies to refetch if it changes

  const handleDelete = (stockId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item from your stock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_HOST}/api/stocks/${stockId}`);
              setInventory((prev) =>
                prev.filter((item) => item.stock_id !== stockId)
              );
            } catch (err) {
              Alert.alert('Error', 'Failed to delete the item.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (item: StockItem) => {
    setSelectedItem(item);
    // Format date to YYYY-MM-DD for TextInput if it's not already
    const dateObj = new Date(item.predicted_finish_date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    setNewDate(formattedDate);
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem || !newDate) return;

    try {
      await axios.put(`${API_HOST}/api/stocks/${selectedItem.stock_id}`, {
        predicted_finish_date: newDate, // Ensure your API expects YYYY-MM-DD
      });
      setModalVisible(false);
      Alert.alert('Success', 'Item updated successfully.');
      fetchInventory(); // Refetch the list to show updated data
    } catch (err) {
      Alert.alert('Error', 'Failed to update the item.');
    }
  };

  // --- NEW: Helper function to calculate depletion percentage and color ---
  const getDepletionStatus = (item: StockItem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const predictedFinishDate = new Date(item.predicted_finish_date);
    predictedFinishDate.setHours(0, 0, 0, 0); // Normalize

    // If depletion date is in the past or today, consider it depleted or critical
    if (predictedFinishDate <= today) {
      return { percentage: 0, color: colors.progressRed };
    }

    // This part requires initial quantity and a consistent consumption rate.
    // If you only have 'predicted_finish_date', you can base the bar solely on time proximity.
    // For a more accurate "how much is left" bar, you'd need `initial_quantity` and `base_consumption`.
    // For now, let's base it on days remaining.
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const daysRemaining = Math.round(
      Math.abs((predictedFinishDate.getTime() - today.getTime()) / oneDay)
    );

    // This is a simplified scale. Adjust `maxDays` based on your typical stock duration.
    const maxDaysForGreen = 15; // Max days where it's considered 'plenty'
    const lowStockThresholdDays = 7; // Days left to be considered 'low'
    const criticalStockThresholdDays = 3; // Days left to be considered 'critical'

    let percentage = (daysRemaining / maxDaysForGreen) * 100;
    if (percentage > 100) percentage = 100; // Cap at 100%

    let color = colors.progressGreen;
    if (daysRemaining <= criticalStockThresholdDays) { // 3 Din er kom hole -> Red
      color = colors.progressRed;
    } else if (daysRemaining <= lowStockThresholdDays) { // 7 din er kom hole -> Yellow
      color = colors.progressYellow;
    }

    return { percentage, color };
  };

  // --- NEW: Placeholder for Product Icons/Images (if you add them) ---
  const getProductIcon = (productName: string) => {
    // This is where you would return a specific image source or icon component
    // based on the product name.
    // Example:
    // if (productName.toLowerCase().includes('tomato')) return require('./assets/tomato-icon.png');
    // if (productName.toLowerCase().includes('almond')) return require('./assets/almond-icon.png');
    // ...
    return null; // Return null if no specific icon
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.primaryText} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Full Inventory</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={inventory}
        keyExtractor={(item) => item.stock_id}
        renderItem={({ item }) => {
          const { percentage, color } = getDepletionStatus(item);
          const productIcon = getProductIcon(item.products.product_name);

          return (
            <View style={styles.itemContainer}>
              {productIcon && (
                <View style={styles.productIconContainer}>
                  {/* Render your Image or Icon component here */}
                  {/* <Image source={productIcon} style={styles.productIcon} /> */}
                  {/* Or a generic placeholder */}
                  <Text style={styles.productIconText}>
                    {item.products.product_name.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.itemDetailsContainer}>
                <Text style={styles.itemName}>
                  {item.products.product_name}
                </Text>
                <Text style={styles.itemQuantityDetails}>
                  Quantity: {item.quantity} {item.products.unit}
                </Text>
                <Text
                  style={[
                    styles.itemDepletionDate,
                    {
                      color:
                        percentage <= 0 || percentage <= 10 // Apply red if depleted or very critical
                          ? colors.progressRed
                          : colors.secondaryText,
                    },
                  ]}
                >
                  Depletes around:{' '}
                  {new Date(item.predicted_finish_date).toLocaleDateString()}
                </Text>

                {/* Depletion Progress Bar */}
                <View style={styles.depletionProgressBarContainer}>
                  <View
                    style={[
                      styles.depletionProgressBar,
                      { width: `${percentage}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  style={styles.editButton} // Changed to editButton style
                >
                  <Edit size={20} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.stock_id)}
                  style={styles.deleteButton} // Changed to deleteButton style
                >
                  <Trash2 size={20} color={colors.cardBackground} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.flatListContentContainer} // Add padding to FlatList
      />

      {/* Edit Modal remains largely the same, but styling adjusted */}
      <Modal visible={isModalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color={colors.primaryText} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Depletion Date</Text>
            <Text style={styles.modalItemName}>
              {selectedItem?.products.product_name || 'Unknown Product'}
            </Text>
            <TextInput
              style={styles.input}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.secondaryText}
            />
            <Button title="Save Changes" onPress={handleUpdate} />
          </View>
        </View>
      </Modal>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          /* Handle add new item navigation */
          router.push('/(tabs)/input')
          // router.push('/add-new-item'); // Example navigation
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightBackground,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightBackground,
  },
  errorText: {
    fontSize: 16,
    color: colors.warning,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l, // More horizontal padding
    paddingTop: spacing.l + 4, // More top padding
    paddingBottom: spacing.m,
    backgroundColor: colors.cardBackground, // White header background
    borderBottomWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: spacing.m, // Space between header and list
  },
  backButton: {
    padding: spacing.s,
    backgroundColor: 'transparent', // Make it transparent
    borderRadius: 999, // Make it fully circular
    // Remove elevation from here, rely on parent for header shadow
  },
  headerTitle: {
    fontSize: 22, // Slightly larger title
    fontFamily: 'Inter-SemiBold',
    color: colors.primaryText,
    flex: 1, // Allow title to take space
    textAlign: 'center', // Center it
    // marginLeft: -24, // Counteract back button space if needed
  },
  flatListContentContainer: {
    paddingHorizontal: spacing.l, // Padding for the FlatList content
    paddingBottom: spacing.xl * 3, // Extra padding for FAB clearance
  },
  itemContainer: {
    backgroundColor: colors.cardBackground,
    padding: spacing.l, // Increased padding inside the card
    borderRadius: 16, // Consistent rounded corners
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4, // Increased elevation for more depth
    shadowColor: '#000',
    shadowOpacity: 0.08, // Slightly more visible shadow
    shadowRadius: 8, // Larger shadow radius for softer look
    shadowOffset: { width: 0, height: 4 }, // More vertical offset
    marginBottom: spacing.m, // Consistent space between cards
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Half of width/height for perfect circle
    backgroundColor: '#E6EEF4', // Light background for the icon circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  productIconText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold', // Assuming Inter-Bold is available
    color: colors.accent, // Color for the initial letter
  },
  itemDetailsContainer: {
    flex: 1, // Allow details to take available space
  },
  itemName: {
    fontSize: 19, // Larger product name
    fontFamily: 'Inter-SemiBold',
    color: colors.primaryText,
    marginBottom: spacing.xs, // Small gap below name
  },
  itemQuantityDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  itemDepletionDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.secondaryText, // Default color, overridden by status
  },
  // --- NEW: Depletion Progress Bar Styles ---
  depletionProgressBarContainer: {
    height: 6, // Thin bar
    width: '100%',
    backgroundColor: '#E0E0E0', // Light grey track
    borderRadius: 3,
    marginTop: spacing.s, // Space below text
    overflow: 'hidden', // Ensures inner bar stays within bounds
  },
  depletionProgressBar: {
    height: '100%',
    borderRadius: 3,
    // Width and background-color are set inline based on JS logic
  },
  // --- END NEW Progress Bar Styles ---

  actions: {
    flexDirection: 'row',
    gap: spacing.s, // Space between action buttons
    marginLeft: spacing.m, // Push actions to the right
  },
  editButton: {
    backgroundColor: colors.lightGreyButton, // Light background
    padding: spacing.s,
    borderRadius: 10,
    // elevation: 1, // Remove direct elevation for a flatter look
    // shadowColor etc. can be applied if needed for subtle lift
  },
  deleteButton: {
    backgroundColor: colors.warning, // Red background for delete
    padding: spacing.s,
    borderRadius: 10,
    // elevation: 1,
  },

  // --- Modal Styles (Adjusted colors/spacing) ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modalOverlay,
  },
  modalContent: {
    width: screenWidth * 0.85, // Use a percentage of screen width
    backgroundColor: colors.cardBackground,
    padding: spacing.l + 4, // More padding
    borderRadius: 20, // More rounded
    elevation: 15, // More pronounced shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
    padding: spacing.s,
    backgroundColor: colors.lightBackground, // Light background for close button
    borderRadius: 20,
    zIndex: 1, // Ensure it's tappable
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    color: colors.primaryText,
    marginBottom: spacing.s,
  },
  modalItemName: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: spacing.m,
    backgroundColor: colors.lightBackground, // Light background for input
    color: colors.primaryText, // Text color in input
  },
  // Note: Your Button component might have its own internal styles.
  // Ensure it uses the accent color for its background.

  // --- NEW: Floating Action Button (FAB) ---
  fab: {
    position: 'absolute',
    bottom: spacing.l, // Distance from bottom
    right: spacing.l, // Distance from right
    width: 60, // Size
    height: 60,
    borderRadius: 30, // Half of width/height for perfect circle
    backgroundColor: '#6BCF7F', // Accent color
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Prominent shadow
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    fontSize: 30,
    color: colors.cardBackground, // White text
    lineHeight: 30, // Adjust line height to center '+'
  },
});