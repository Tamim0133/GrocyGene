import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Plus, Minus, ChevronDown, Users } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
import AsyncStorage from '@react-native-async-storage/async-storage';
interface FamilyMember {
  id: string;
  name: string;
  age: number | null;
  gender: 'Male' | 'Female';
}



export default function ProfileSetupScreen() {
  const [region, setRegion] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: '', age: null, gender: 'Male' }
  ]);

  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const router = useRouter();

  const regions = [
    'Urban', 'Rural'
  ];
  const handleAddMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      age: null,
      gender: 'Male',
    };

    setFamilyMembers([...familyMembers, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(familyMembers.filter(member => member.id !== id));
    }
  };

  const handleMemberChange = (id: string, field: keyof FamilyMember, value: string) => {
    setFamilyMembers(familyMembers.map(member => {
      if (member.id === id) {
        const updatedValue =
          field === 'age'
            ? value === '' ? null : parseInt(value)
            : value;
        return { ...member, [field]: updatedValue };
      }
      return member;
    }));
  };

  const handleComplete = async () => {
    if (!region) {
      Alert.alert('Error', 'Please select your region');
      return;
    }

    const hasInvalidAge = familyMembers.some(member =>
      !member.name.trim() ||
      !member.gender ||
      member.age === null || // check null explicitly
      isNaN(member.age) ||
      member.age < 1 ||
      member.age > 120
    );

    if (hasInvalidAge) {
      Alert.alert('Error', 'Please ensure all members have name, gender, and age between 1 and 120');
      return;
    }

    try {
      const email = await AsyncStorage.getItem('user_email');

      if (!email) {
        Alert.alert('Error', 'User email not found. Please log in again.');
        return;
      }

      // Step 1: Send family setup
      const response = await fetch('http://192.168.0.105:3000/api/family-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          region,
          family_members: familyMembers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('Upload Failed', result.error || 'Something went wrong');
        return;
      }

      // Step 2: Update demographics
      const demographicsResponse = await fetch('http://192.168.0.105:3000/api/update-user-demographics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          family_members: familyMembers,
        }),
      });

      const demoResult = await demographicsResponse.json();

      if (!demographicsResponse.ok) {
        Alert.alert('Warning', 'Family data saved but demographic update failed');
        console.error('Demographics error:', demoResult.error);
      }
      router.push('/(tabs)');

    } catch (err) {
      console.error(err);
      Alert.alert('Unexpected Error', 'Something went wrong');
    }
  };

  const renderFamilyMember = (member: FamilyMember, index: number) => (
    <Animated.View
      key={member.id}
      entering={FadeInDown.delay(200 * index)}
    >
      <Card style={styles.memberCard} variant="glass">
        <View style={styles.memberHeader}>
          <View style={styles.memberTitleContainer}>
            <View style={styles.memberIconContainer}>
              <User size={20} color="#6BCF7F" />
            </View>
            <Text style={styles.memberTitle}>Member {index + 1}</Text>
          </View>
          {familyMembers.length > 1 && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveMember(member.id)}
            >
              <Minus size={16} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.memberForm}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              value={member.name}
              onChangeText={(value) => handleMemberChange(member.id, 'name', value)}
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                value={member.age !== null ? member.age.toString() : ''}
                onChangeText={(value) => handleMemberChange(member.id, 'age', value)}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
              <View style={styles.helperTextContainer}>
                <Text style={styles.star}>*</Text>
                <Text style={styles.helperText}>
                  Member below 18 years is considerd a child
                </Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      member.gender === gender && styles.genderButtonActive
                    ]}
                    onPress={() => handleMemberChange(member.id, 'gender', gender as any)}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      member.gender === gender && styles.genderButtonTextActive
                    ]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* <View style={styles.formRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="70"
                value={member.weight}
                onChangeText={(value) => handleMemberChange(member.id, 'weight', value)}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="175"
                value={member.height}
                onChangeText={(value) => handleMemberChange(member.id, 'height', value)}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View> */}
        </View>
      </Card>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Users size={32} color="#6BCF7F" />
            </View>
            <Text style={styles.title}>Personalize Your Experience</Text>
            <Text style={styles.subtitle}>
              Help us understand your household to provide better recommendations
            </Text>
          </View>

          <Card style={styles.regionCard} variant="elevated">
            <Text style={styles.sectionTitle}>Your Region</Text>
            <TouchableOpacity
              style={styles.regionSelector}
              onPress={() => setShowRegionDropdown(!showRegionDropdown)}
            >
              <Text style={[styles.regionText, !region && styles.placeholder]}>
                {region || 'Select your region'}
              </Text>
              <ChevronDown size={20} color="#8B9DC3" />
            </TouchableOpacity>

            {showRegionDropdown && (
              <View style={styles.dropdown}>
                {regions.map((regionOption) => (
                  <TouchableOpacity
                    key={regionOption}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setRegion(regionOption);
                      setShowRegionDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{regionOption}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <View style={styles.familySection}>
            <View style={styles.familySectionHeader}>
              <Text style={styles.sectionTitle}>Family Members</Text>
              <Text style={styles.familyCount}>{familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''}</Text>
            </View>

            {familyMembers.map((member, index) => renderFamilyMember(member, index))}

            <AnimatedTouchableOpacity
              style={styles.addMemberButton}
              onPress={handleAddMember}
              entering={FadeInDown.delay(400)}
            >
              <Plus size={20} color="#6BCF7F" />
              <Text style={styles.addMemberText}>Add Family Member</Text>
            </AnimatedTouchableOpacity>
          </View>

          <Animated.View entering={FadeInDown.delay(600)} style={styles.buttonContainer}>
            <Button
              title="Complete Setup"
              onPress={handleComplete}
              size="large"
              style={styles.completeButton}
            />
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',  // align items at the top (first line)
    marginTop: 4,
  },
  star: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#718096',
    marginRight: 4,
    // remove fixed width, so star doesn't get forced on multiple lines
    lineHeight: 18,  // try matching line height to text
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: 'Black',
    lineHeight: 18,
  },

  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  regionCard: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    marginBottom: 16,
  },
  regionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
  },
  regionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2D3748',
  },
  placeholder: {
    color: '#A0AEC0',
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2D3748',
  },
  familySection: {
    gap: 20,
  },
  familySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6BCF7F',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  removeButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FED7D7',
  },
  memberForm: {
    gap: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputContainer: {
    flex: 1,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%'
  },
  genderButtonActive: {
    backgroundColor: '#6BCF7F',
    borderColor: '#6BCF7F',
  },
  genderButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#718096',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#6BCF7F',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: 'rgba(107, 207, 127, 0.05)',
  },
  addMemberText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6BCF7F',
  },
  buttonContainer: {
    marginTop: 32,
  },
  completeButton: {
    width: '100%',
  },
});
