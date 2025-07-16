import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FamilyMember {
  id: string;
  name: string;
  age: number | null;
  gender: 'Male' | 'Female';
}

const API_BASE_URL = 'http://192.168.0.101:3000';

export default function FamilyMembersScreen() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState<FamilyMember>({
    id: '',
    name: '',
    age: null,
    gender: 'Male',
  });

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const email = await AsyncStorage.getItem('user_email');
        if (!email) throw new Error('User email not found');

        const response = await fetch(`${API_BASE_URL}/api/family/${encodeURIComponent(email)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch');

        if (Array.isArray(data)) {
          setMembers(
            data.map((m: any) => ({
              id: m.id || Date.now().toString() + Math.random(),
              name: m.name || '',
              age: m.age || null,
              gender: m.gender === 'Female' ? 'Female' : 'Male',
            }))
          );
        } else {
          throw new Error('Expected array but got object');
        }
      } catch (err: any) {
        console.error('Error fetching family:', err.message || err);
        setMembers([]);
      }
    };

    fetchFamily();
  }, []);

  const handleAddPress = () => {
    setAdding(true);
    setNewMember({
      id: Date.now().toString(),
      name: '',
      age: null,
      gender: 'Male',
    });
  };

  const handleChange = (field: keyof FamilyMember, value: string) => {
    setNewMember(prev => ({
      ...prev,
      [field]: field === 'age' ? (value === '' ? null : parseInt(value)) : value,
    }));
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim() || newMember.age === null || isNaN(newMember.age) || newMember.age < 1 || newMember.age > 120) {
      Alert.alert('Validation Error', 'Please enter valid name and age between 1 and 120');
      return;
    }
    // setMembers([...members, newMember]);
    // setNewMember({ id: '', name: '', age: null, gender: 'Male' });
    // setAdding(false);
  const updatedMembers = [...members, newMember];
  setMembers(updatedMembers);
  setNewMember({ id: '', name: '', age: null, gender: 'Male' });
  setAdding(false);
    // send to database
    
  try {
    const email = await AsyncStorage.getItem('user_email');
    if (!email) throw new Error('User email not found');

    const response = await fetch(`${API_BASE_URL}/api/family-setup`, {
      method: 'POST', // or PUT depending on your API
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        family_members: updatedMembers,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      Alert.alert('Save Failed', result.error || 'Unknown error');
    } else {
      Alert.alert('Success', 'Family member Added Successfully!');
    }
 
    const demographicsResponse = await fetch(`${API_BASE_URL}/api/update-user-demographics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      family_members: updatedMembers,
    }),
  });

  const demoResult = await demographicsResponse.json();

  if (!demographicsResponse.ok) {
    Alert.alert('Warning', 'Family data saved but demographic update failed');
    console.error('Demographics error:', demoResult.error);
  }
  } catch (error: any) {
    console.error(error);
    Alert.alert('Error', 'Failed to save family members');
  }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Family Members</Text>

        {members.map((member, index) => (
          <View key={member.id} style={styles.memberCard}>
            <Text style={styles.memberTitle}>👤 {member.name}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Age:</Text> {member.age}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Gender:</Text> {member.gender}</Text>
          </View>
        ))}

        {adding && (
          <View style={[styles.memberCard, { backgroundColor: '#B3E5FC', 
    borderRadius: 20,  
           }]}>
             <View style={styles.addMemberHeader}>
    <Text style={styles.memberTitle}>Add New Member</Text>
    <TouchableOpacity onPress={() => setAdding(false)} style={styles.cancelButton}>
      <Text style={styles.cancelButtonText}>Cancel</Text>
    </TouchableOpacity>
  </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={newMember.name}
                onChangeText={(val) => handleChange('name', val)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter age"
                keyboardType="numeric"
                value={newMember.age !== null ? newMember.age.toString() : ''}
                onChangeText={(val) => handleChange('age', val)}
              />
              <Text style={styles.helperText}>* Member below 18 years is considered a child</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      newMember.gender === gender && styles.genderButtonActive,
                    ]}
                    onPress={() => handleChange('gender', gender)}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        newMember.gender === gender && styles.genderButtonTextActive,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddMember}>
              <Text style={styles.saveButtonText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {!adding && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
            <Text style={styles.addButtonText}>+ Add Family Member</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
  },
  memberCard: {
    backgroundColor: '#D4F6C8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  memberTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  detail: {
    fontSize: 16,
    color: '#4A5568',
  },
  label: {
    fontWeight: 'bold',
  },
  inputGroup: {
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#9ACD32',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#9ACD32',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderButtonActive: {
    backgroundColor: '#9ACD32',
    borderColor: '#9ACD32',
  },
  genderButtonText: {
    color: '#4A5568',
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: 'bold',
    marginTop: 4,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: '#6BCF7F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#4A5568',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addMemberHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: -5,
},
cancelButton: {
paddingHorizontal: 15,  // bigger horizontal padding
  paddingVertical: 6,    // bigger vertical padding
  backgroundColor: '#E53E3E', // red color for cancel
  borderRadius: 10,
},
cancelButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 15,
},

});
