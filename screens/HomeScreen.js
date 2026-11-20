import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemCard from '../components/ItemCard';
import ItemFormModal from '../components/ItemFormModal';
import SettingsScreen from './SettingsScreen';
import HistoryScreen from './HistoryScreen';
import useInventory from '../hooks/useInventory';
import { confirm, notify } from '../utils/dialog';
import { formatMoney, formatName, LOW_STOCK_THRESHOLD, stockStatus } from '../utils/format';
import { readUserSettings } from '../utils/settings';
import theme from '../theme';

const SORTS = [
  { key: 'name', label: 'Name A–Z', compare: (a, b) => a.name.localeCompare(b.name) },
  { key: 'qty', label: 'Lowest stock', compare: (a, b) => a.quantity - b.quantity },
  { key: 'newest', label: 'Newest', compare: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) },
];

export default function HomeScreen({ user, onLogout, onUserUpdate }) {
  const { items, loading, refreshing, storageError, refreshInventory, addItem, updateItem, adjustQuantity, removeItem } = useInventory(user.id);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortIndex, setSortIndex] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [threshold, setThreshold] = useState(LOW_STOCK_THRESHOLD);
  const [thresholdLoaded, setThresholdLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    let active = true;
    readUserSettings(user.id)
      .then((settings) => {
        if (!active) return;
        setThreshold(settings.lowStockThreshold);
        setSettingsError('');
      })
      .catch((error) => {
        if (!active) return;
        setSettingsError(error.message);
        notify('Could not load settings', error.message);
      })
      .finally(() => {
        if (active) setThresholdLoaded(true);
      });
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(''), 2400);
    return () => clearTimeout(timer);
  }, [successMessage]);

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
      attention: items.filter((item) => stockStatus(item.quantity, item.lowStockThreshold ?? threshold) !== 'ok').length,
      value: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    }),
    [items, threshold]
  );

  const userInitials = useMemo(
    () => formatName(user.fullName || user.email)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase(),
    [user.email, user.fullName]
  );

  const openAdd = () => {
    setEditingItem(null);
    setFormVisible(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormVisible(true);
  };

  const handleSave = async (fields) => {
    try {
      if (editingItem) await updateItem(editingItem.id, fields);
      else await addItem(fields);
      setFormVisible(false);
      setEditingItem(null);
      setSuccessMessage(editingItem ? 'Item updated.' : 'Item added.');
      return true;
    } catch (error) {
      notify('Could not save item', error.message);
      return false;
    }
  };

  const handleDelete = async (item) => {
    if (await confirm('Delete item', `Remove "${item.name}" from your inventory?`)) {
      try {
        await removeItem(item.id);
        setSuccessMessage('Item deleted.');
      } catch (error) {
        notify('Could not delete item', error.message);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshInventory(true);
    } catch {
      // The inventory hook exposes the failure inline and keeps the previous items visible.
    }
  };

  const handleAdjust = async (id, change) => {
    try {
      await adjustQuantity(id, change);
    } catch (error) {
      notify('Could not update quantity', error.message);
    }
  };

  const listHeader = (
    <View>
      {storageError ? <Text style={styles.storageError}>{storageError}</Text> : null}
      {settingsError ? <Text style={styles.storageError}>{settingsError} Low-stock counts are using the default threshold until settings can be loaded.</Text> : null}
      <View style={styles.statsRow}>
        <StatCard label="Items" value={stats.count} />
        <StatCard label="Units" value={stats.units} />
        <StatCard label="Needs restock" value={stats.attention} warn={stats.attention > 0} />
        <StatCard label="Value" value={formatMoney(stats.value)} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={theme.colors.placeholder} />
        <TextInput
          placeholder="Search inventory"
          placeholderTextColor={theme.colors.placeholder}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={theme.colors.placeholder} />
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
          <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
          <Text style={styles.sortText}>{SORTS[sortIndex].label}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (settingsVisible) {
    return (
      <SettingsScreen
        user={user}
        threshold={threshold}
        onBack={() => setSettingsVisible(false)}
        onUserUpdate={onUserUpdate}
        onThresholdChange={(value) => {
          setThreshold(value);
          setSettingsError('');
        }}
        onLogout={onLogout}
      />
    );
  }

  if (historyItem) {
    return <HistoryScreen user={user} item={historyItem} onBack={() => setHistoryItem(null)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatar} accessible accessibilityLabel={`Profile initials ${userInitials}`}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <Text style={styles.welcome} numberOfLines={1}>{formatName(user.fullName) || user.email}</Text>
          </View>
          <Image
            source={require('../assets/brand-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="InvenApp logo"
          />
        </View>
        <Pressable onPress={() => setSettingsVisible(true)} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Open settings">
          <Ionicons name="settings-outline" size={23} color={theme.colors.primary} />
        </Pressable>
      </View>

      {loading || !thresholdLoaded ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            storageError && items.length === 0 ? (
              <Text style={styles.emptyText}>Inventory could not be loaded. Pull down to retry.</Text>
            ) : items.length === 0 ? (
              <View style={styles.empty}>
                <Image source={require('../assets/logo-mark.png')} style={styles.emptyIcon} resizeMode="contain" />
                <Text style={styles.emptyText}>No items yet. Tap + to add one.</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No inventory items match your search.</Text>
            )
          }
          renderItem={({ item }) => (
            <ItemCard item={item} threshold={threshold} onAdjust={handleAdjust} onEdit={openEdit} onDelete={handleDelete} onHistory={setHistoryItem} />
          )}
        />
      )}
      {successMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <Pressable style={styles.fab} onPress={openAdd} accessibilityLabel="Add item">
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <ItemFormModal
        visible={formVisible}
        item={editingItem}
        categories={categories}
        defaultThreshold={threshold}
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
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.xl, paddingTop: topInset },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: { color: theme.colors.primary, fontSize: theme.fontSizes.xs, fontWeight: '700' },
  welcome: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.muted },
  brandLogo: { width: 156, height: 36, alignSelf: 'flex-start', marginTop: 3 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  loader: { marginTop: 40 },
  listContent: { paddingBottom: 128 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statLabel: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginBottom: 6 },
  statValue: { color: theme.colors.text, fontSize: theme.fontSizes.xl, fontWeight: '700' },
  statWarn: { color: theme.colors.danger },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: theme.fontSizes.body, color: theme.colors.text },
  chips: { marginBottom: 12, flexGrow: 0 },
  chip: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.round, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.label, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultCount: { color: theme.colors.muted, fontSize: 13 },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: theme.colors.primary, fontWeight: '600', marginLeft: 4, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { width: 56, height: 56, marginBottom: theme.spacing.sm },
  emptyText: { textAlign: 'center', paddingVertical: 10, color: theme.colors.muted },
  storageError: { color: theme.colors.danger, backgroundColor: theme.colors.dangerBackground, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  successBanner: { position: 'absolute', top: topInset + 54, alignSelf: 'center', backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 10 },
  successText: { color: '#fff', fontSize: theme.fontSizes.md, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
