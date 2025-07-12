import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Plus, Camera, Mic, Package } from 'lucide-react-native';

const categories = [
  'Dairy', 'Meat', 'Vegetables', 'Fruits', 'Grains', 'Beverages', 
  'Snacks', 'Frozen', 'Canned', 'Bakery', 'Spices', 'Other'
];

const units = ['kg', 'g', 'L', 'ml', 'pieces', 'packets', 'bottles', 'cans'];

export default function AddItemScreen() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: 'pieces',
    expiryDate: '',
    price: '',
    brand: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePredictedFinishDate = (quantity: number, category: string) => {
    // Simple prediction logic - in real app, this would use ML model
    const consumptionRates: { [key: string]: number } = {
      'Dairy': 0.5, // 0.5 units per day
      'Meat': 0.3,
      'Vegetables': 0.7,
      'Fruits': 0.6,
      'Grains': 0.1,
      'Beverages': 0.8,
      'Snacks': 0.4,
      'Frozen': 0.2,
      'Canned': 0.1,
      'Bakery': 0.5,
      'Spices': 0.05,
      'Other': 0.3,
    };

    const rate = consumptionRates[category] || 0.3;
    const daysToFinish = quantity / rate;
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + Math.ceil(daysToFinish));
    return finishDate.toISOString().split('T')[0];
  };

  const determineStatus = (quantity: number, expiryDate?: string) => {
    if (quantity <= 0) return 'finished';
    
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'expired';
      if (diffDays <= 3) return 'low';
    }
    
    if (quantity <= 2) return 'low';
    return 'good';
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to add items');
        return;
      }

      const quantity = parseFloat(formData.quantity);
      const price = formData.price ? parseFloat(formData.price) : null;
      const expiryDate = formData.expiryDate || undefined;
      const predictedFinishDate: string = calculatePredictedFinishDate(quantity, formData.category);
      const status = determineStatus(quantity, expiryDate);

      const { error } = await supabase
        .from('inventory_items')
        .insert({
          user_id: user.id,
          name: formData.name,
          category: formData.category,
          quantity: quantity,
          unit: formData.unit,
          expiry_date: expiryDate,
          predicted_finish_date: predictedFinishDate,
          price: price,
          brand: formData.brand || null,
          status: status,
          purchase_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      Alert.alert('Success', 'Item added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: 'pieces',
        expiryDate: '',
        price: '',
        brand: '',
      });

    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const CategoryButton = ({ category }: { category: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        formData.category === category && styles.selectedCategoryButton
      ]}
      onPress={() => handleInputChange('category', category)}
    >
      <Text style={[
        styles.categoryButtonText,
        formData.category === category && styles.selectedCategoryButtonText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const UnitButton = ({ unit }: { unit: string }) => (
    <TouchableOpacity
      style={[
        styles.unitButton,
        formData.unit === unit && styles.selectedUnitButton
      ]}
      onPress={() => handleInputChange('unit', unit)}
    >
      <Text style={[
        styles.unitButtonText,
        formData.unit === unit && styles.selectedUnitButtonText
      ]}>
        {unit}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <Text style={styles.headerSubtitle}>Add items to your inventory</Text>
      </View>

      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Camera size={24} color="#003675" />
          <Text style={styles.quickActionText}>Scan Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Mic size={24} color="#003675" />
          <Text style={styles.quickActionText}>Voice Input</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <CategoryButton key={category} category={category} />
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={formData.quantity}
              onChangeText={(value) => handleInputChange('quantity', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.unitsContainer}>
              {units.map((unit) => (
                <UnitButton key={unit} unit={unit} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.expiryDate}
            onChangeText={(value) => handleInputChange('expiryDate', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={formData.price}
            onChangeText={(value) => handleInputChange('price', value)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Brand (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter brand name"
            value={formData.brand}
            onChangeText={(value) => handleInputChange('brand', value)}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Plus size={20} color="white" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding Item...' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#003675',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#003675',
    fontWeight: '500',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  row: {
    flexDirection: 'row',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCategoryButton: {
    backgroundColor: '#003675',
    borderColor: '#003675',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedUnitButton: {
    backgroundColor: '#003675',
    borderColor: '#003675',
  },
  unitButtonText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  selectedUnitButtonText: {
    color: 'white',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003675',
    borderRadius: 12,
    padding: 18,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});