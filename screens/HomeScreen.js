import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';

const SAMPLE_ITEMS = [
  { id: '1', name: 'Laptop', category: 'Electronics', quantity: 12, price: 899 },
  { id: '2', name: 'Wireless Mouse', category: 'Accessories', quantity: 34, price: 35 },
  { id: '3', name: 'USB Cable', category: 'Accessories', quantity: 50, price: 12 },
  { id: '4', name: 'Monitor', category: 'Electronics', quantity: 8, price: 249 },
];

const EMPTY_FORM = {
  name: '',
  category: '',
  quantity: '',
  price: '',
};

export default function HomeScreen({ username, onLogout }) {
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_FORM);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const stored = await AsyncStorage.getItem('inventory');

        if (stored) {
          setItems(JSON.parse(stored));
          return;
        }

        await AsyncStorage.setItem('inventory', JSON.stringify(SAMPLE_ITEMS));
      } catch (error) {
        console.error('Failed to load inventory.', error);
      }
    };

    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter(
      (item) => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
  }, [items, search]);

  const persistItems = async (nextItems) => {
    setItems(nextItems);
    await AsyncStorage.setItem('inventory', JSON.stringify(nextItems));
  };

  const handleAddItem = async () => {
    const name = newItem.name.trim();
    const category = newItem.category.trim();
    const quantity = Number(newItem.quantity);
    const price = Number(newItem.price);

    if (!name || !category || !newItem.quantity || !newItem.price) {
      Alert.alert('Missing information', 'Please complete all item fields.');
      return;
    }

    if (Number.isNaN(quantity) || Number.isNaN(price) || quantity < 0 || price < 0) {
      Alert.alert('Invalid values', 'Quantity and price must be valid numbers.');
      return;
    }

    const nextItem = {
      id: Date.now().toString(),
      name,
      category,
      quantity,
      price,
    };

    const updatedItems = [nextItem, ...items];
    await persistItems(updatedItems);
    setNewItem(EMPTY_FORM);
    setShowForm(false);
  };

  const updateQuantity = async (id, change) => {
    const updatedItems = items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      return { ...item, quantity: Math.max(0, item.quantity + change) };
    });

    await persistItems(updatedItems);
  };

  const deleteItem = async (id) => {
    const updatedItems = items.filter((item) => item.id !== id);
    await persistItems(updatedItems);
  };

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = items.filter((item) => item.quantity < 10).length;
  const inventoryValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {username}!</Text>
        <Pressable onPress={onLogout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Inventory Overview</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total items</Text>
          <Text style={styles.statValue}>{items.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Units</Text>
          <Text style={styles.statValue}>{totalUnits}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low stock</Text>
          <Text style={styles.statValue}>{lowStockCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Value</Text>
          <Text style={styles.statValue}>₱{inventoryValue}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          placeholder="Search inventory"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <AppButton label="Add item" onPress={() => setShowForm(true)} style={styles.addButton} />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No inventory items match your search.</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSubText}>{item.category}</Text>
              <Text style={styles.itemSubText}>₱{item.price} each</Text>
            </View>

            <View style={styles.itemControls}>
              <Text style={styles.quantityLabel}>Qty: {item.quantity}</Text>
              <View style={styles.counterRow}>
                <Pressable style={styles.counterButton} onPress={() => updateQuantity(item.id, -1)}>
                  <Text style={styles.counterText}>-</Text>
                </Pressable>
                <Pressable style={styles.counterButton} onPress={() => updateQuantity(item.id, 1)}>
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => deleteItem(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add inventory item</Text>

            <FormInput
              placeholder="Item name"
              value={newItem.name}
              onChangeText={(value) => setNewItem((current) => ({ ...current, name: value }))}
            />
            <FormInput
              placeholder="Category"
              value={newItem.category}
              onChangeText={(value) => setNewItem((current) => ({ ...current, category: value }))}
            />
            <FormInput
              placeholder="Quantity"
              keyboardType="numeric"
              value={newItem.quantity}
              onChangeText={(value) => setNewItem((current) => ({ ...current, quantity: value }))}
            />
            <FormInput
              placeholder="Price"
              keyboardType="decimal-pad"
              value={newItem.price}
              onChangeText={(value) => setNewItem((current) => ({ ...current, price: value }))}
            />

            <View style={styles.modalActions}>
              <AppButton label="Save item" onPress={handleAddItem} style={styles.saveButton} />
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef4ff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  welcome: { fontSize: 16, fontWeight: '600', color: '#1d2b45' },
  logout: { fontSize: 14, color: '#2f6fed', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#13233d', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statLabel: { color: '#66748f', fontSize: 12, marginBottom: 6 },
  statValue: { color: '#13233d', fontSize: 22, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe7f5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 0,
  },
  addButton: {
    paddingHorizontal: 14,
    minWidth: 120,
  },
  listContent: { paddingBottom: 18 },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: '700', color: '#17294a', marginBottom: 4 },
  itemSubText: { color: '#5a6d8d', fontSize: 12 },
  itemControls: { alignItems: 'flex-end' },
  quantityLabel: { fontSize: 14, fontWeight: '600', color: '#1d2b45', marginBottom: 8 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfeaff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  counterText: { fontSize: 18, fontWeight: '700', color: '#163d7a' },
  deleteText: { color: '#d33b3b', fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 20, color: '#5a6d8d' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#13233d', marginBottom: 16 },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  saveButton: { flex: 1, marginRight: 12 },
  cancelText: { color: '#2f6fed', fontWeight: '700', paddingVertical: 12 },
});