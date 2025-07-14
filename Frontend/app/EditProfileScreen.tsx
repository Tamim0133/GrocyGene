import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { Button } from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import authService from '@/services/authService';
import { User, Camera } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

type EditProfileScreenRouteProp = ReturnType<typeof useRoute> & {
  params: { profile: any }
};

export default function EditProfileScreen() {
  // Accept both navigation and expo-router navigation
  const route = useRoute();
  const navigation = useNavigation();
  // Accept both stringified and object profile param
  let profileParam = (route as any).params?.profile;
  let profile: any = profileParam;
  if (typeof profileParam === 'string') {
    try { profile = JSON.parse(profileParam); } catch { profile = {}; }
  }

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [region, setRegion] = useState(profile?.region || 'urban');
  const [image, setImage] = useState<string | null>(profile?.profile_picture_url || profile?.picture || null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      let pictureUrl = image;
      if (image && image !== profile.profile_picture_url && image !== profile.picture) {
        pictureUrl = await uploadProfilePicture(image);
      }
      const userId = await authService.getUserId();
      if (!userId) throw new Error('User ID not found');
      // Only update fields that have changed, keep others from profile
      const updatedProfile = {
        user_name: name !== '' ? name : profile?.name || profile?.user_name || '',
        phone_number: phone !== '' ? phone : profile?.phone || profile?.phone_number || '',
        region: region !== '' ? region : profile?.region || 'urban',
        profile_picture_url: pictureUrl !== null ? pictureUrl : profile?.profile_picture_url || profile?.picture || null,
      };
      // Update profile in backend
      const response = await fetch(`http://192.168.0.105:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update profile');
      }
      // Fetch latest user data from backend and update local storage
      const userRes = await fetch(`http://192.168.0.105:3000/api/users/${userId}`);
      let latestUser = await userRes.json();
      if (Array.isArray(latestUser)) {
        latestUser = latestUser[0];
      }
      // Debug: log structure and types before storing
      console.log('latestUser to store:', latestUser);
      if (!latestUser) throw new Error('No user data returned from backend');
      // Map user_id to id and user_name to name for compatibility
      const userToStore = {
        ...latestUser,
        id: latestUser.id || latestUser.user_id,
        name: latestUser.name || latestUser.user_name,
      };
      if (!userToStore.id || typeof userToStore.id !== 'string') {
        console.error('User data missing id or id is not a string:', userToStore.id);
        throw new Error('User data missing id or id is not a string');
      }
      if (!userToStore.email || typeof userToStore.email !== 'string') {
        console.error('User data missing email or email is not a string:', userToStore.email);
        throw new Error('User data missing email or email is not a string');
      }
      await authService.storeUserData(userToStore);
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    const userId = await authService.getUserId();
    if (!userId) return null;
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `${userId}.jpg`,
      type: 'image/jpeg',
    } as any);
    const response = await fetch(`http://192.168.0.105:3000/api/users/${userId}/profile-picture`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    return data.url;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FBFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#A0AEC0" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Camera size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor="#A0AEC0"
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number"
            placeholderTextColor="#A0AEC0"
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Region</Text>
          <View style={{ width: '100%', backgroundColor: '#F7FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
            <Picker
              selectedValue={region}
              onValueChange={setRegion}
              style={{ width: '100%' }}
              itemStyle={{ fontSize: 16, color: '#2D3748' }}
            >
              <Picker.Item label="Urban" value="urban" />
              <Picker.Item label="Rural" value="rural" />
            </Picker>
          </View>
        </View>
        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={saveProfile}
          disabled={saving}
          style={styles.saveButton}
        />
        {saving && <ActivityIndicator style={{ marginTop: 16 }} color="#6BCF7F" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6BCF7F',
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#6BCF7F',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  form: {
    width: '100%',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 6,
    marginTop: 12,
    fontFamily: 'Inter-SemiBold',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontFamily: 'Inter-Regular',
  },
  saveButton: {
    width: '100%',
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#6BCF7F',
  },
});
