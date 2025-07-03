import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { Trash2, Edit, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useLocalSearchParams } from 'expo-router';

// Define your API host
const API_HOST = 'http://192.168.0.110:3000';

interface StockItem {
  stock_id: string;
  quantity: number;
  predicted_finish_date: string;
  products: {
    product_name: string;
    unit: string;
  };
}

// Type for the route params
// type InventoryListRouteProp = RouteProp<RootStackParamList, 'InventoryList'>;

export default function InventoryListScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the edit modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [newDate, setNewDate] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_HOST}/api/users/${userId}/stocks`
      );
      setInventory(response.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch inventory.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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
              // Refetch or remove from state locally
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
    setNewDate(item.predicted_finish_date); // Pre-fill the input with the current date
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem || !newDate) return;

    try {
      await axios.put(`${API_HOST}/api/stocks/${selectedItem.stock_id}`, {
        predicted_finish_date: newDate,
      });
      setModalVisible(false);
      Alert.alert('Success', 'Item updated successfully.');
      fetchInventory(); // Refetch the list to show updated data
    } catch (err) {
      Alert.alert('Error', 'Failed to update the item.');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.centered}>{error}</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Full Inventory</Text>
      </View>

      <FlatList
        data={inventory}
        keyExtractor={(item) => item.stock_id}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View>
              <Text style={styles.itemName}>{item.products.product_name}</Text>
              <Text style={styles.itemDetails}>
                Quantity: {item.quantity} {item.products.unit}
              </Text>
              <Text style={styles.itemDetails}>
                Depletes around:{' '}
                {new Date(item.predicted_finish_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                style={styles.actionButton}
              >
                <Edit size={20} color="#4A90E2" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.stock_id)}
                style={styles.actionButton}
              >
                <Trash2 size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Edit Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Depletion Date</Text>
            <Text style={styles.modalItemName}>
              {selectedItem?.products.product_name}
            </Text>
            <TextInput
              style={styles.input}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="YYYY-MM-DD"
            />
            <Button title="Save Changes" onPress={handleUpdate} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Add all your styles here...
  container: { flex: 1, backgroundColor: '#F8FBFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontSize: 32, fontFamily: 'Inter-Bold', color: '#2D3748' },
  itemContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemName: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#2D3748' },
  itemDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  actions: { flexDirection: 'row', gap: 15 },
  actionButton: { padding: 5 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalItemName: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  closeButton: { position: 'absolute', top: 15, right: 15 },
});
