import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AppButton from '../components/AppButton';

const SAMPLE_ITEMS = [
  { id: '1', name: 'Laptop', quantity: 12 },
  { id: '2', name: 'Wireless Mouse', quantity: 34 },
  { id: '3', name: 'USB Cable', quantity: 50 },
  { id: '4', name: 'Monitor', quantity: 8 },
];

export default function HomeScreen({ username, onLogout }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {username}!</Text>
      </View>

      <Text style={styles.title}>Inventory</Text>

      <FlatList
        data={SAMPLE_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
          </View>
        )}
      />

      <AppButton label="Log Out" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: { fontSize: 16 },
  itemQty: { fontSize: 16, color: '#555' },
});