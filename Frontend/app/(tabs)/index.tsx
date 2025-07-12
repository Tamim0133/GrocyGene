import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, TrendingDown, ShoppingCart, CircleAlert as AlertCircle, Clock, DollarSign, ChartBar as BarChart3, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'; // Import hooks
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'expo-router';
// import { RootStackParamList } from '@/navigation/AppNavigator'; //
const API_HOST = 'http://192.168.0.105:3000';
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  daysLeft: number;
  category: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const mockInventoryItems: InventoryItem[] = [
  { id: '1', name: 'Milk', quantity: 1, unit: 'liter', daysLeft: 2, category: 'Dairy' },
  { id: '2', name: 'Bread', quantity: 1, unit: 'loaf', daysLeft: 3, category: 'Bakery' },
  { id: '3', name: 'Eggs', quantity: 6, unit: 'pieces', daysLeft: 5, category: 'Dairy' },
  { id: '4', name: 'Rice', quantity: 2, unit: 'kg', daysLeft: 30, category: 'Grains' },
];

const mockSuggestions: SuggestionItem[] = [
  { id: '1', name: 'Bananas', reason: 'Running low based on usage', priority: 'high' },
  { id: '2', name: 'Chicken Breast', reason: 'Weekly protein schedule', priority: 'medium' },
  { id: '3', name: 'Yogurt', reason: 'Family preference pattern', priority: 'low' },
];

export default function DashboardScreen() {
  const urgentItems = mockInventoryItems.filter(item => item.daysLeft <= 3);
  const totalItems = mockInventoryItems.length;
  const monthlyBudget = 500;
  const currentSpend = 320;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFB347';
      default: return '#4ECDC4';
    }
  };

  const renderInventoryItem = (item: InventoryItem) => (
    <View key={item.id} style={styles.inventoryItem}>
      <View style={styles.inventoryItemContent}>
        <View>
          <Text style={styles.inventoryItemName}>{item.name}</Text>
          <Text style={styles.inventoryItemDetails}>
            {item.quantity} {item.unit} • {item.category}
          </Text>
        </View>
        <View style={styles.inventoryItemRight}>
          <View style={[
            styles.daysLeftBadge,
            { backgroundColor: item.daysLeft <= 3 ? '#FFE5E5' : '#E8F5E8' }
          ]}>
            <Text style={[
              styles.daysLeftText,
              { color: item.daysLeft <= 3 ? '#FF6B6B' : '#52C41A' }
            ]}>
              {item.daysLeft}d
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSuggestion = (suggestion: SuggestionItem) => (
    <TouchableOpacity key={suggestion.id} style={styles.suggestionItem}>
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionLeft}>
          <View style={[
            styles.priorityDot,
            { backgroundColor: getPriorityColor(suggestion.priority) }
          ]} />
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning! 🌱</Text>
            <Text style={styles.subtitle}>Here's your grocery overview</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileText}>JD</Text>
            </View>
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
                  <Text style={styles.statValue}>{totalItems}</Text>
                  <Text style={styles.statLabel}>Items in Stock</Text>
                </View>
              </View>
            </Card>
            
            <Card style={styles.statCard} variant="glass">
              <View style={styles.statContent}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FFE5E5' }]}>
                  <AlertCircle size={24} color="#FF6B6B" />
                </View>
                <View>
                  <Text style={styles.statValue}>{urgentItems.length}</Text>
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
                    <Package size={20} color="#6BCF7F" />
                  </View>
                  <Text style={styles.cardTitle}>Your Inventory</Text>
                </View>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ArrowRight size={16} color="#6BCF7F" />
                </TouchableOpacity>
              </View>
              <View style={styles.inventoryList}>
                {mockInventoryItems.slice(0, 4).map(renderInventoryItem)}
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
                onPress={() => {}}
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
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'linear-gradient(135deg, #6BCF7F 0%, #4ECDC4 100%)',
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
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    gap: 20,
    paddingBottom: 40,
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
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#718096',
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
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
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
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
  },
  budgetTotal: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#718096',
  },
  budgetRemaining: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
  },
  inventoryCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6BCF7F',
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
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  inventoryItemDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
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
    fontFamily: 'Inter-Bold',
  },
  suggestionsCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  suggestionReason: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#718096',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  shopButton: {
    width: '100%',
  },
});