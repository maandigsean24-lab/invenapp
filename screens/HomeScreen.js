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
import BottomNavigation from '../components/BottomNavigation';
import NotificationsScreen from '../components/NotificationsScreen';
import ProfileMenuScreen from './ProfileMenuScreen';
import SettingsScreen from './SettingsScreen';
import SharedInventoriesScreen from './SharedInventoriesScreen';
import SharedInventoryScreen from './SharedInventoryScreen';
import HistoryScreen from './HistoryScreen';
import ProfileAvatar from '../components/ProfileAvatar';
import useInventory from '../hooks/useInventory';
import useNotifications from '../hooks/useNotifications';
import { confirm, notify } from '../utils/dialog';
import { formatMoney, LOW_STOCK_THRESHOLD, stockStatus } from '../utils/format';
import { markNotificationRead } from '../utils/notifications';
import { readUserSettings } from '../utils/settings';
import theme from '../theme';

const SORTS = [
  { key: 'name', label: 'Name A–Z', compare: (a, b) => a.name.localeCompare(b.name) },
  { key: 'qty', label: 'Lowest stock', compare: (a, b) => a.quantity - b.quantity },
  { key: 'newest', label: 'Newest', compare: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) },
];

export default function HomeScreen({ user, onLogout, onUserUpdate }) {
  const {
    items,
    inventories,
    pendingInvitationCount,
    selectedInventoryId,
    selectInventory,
    loading,
    refreshing,
    storageError,
    refreshInventory,
    addItem,
    updateItem,
    adjustQuantity,
    removeItem,
  } = useInventory(user.id);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    refreshNotifications,
  } = useNotifications(user.id);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortIndex, setSortIndex] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [pendingAddAfterLoad, setPendingAddAfterLoad] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [sharedInventoryVisible, setSharedInventoryVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [sharedPickerVisible, setSharedPickerVisible] = useState(false);
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

  const openAdd = () => {
    setEditingItem(null);
    setFormVisible(true);
  };

  useEffect(() => {
    if (!pendingAddAfterLoad || loading || !thresholdLoaded) return;
    setPendingAddAfterLoad(false);
    if (storageError) {
      notify('Could not open add item', storageError);
      return;
    }
    openAdd();
  }, [pendingAddAfterLoad, loading, thresholdLoaded, storageError]);

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

  const handleNotificationSelect = async (notification, openInvitations = false) => {
    try {
      await markNotificationRead(notification.id, user.id);
      await refreshNotifications();
      if (openInvitations) {
        setPendingAddAfterLoad(false);
        setActiveTab('profile');
        setSharedInventoryVisible(true);
      }
    } catch (error) {
      notify('Could not update notification', error.message);
    }
  };

  const handleReturnToPersonalInventory = () => {
    setPendingAddAfterLoad(false);
    setSettingsVisible(false);
    selectInventory(user.id);
    setActiveTab('home');
    setSharedPickerVisible(false);
    setCategory('All');
    setSearch('');
  };

  const handleSelectSharedInventory = (inventory) => {
    setPendingAddAfterLoad(false);
    selectInventory(inventory.id);
    setCategory('All');
    setSearch('');
    setSharedPickerVisible(false);
    setActiveTab('shared');
  };

  const openSharedManagement = () => {
    setPendingAddAfterLoad(false);
    setActiveTab('profile');
    setSharedInventoryVisible(true);
  };

  const handleAddFromNavigation = () => {
    setSettingsVisible(false);
    const viewingInventory = activeTab === 'home' || (activeTab === 'shared' && !sharedPickerVisible);
    if (!viewingInventory) {
      setSharedPickerVisible(false);
      setCategory('All');
      setSearch('');
      setActiveTab('home');
      if (selectedInventoryId !== user.id) {
        selectInventory(user.id);
        setPendingAddAfterLoad(true);
        return;
      }
    }
    setActiveTab(selectedInventoryId === user.id ? 'home' : 'shared');
    setSharedPickerVisible(false);
    if (loading || !thresholdLoaded) setPendingAddAfterLoad(true);
    else openAdd();
  };

  const returnToSelectedInventory = () => {
    setSharedPickerVisible(false);
    setActiveTab(selectedInventoryId === user.id ? 'home' : 'shared');
  };

  const currentInventory = inventories.find((inventory) => inventory.id === selectedInventoryId);

  const listHeader = (
    <View>
      {storageError ? <Text style={styles.storageError}>{storageError}</Text> : null}
      {settingsError ? <Text style={styles.storageError}>{settingsError} Low-stock counts are using the default threshold until settings can be loaded.</Text> : null}
      {pendingInvitationCount > 0 ? (
        <Pressable
          style={styles.invitationBanner}
          onPress={openSharedManagement}
          accessibilityRole="button"
          accessibilityLabel={`${pendingInvitationCount} inventory invitation${pendingInvitationCount === 1 ? '' : 's'} pending. Review invitations.`}
        >
          <Ionicons name="mail-unread-outline" size={19} color={theme.colors.primary} />
          <Text style={styles.invitationText}>
            {pendingInvitationCount === 1 ? 'You have an invitation' : `You have ${pendingInvitationCount} invitations`}
            {' · Review invitations'}
          </Text>
        </Pressable>
      ) : null}
      {selectedInventoryId !== user.id && currentInventory ? (
        <View style={styles.sharedInventoryBanner}>
          <ProfileAvatar name={currentInventory.ownerName} size={38} />
          <View style={styles.sharedInventoryInfo}>
            <Text style={styles.sharedInventoryName} numberOfLines={1}>{currentInventory.ownerName}’s shared stock</Text>
            <Text style={styles.sharedInventoryHint}>Live updates are on</Text>
          </View>
          <Pressable
            style={styles.switchInventoryButton}
            onPress={() => {
              setActiveTab('shared');
              setSharedPickerVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Choose another shared inventory"
          >
            <Text style={styles.switchInventoryText}>Switch</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.statsRow}>
        <StatCard label="Items" value={stats.count} icon="cube-outline" />
        <StatCard label="Units" value={stats.units} icon="layers-outline" />
        <StatCard label="Needs restock" value={stats.attention} icon="alert-circle-outline" warn={stats.attention > 0} />
        <StatCard label="Value" value={formatMoney(stats.value)} icon="cash-outline" />
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

  const navigation = (
    <BottomNavigation
      activeTab={activeTab}
      userName={user.fullName || user.email}
      unreadCount={unreadCount}
      onHome={handleReturnToPersonalInventory}
      onShared={() => {
        setPendingAddAfterLoad(false);
        setSettingsVisible(false);
        setActiveTab('shared');
        setSharedPickerVisible(true);
      }}
      onAdd={handleAddFromNavigation}
      onNotifications={() => {
        setPendingAddAfterLoad(false);
        setSettingsVisible(false);
        setActiveTab('notifications');
      }}
      onProfile={() => {
        setPendingAddAfterLoad(false);
        setSettingsVisible(false);
        setActiveTab('profile');
      }}
    />
  );

  if (sharedInventoryVisible) {
    return (
      <SharedInventoryScreen
        user={user}
        onBack={() => setSharedInventoryVisible(false)}
        onLeaveInventory={(ownerId) => {
          if (selectedInventoryId === ownerId) {
            handleReturnToPersonalInventory();
            setSharedInventoryVisible(false);
          }
        }}
      />
    );
  }

  if (settingsVisible) {
    return (
      <View style={styles.appContainer}>
        <View style={styles.flex}>
          <SettingsScreen
            user={user}
            threshold={threshold}
            onBack={() => setSettingsVisible(false)}
            onThresholdChange={(value) => {
              setThreshold(value);
              setSettingsError('');
            }}
          />
        </View>
        {navigation}
      </View>
    );
  }

  if (historyItem) {
    return <HistoryScreen item={historyItem} onBack={() => setHistoryItem(null)} />;
  }

  if (activeTab === 'profile') {
    return (
      <View style={styles.appContainer}>
        <View style={styles.flex}>
          <ProfileMenuScreen
            user={user}
            onUserUpdate={onUserUpdate}
            onOpenSettings={() => setSettingsVisible(true)}
            onOpenSharedInventory={() => setSharedInventoryVisible(true)}
            onLogout={onLogout}
          />
        </View>
        {navigation}
      </View>
    );
  }

  if (activeTab === 'notifications') {
    return (
      <View style={styles.appContainer}>
        <View style={styles.flex}>
          <NotificationsScreen
            notifications={notifications}
            loading={notificationsLoading}
            error={notificationsError}
            onBack={returnToSelectedInventory}
            onSelectNotification={(notification) => handleNotificationSelect(notification)}
            onOpenInvitation={(notification) => handleNotificationSelect(notification, true)}
          />
        </View>
        {navigation}
      </View>
    );
  }

  if (activeTab === 'shared' && sharedPickerVisible) {
    return (
      <View style={styles.appContainer}>
        <View style={styles.flex}>
          <SharedInventoriesScreen
            inventories={inventories}
            pendingInvitationCount={pendingInvitationCount}
            onSelectInventory={handleSelectSharedInventory}
            onReviewInvitations={() => setActiveTab('notifications')}
            onManageSharing={openSharedManagement}
          />
        </View>
        {navigation}
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <View style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.header}>
          <Image
            source={require('../assets/brand-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="InvenApp logo"
          />
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
                    <Text style={styles.emptyText}>No items yet. Tap Add to create one.</Text>
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
      </View>

      {navigation}
    </View>
  );
}

function StatCard({ label, value, icon, warn }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeading}>
        <Ionicons name={icon} size={17} color={warn ? theme.colors.danger : theme.colors.primary} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, warn && styles.statWarn]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.xl, paddingTop: topInset },
  header: { alignItems: 'flex-start', marginBottom: 12 },
  brandLogo: { width: 156, height: 36, alignSelf: 'flex-start', marginTop: 3 },
  loader: { marginTop: 40 },
  listContent: { paddingBottom: 24 },
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
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statLabel: { color: theme.colors.muted, fontSize: theme.fontSizes.sm },
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
  sharedInventoryBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, elevation: 1 },
  sharedInventoryInfo: { flex: 1, marginLeft: theme.spacing.md },
  sharedInventoryName: { color: theme.colors.text, fontSize: theme.fontSizes.sm, fontWeight: '700' },
  sharedInventoryHint: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, marginTop: 3 },
  switchInventoryButton: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  switchInventoryText: { color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '700' },
  invitationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.chip, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  invitationText: { flex: 1, color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '600' },
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
});
