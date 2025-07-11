import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart, X } from 'lucide-react-native';

const mockSuggestions = [
    { id: '1', name: 'Bananas', reason: 'Running low', priority: 'high' },
    { id: '2', name: 'Chicken Breast', reason: 'Protein goal', priority: 'medium' },
    { id: '3', name: 'Yogurt', reason: 'Family preference', priority: 'low' },
];

export default function ShopSuggestions() {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState(mockSuggestions);


    const params = useLocalSearchParams<{ userId?: string }>();
    const userId = params.userId;

    console.log(userId);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#FF6B6B';
            case 'medium': return '#FFB347';
            default: return '#4ECDC4';
        }
    };

    const removeItem = (id: string) => {
        setSuggestions(prev => prev.filter(item => item.id !== id));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
                    <ArrowLeft size={22} color="#2D3748" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shop Suggestions</Text>
                <View style={{ width: 22 }} />
            </View>

            <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 24 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardLeft}>
                            <View style={[styles.dot, { backgroundColor: getPriorityColor(item.priority) }]} />
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.reason}>{item.reason}</Text>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                onPress={() => Alert.alert('Added to Cart', `${item.name} has been added!`)}
                                style={styles.cartButton}
                            >
                                <ShoppingCart size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.dismissButton}>
                                <X size={18} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FBFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: '#F8FBFF',
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    backButton: { padding: 6, backgroundColor: '#E4FCEC', borderRadius: 10 },
    headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#2D3748' },

    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 14,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    name: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#2D3748' },
    reason: { fontSize: 14, color: '#718096', marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cartButton: {
        backgroundColor: '#6BCF7F',
        padding: 10,
        borderRadius: 10,
    },
    dismissButton: {
        backgroundColor: '#FFF5F5',
        padding: 10,
        borderRadius: 10,
    },
});
