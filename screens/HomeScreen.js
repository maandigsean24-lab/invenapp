import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import ItemCard from '../components/ItemCard';
import ItemFormModal from '../components/ItemFormModal';
import useInventory from '../hooks/useInventory';
import { confirm, notify } from '../utils/dialog';
import { formatMoney, stockStatus } from '../utils/format';

const SORTS = [
  { key: 'name', label: 'Name A–Z', compare: (a, b) => a.name.localeCompare(b.name) },
  { key: 'qty', label: 'Lowest stock', compare: (a, b) => a.quantity - b.quantity },
  { key: 'value', label: 'Highest value', compare: (a, b) => b.quantity * b.price - a.quantity * a.price },
];

const SAMPLE_ITEMS = [
  { name: 'Laptop', category: 'Electronics', quantity: 12, price: 899 },
  { name: 'Wireless Mouse', category: 'Accessories', quantity: 34, price: 35 },
  { name: 'USB Cable', category: 'Accessories', quantity: 50, price: 12 },
  { name: 'Monitor', category: 'Electronics', quantity: 8, price: 249 },
];

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

export default function HomeScreen({ user, onLogout }) {
  const { items, loading, addItem, updateItem, adjustQuantity, removeItem } = useInventory(user.email);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortIndex, setSortIndex] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b)),
    [items]
  );

  // If the selected category no longer exists (last item deleted/renamed), fall back to All.
  const activeCategory = category === 'All' || categories.includes(category) ? category : 'All';

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => activeCategory === 'All' || item.category === activeCategory)
      .filter(
        (item) =>
          !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
      )
      .sort(SORTS[sortIndex].compare);
  }, [items, search, activeCategory, sortIndex]);

  const stats = useMemo(
    () => ({
      count: items.length,
      units: items.reduce((sum, item) => sum + item.quantity, 0),
      attention: items.filter((item) => stockStatus(item.quantity) !== 'ok').length,
      value: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    }),
    [items]
  );

  const openAdd = () => {
    setEditingItem(null);
    setFormVisible(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormVisible(true);
  };

  const handleSave = (fields) => {
    if (editingItem) updateItem(editingItem.id, fields);
    else addItem(fields);
    setFormVisible(false);
    setEditingItem(null);
  };

  const handleDelete = async (item) => {
    if (await confirm('Delete item', `Remove "${item.name}" from your inventory?`)) {
      removeItem(item.id);
    }
  };

  const handleExport = async () => {
    if (items.length === 0) {
      notify('Nothing to export', 'Add some items first.');
      return;
    }
    const rows = [
      ['Name', 'Category', 'Quantity', 'Price', 'Total value'],
      ...items.map((i) => [i.name, i.category, i.quantity, i.price, i.quantity * i.price]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(csv);
        notify('Copied', 'Inventory CSV copied to clipboard.');
      } else {
        await Share.share({ title: 'Inventory export', message: csv });
      }
    } catch (error) {
      console.error('Export failed.', error);
    }
  };

  const loadSamples = () => SAMPLE_ITEMS.forEach(addItem);

  const listHeader = (
    <View>
      <View style={styles.statsRow}>
        <StatCard label="Items" value={stats.count} />
        <StatCard label="Units" value={stats.units} />
        <StatCard label="Needs restock" value={stats.attention} warn={stats.attention > 0} />
        <StatCard label="Value" value={formatMoney(stats.value)} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#8a97ad" />
        <TextInput
          placeholder="Search inventory"
          placeholderTextColor="#8a97ad"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color="#8a97ad" />
          </Pressable>
        ) : null}
      </View>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {['All', ...categories].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, activeCategory === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>
          {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
        </Text>
        <Pressable style={styles.sortButton} onPress={() => setSortIndex((i) => (i + 1) % SORTS.length)}>
          <Ionicons name="swap-vertical" size={16} color="#2f6fed" />
          <Text style={styles.sortText}>{SORTS[sortIndex].label}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.welcome}>Welcome, {user.fullName}!</Text>
          <Text style={styles.title}>Inventory</Text>
        </View>
        <Pressable onPress={handleExport} style={styles.headerButton} accessibilityLabel="Export inventory">
          <Ionicons name="share-outline" size={22} color="#2f6fed" />
        </Pressable>
        <Pressable onPress={onLogout} style={styles.headerButton} accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={22} color="#2f6fed" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2f6fed" />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={48} color="#9db3d8" />
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyText}>Add your first item, or load a few samples to try things out.</Text>
                <AppButton label="Load sample items" variant="outline" onPress={loadSamples} style={styles.emptyButton} />
              </View>
            ) : (
              <Text style={styles.emptyText}>No inventory items match your search.</Text>
            )
          }
          renderItem={({ item }) => (
            <ItemCard item={item} onAdjust={adjustQuantity} onEdit={openEdit} onDelete={handleDelete} />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={openAdd} accessibilityLabel="Add item">
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <ItemFormModal
        visible={formVisible}
        item={editingItem}
        categories={categories}
        onSave={handleSave}
        onClose={() => {
          setFormVisible(false);
          setEditingItem(null);
        }}
      />
    </View>
  );
}

function StatCard({ label, value, warn }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, warn && styles.statWarn]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#eef4ff', paddingHorizontal: 20, paddingTop: topInset },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  welcome: { fontSize: 14, fontWeight: '600', color: '#5a6d8d' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#13233d' },
  headerButton: { padding: 8, marginLeft: 4 },
  loader: { marginTop: 40 },
  listContent: { paddingBottom: 100 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statLabel: { color: '#66748f', fontSize: 12, marginBottom: 6 },
  statValue: { color: '#13233d', fontSize: 22, fontWeight: '700' },
  statWarn: { color: '#b42318' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe7f5',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: '#13233d' },
  chips: { marginBottom: 12, flexGrow: 0 },
  chip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive: { backgroundColor: '#2f6fed' },
  chipText: { color: '#44536e', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultCount: { color: '#5a6d8d', fontSize: 13 },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: '#2f6fed', fontWeight: '600', marginLeft: 4, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#17294a', marginTop: 8 },
  emptyText: { textAlign: 'center', paddingVertical: 10, color: '#5a6d8d' },
  emptyButton: { marginTop: 8, alignSelf: 'stretch' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2f6fed',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
