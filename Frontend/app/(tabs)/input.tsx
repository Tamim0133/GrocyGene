import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Upload } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import authService from '@/services/authService';

export default function InputScreen() {
  const [manualText, setManualText] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------
  const host = '192.168.0.108:3000'; // IP : Port
  // ------------------------------------------------
  // Hardcoded user ID for testing purposes
    // Fetch user ID
    useEffect(() => {
      const fetchUserId = async () => {
        try {
          const id = await authService.getUserId();
          console.log('User ID fetched:', id);
          setUserId(id);
        } catch (error) {
          console.error('Error fetching user ID:', error);
          setError('Failed to get user information');
        }
      };
      fetchUserId();
    }, []);
  

  const handleProceed = async () => {
    if (!selectedImageUri) {
      alert('No image selected');
      return;
    }

    const formData = new FormData();
    formData.append('receiptImage', {
      uri: selectedImageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);

    try {
      const response = await axios.post(`http://${host}/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Image response from backend:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error uploading image:', error.message, error.response?.data);
      } else {
        console.error('Unknown error uploading image:', error);
      }
    }
  };
  const handleTakePhoto = async () => {
    console.log("Take Photo Clicked !");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alert('Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      console.log(uri);
      setSelectedImageUri(uri);
    }
  };

  const handleUploadPhoto = async () => {
    console.log("Upload Photo Clicked !");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Media library permission is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      console.log(uri);
      setSelectedImageUri(uri);
    }
  };

  const handleSubmitText = async () => {
    if (manualText.trim() === '') {
      alert('Please enter some text before proceeding.');
      return;
    }

    // Check if the user ID is set
    if (!userId) {
      alert('Error: User is not logged in.');
      return;
    }

    console.log(`Submitting text: "${manualText}" for user: ${userId}`);

    try {
      // MODIFICATION: Send 'text' AND 'userId' in the request body
      const response = await axios.post(`http://${host}/process-text`, {
        text: manualText.trim(),
        userId: userId, // Send the user's ID
      });

      console.log('✅ Success from backend:', response.data);
      alert(response.data.message); // Show success message
      setManualText(''); // Clear the input field on success

      // userId,
      // response.data
      //Shahriar Kabir


    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Error submitting text:', err.response?.data || err.message);
        alert(`Error: ${err.response?.data?.error || 'Could not process request.'}`);
      } else if (err instanceof Error) {
        console.error('Error submitting text:', err.message);
        alert(`Error: ${err.message}`);
      } else {
        console.error('Unknown error submitting text:', err);
        alert('Error: Could not process request.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
        <Text style={styles.title}>Add Items</Text>
        <Text style={styles.subtitle}>Enter items manually or scan a receipt</Text>
      </Animated.View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.methodContent}>
          <TextInput
            style={styles.manualInput}
            placeholder="Type what you bought..."
            value={manualText}
            onChangeText={setManualText}
            placeholderTextColor="#A0AEC0"
          />
          <View style={{ marginTop: 0 }}>
            <Button
              title="Submit Text"
              onPress={
                handleSubmitText

                //   async () => {
                //   if (manualText.trim() === '') {
                //     alert('Please enter some text before proceeding.');
                //     return;
                //   }
                //   console.log(manualText);
                //   try {
                //     const response = await axios.post(`http://${host}/process-text`, { text: manualText.trim() });
                //     console.log('Text response from backend:', response.data);
                //   } catch (err) {
                //   }
                // }
              }
              style={styles.primaryAction}
            />
          </View>

          <View style={styles.methodActions}>
            <Button
              title="Take Photo"
              onPress={handleTakePhoto}
              icon={<Camera size={20} color="#FFFFFF" />}
              style={styles.primaryAction}
            />
            <Button
              title="Upload Photo"
              onPress={handleUploadPhoto}
              variant="outline"
              icon={<Upload size={20} color="#6BCF7F" />}
            />
          </View>
          {selectedImageUri && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Image
                source={{ uri: selectedImageUri }}
                style={{ width: '100%', height: 350, borderRadius: 12 }}
                resizeMode="contain"
              />
              <View style={{ marginTop: 10, width: '100%' }}>
                <Button
                  title="Proceed"
                  onPress={handleProceed}
                  style={styles.primaryAction}
                />
              </View>
            </View>
          )}
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