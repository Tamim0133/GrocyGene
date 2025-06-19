import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Mic, CreditCard as Edit, Image as ImageIcon, Upload, Plus, ScanLine } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type InputMethod = 'receipt' | 'screenshot' | 'voice' | 'manual';

export default function InputScreen() {
  const [activeMethod, setActiveMethod] = useState<InputMethod>('receipt');
  const [manualItems, setManualItems] = useState(['']);
  const [isRecording, setIsRecording] = useState(false);

  const inputMethods = [
    {
      id: 'receipt' as InputMethod,
      title: 'Scan Receipt',
      subtitle: 'OCR from receipt photo',
      icon: Camera,
      color: '#6BCF7F',
      bgColor: 'rgba(107, 207, 127, 0.1)',
    },
    {
      id: 'screenshot' as InputMethod,
      title: 'Store Screenshot',
      subtitle: 'Online store capture',
      icon: ImageIcon,
      color: '#4ECDC4',
      bgColor: 'rgba(78, 205, 196, 0.1)',
    },
    {
      id: 'voice' as InputMethod,
      title: 'Voice Input',
      subtitle: 'Speak your list',
      icon: Mic,
      color: '#FFB347',
      bgColor: 'rgba(255, 179, 71, 0.1)',
    },
    {
      id: 'manual' as InputMethod,
      title: 'Manual Entry',
      subtitle: 'Type your items',
      icon: Edit,
      color: '#A78BFA',
      bgColor: 'rgba(167, 139, 250, 0.1)',
    },
  ];

  const handleAddManualItem = () => {
    setManualItems([...manualItems, '']);
  };

  const handleManualItemChange = (index: number, value: string) => {
    const newItems = [...manualItems];
    newItems[index] = value;
    setManualItems(newItems);
  };

  const handleRemoveManualItem = (index: number) => {
    if (manualItems.length > 1) {
      const newItems = manualItems.filter((_, i) => i !== index);
      setManualItems(newItems);
    }
  };

  const renderReceiptMethod = () => (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.methodContent}>
      <View style={styles.placeholderContainer}>
        <View style={styles.cameraPlaceholder}>
          <ScanLine size={48} color="#6BCF7F" />
          <Text style={styles.placeholderTitle}>Ready to Scan</Text>
          <Text style={styles.placeholderSubtitle}>
            Take a photo of your receipt and we'll extract the items automatically
          </Text>
        </View>
      </View>
      
      <View style={styles.methodActions}>
        <Button
          title="Take Photo"
          onPress={() => {}}
          icon={<Camera size={20} color="#FFFFFF" />}
          style={styles.primaryAction}
        />
        <Button
          title="Upload from Gallery"
          onPress={() => {}}
          variant="outline"
          icon={<Upload size={20} color="#6BCF7F" />}
        />
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>📸 Tips for better scanning:</Text>
        <Text style={styles.tipText}>• Ensure good lighting</Text>
        <Text style={styles.tipText}>• Keep receipt flat and straight</Text>
        <Text style={styles.tipText}>• Include all items in frame</Text>
      </View>
    </Animated.View>
  );

  const renderScreenshotMethod = () => (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.methodContent}>
      <View style={styles.placeholderContainer}>
        <View style={styles.screenshotPlaceholder}>
          <ImageIcon size={48} color="#4ECDC4" />
          <Text style={styles.placeholderTitle}>Upload Screenshot</Text>
          <Text style={styles.placeholderSubtitle}>
            Share a screenshot from your online grocery shopping cart
          </Text>
        </View>
      </View>
      
      <View style={styles.methodActions}>
        <Button
          title="Choose Screenshot"
          onPress={() => {}}
          icon={<ImageIcon size={20} color="#FFFFFF" />}
          style={[styles.primaryAction, { backgroundColor: '#4ECDC4' }]}
        />
      </View>

      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>✨ Supported stores:</Text>
        <View style={styles.storesList}>
          <Text style={styles.storeItem}>Amazon Fresh</Text>
          <Text style={styles.storeItem}>Instacart</Text>
          <Text style={styles.storeItem}>Walmart+</Text>
          <Text style={styles.storeItem}>Target</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderVoiceMethod = () => (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.methodContent}>
      <View style={styles.placeholderContainer}>
        <View style={[
          styles.voicePlaceholder,
          isRecording && styles.voicePlaceholderActive
        ]}>
          <Mic size={48} color={isRecording ? "#FFFFFF" : "#FFB347"} />
          <Text style={[
            styles.placeholderTitle,
            isRecording && styles.placeholderTitleActive
          ]}>
            {isRecording ? 'Listening...' : 'Ready to Record'}
          </Text>
          <Text style={[
            styles.placeholderSubtitle,
            isRecording && styles.placeholderSubtitleActive
          ]}>
            {isRecording 
              ? 'Speak clearly and mention quantities'
              : 'Tap the button and speak your grocery list'
            }
          </Text>
        </View>
      </View>
      
      <View style={styles.methodActions}>
        <Button
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
          onPress={() => setIsRecording(!isRecording)}
          icon={<Mic size={20} color="#FFFFFF" />}
          style={[
            styles.primaryAction, 
            { backgroundColor: isRecording ? '#FF6B6B' : '#FFB347' }
          ]}
        />
      </View>

      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>🎤 Example phrases:</Text>
        <Text style={styles.exampleText}>"Two liters of milk, one loaf of bread, dozen eggs"</Text>
        <Text style={styles.exampleText}>"I need bananas, apples, and some yogurt"</Text>
      </View>
    </Animated.View>
  );

  const renderManualMethod = () => (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.methodContent}>
      <ScrollView style={styles.manualInputContainer} showsVerticalScrollIndicator={false}>
        {manualItems.map((item, index) => (
          <View key={index} style={styles.manualInputItem}>
            <TextInput
              style={styles.manualInput}
              placeholder={`Item ${index + 1}`}
              value={item}
              onChangeText={(value) => handleManualItemChange(index, value)}
              placeholderTextColor="#A0AEC0"
            />
            {manualItems.length > 1 && (
              <TouchableOpacity
                style={styles.removeItemButton}
                onPress={() => handleRemoveManualItem(index)}
              >
                <Text style={styles.removeItemText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addItemButton}
          onPress={handleAddManualItem}
        >
          <Plus size={16} color="#A78BFA" />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <View style={styles.methodActions}>
        <Button
          title="Save Items"
          onPress={() => {}}
          icon={<Edit size={20} color="#FFFFFF" />}
          style={[styles.primaryAction, { backgroundColor: '#A78BFA' }]}
        />
      </View>
    </Animated.View>
  );

  const renderMethodContent = () => {
    switch (activeMethod) {
      case 'receipt':
        return renderReceiptMethod();
      case 'screenshot':
        return renderScreenshotMethod();
      case 'voice':
        return renderVoiceMethod();
      case 'manual':
        return renderManualMethod();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
        <Text style={styles.title}>Add Items</Text>
        <Text style={styles.subtitle}>Choose your preferred input method</Text>
      </Animated.View>

      <View style={styles.methodSelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.methodSelectorContent}
        >
          {inputMethods.map((method, index) => {
            const IconComponent = method.icon;
            const isActive = activeMethod === method.id;
            
            return (
              <Animated.View 
                key={method.id}
                entering={FadeInDown.delay(100 * index)}
              >
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    isActive && styles.methodCardActive,
                    { borderColor: isActive ? method.color : 'transparent' }
                  ]}
                  onPress={() => setActiveMethod(method.id)}
                >
                  <View style={[
                    styles.methodIcon,
                    { backgroundColor: isActive ? method.color : method.bgColor }
                  ]}>
                    <IconComponent 
                      size={24} 
                      color={isActive ? '#FFFFFF' : method.color} 
                    />
                  </View>
                  <Text style={[
                    styles.methodTitle,
                    isActive && styles.methodTitleActive
                  ]}>
                    {method.title}
                  </Text>
                  <Text style={styles.methodSubtitle}>
                    {method.subtitle}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {renderMethodContent()}
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
  methodSelector: {
    paddingBottom: 20,
  },
  methodSelectorContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  methodCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 130,
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  methodCardActive: {
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 6,
  },
  methodTitleActive: {
    color: '#2D3748',
  },
  methodSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  methodContent: {
    gap: 28,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#6BCF7F',
    borderStyle: 'dashed',
    width: '100%',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  screenshotPlaceholder: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
    width: '100%',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  voicePlaceholder: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFB347',
    width: '100%',
    shadowColor: '#FFB347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  voicePlaceholderActive: {
    backgroundColor: '#FFB347',
    borderColor: '#FFB347',
  },
  placeholderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 12,
  },
  placeholderTitleActive: {
    color: '#FFFFFF',
  },
  placeholderSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  placeholderSubtitleActive: {
    color: '#FFFFFF',
  },
  methodActions: {
    gap: 16,
  },
  primaryAction: {
    width: '100%',
    paddingVertical: 16,
  },
  tipsContainer: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6BCF7F',
  },
  tipsTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    marginBottom: 6,
  },
  exampleContainer: {
    backgroundColor: '#FFFBEB',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
  },
  exampleTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginBottom: 12,
  },
  storesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  storeItem: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#D69E2E',
    backgroundColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exampleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  manualInputContainer: {
    maxHeight: 300,
  },
  manualInputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  removeItemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FED7D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FF6B6B',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#A78BFA',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
    marginTop: 8,
  },
  addItemText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#A78BFA',
  },
});