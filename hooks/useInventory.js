import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';
import { deleteItemPhoto, getItemPhotoUrl, uploadItemPhoto } from '../utils/itemPhotos';

const ITEM_FIELDS = 'id, user_id, name, category, quantity, price, low_stock_threshold, image_path, created_at';

async function itemFromRow(row) {
  const { low_stock_threshold: lowStockThreshold, ...item } = row;
  return {
    ...item,
    price: Number(row.price),
    lowStockThreshold,
    photoUrl: await getItemPhotoUrl(row.image_path),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function throwDatabaseError(error, action) {
  if (error) throw new Error(`Unable to ${action}: ${supabaseErrorMessage(error)}`);
}

export default function useInventory(userId) {
  const [items, setItems] = useState([]);
  const [inventories, setInventories] = useState([{ id: userId, name: 'My inventory', isOwner: true }]);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const [selectedInventoryId, setSelectedInventoryId] = useState(userId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageError, setStorageError] = useState('');
  const itemsRef = useRef([]);
  const loaded = useRef(false);
  const selectedInventoryRef = useRef(userId);
  const writeQueue = useRef(Promise.resolve());

  const loadInventories = useCallback(async () => {
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_shares')
      .select('owner_id, owner_name, status')
      .eq('invited_user_id', userId)
      .order('created_at', { ascending: true }));
    throwDatabaseError(error, 'load shared inventories');

    const availableInventories = [
      { id: userId, name: 'My inventory', isOwner: true },
      ...(data || []).filter((share) => share.status === 'accepted').map((share) => ({
        id: share.owner_id,
        name: `${share.owner_name || 'Shared'}'s inventory`,
        ownerName: share.owner_name || 'Shared user',
        isOwner: false,
      })),
    ];
    setPendingInvitationCount((data || []).filter((share) => share.status === 'pending').length);
    setInventories(availableInventories);

    if (!availableInventories.some((inventory) => inventory.id === selectedInventoryRef.current)) {
      selectedInventoryRef.current = userId;
      loaded.current = false;
      setLoading(true);
      setSelectedInventoryId(userId);
    }
    return availableInventories;
  }, [userId]);

  const loadInventory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabaseRequest(() => supabase
        .from('inventory_items')
        .select(ITEM_FIELDS)
        .eq('user_id', selectedInventoryId)
        .order('created_at', { ascending: false }));
      throwDatabaseError(error, 'load this inventory');
      const loadedItems = await Promise.all(data.map(itemFromRow));
      itemsRef.current = loadedItems;
      setItems(loadedItems);
      setStorageError('');
      loaded.current = true;
    } catch (error) {
      setStorageError(error.message);
      if (!loaded.current) itemsRef.current = [];
      throw error;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedInventoryId]);

  useEffect(() => {
    loaded.current = false;
    selectedInventoryRef.current = userId;
    setSelectedInventoryId(userId);
    setInventories([{ id: userId, name: 'My inventory', isOwner: true }]);
    loadInventories().catch((error) => setStorageError(error.message));
  }, [loadInventories, userId]);

  useEffect(() => {
    loadInventory().catch(() => {});
  }, [loadInventory]);

  useEffect(() => {
    const channel = supabase
      .channel(`inventory-shares-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_shares' }, () => {
        loadInventories().catch((error) => setStorageError(error.message));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInventories, userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`inventory-items-${userId}-${selectedInventoryId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items',
        filter: `user_id=eq.${selectedInventoryId}`,
      }, () => {
        loadInventory(true).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInventory, selectedInventoryId, userId]);

  const selectInventory = useCallback((inventoryId) => {
    if (!inventories.some((inventory) => inventory.id === inventoryId)) return;
    if (selectedInventoryRef.current === inventoryId) return;
    selectedInventoryRef.current = inventoryId;
    loaded.current = false;
    setLoading(true);
    setStorageError('');
    setSelectedInventoryId(inventoryId);
  }, [inventories]);

  const mutate = useCallback((operation) => {
    const queuedOperation = writeQueue.current.catch(() => {}).then(async () => {
      if (!loaded.current) throw new Error('Inventory is still loading. Please try again.');
      const nextItems = await operation(itemsRef.current);
      const nextState = Array.isArray(nextItems) ? { items: nextItems, warning: '' } : nextItems;
      itemsRef.current = nextState.items;
      setItems(nextState.items);
      setStorageError(nextState.warning);
    });
    writeQueue.current = queuedOperation;
    return queuedOperation;
  }, []);

  const addItem = useCallback((fields) => mutate(async (current) => {
    const { lowStockThreshold, photo, ...itemFields } = fields;
    const imagePath = photo ? await uploadItemPhoto(selectedInventoryId, photo) : null;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .insert({ ...itemFields, low_stock_threshold: lowStockThreshold, image_path: imagePath, user_id: selectedInventoryId })
      .select(ITEM_FIELDS)
      .single());
    if (error) {
      if (imagePath) await deleteItemPhoto(imagePath);
      throwDatabaseError(error, 'save your item');
    }
    return [await itemFromRow(data), ...current];
  }), [mutate, selectedInventoryId]);

  const updateItem = useCallback((id, fields) => mutate(async (current) => {
    // The database trigger records a history entry when this edit changes quantity.
    const { lowStockThreshold, photo, ...itemFields } = fields;
    const previousItem = current.find((item) => item.id === id);
    if (!previousItem) throw new Error('This item is no longer in your inventory. Refresh and try again.');
    const uploadedPath = photo ? await uploadItemPhoto(selectedInventoryId, photo) : null;
    const imagePath = photo === undefined ? previousItem.image_path : uploadedPath;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .update({ ...itemFields, low_stock_threshold: lowStockThreshold, image_path: imagePath })
      .eq('id', id)
      .eq('user_id', selectedInventoryId)
      .select(ITEM_FIELDS)
      .single());
    if (error) {
      if (uploadedPath) await deleteItemPhoto(uploadedPath);
      throwDatabaseError(error, 'update your item');
    }
    const updated = await itemFromRow(data);
    let warning = '';
    if (previousItem.image_path && previousItem.image_path !== imagePath) {
      try {
        await deleteItemPhoto(previousItem.image_path);
      } catch (cleanupError) {
        warning = `Item saved, but its previous photo could not be removed: ${cleanupError.message}`;
      }
    }
    return {
      items: current.map((item) => (item.id === id ? updated : item)),
      warning,
    };
  }), [mutate, selectedInventoryId]);

  const adjustQuantity = useCallback((id, change) => mutate(async (current) => {
    const item = current.find((entry) => entry.id === id);
    if (!item) throw new Error('This item is no longer in your inventory. Refresh and try again.');
    // The database trigger logs this quantity change in the same transaction.
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .update({ quantity: Math.max(0, item.quantity + change) })
      .eq('id', id)
      .eq('user_id', selectedInventoryId)
      .select(ITEM_FIELDS)
      .single());
    throwDatabaseError(error, 'update item quantity');
    const updated = await itemFromRow(data);
    return current.map((entry) => (entry.id === id ? updated : entry));
  }), [mutate, selectedInventoryId]);

  const removeItem = useCallback((id) => mutate(async (current) => {
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', selectedInventoryId)
      .select('id, image_path')
      .single());
    throwDatabaseError(error, 'delete your item');
    let warning = '';
    if (data.image_path) {
      try {
        await deleteItemPhoto(data.image_path);
      } catch (cleanupError) {
        warning = `Item deleted, but its photo could not be removed: ${cleanupError.message}`;
      }
    }
    return { items: current.filter((item) => item.id !== data.id), warning };
  }), [mutate, selectedInventoryId]);

  return {
    items,
    inventories,
    pendingInvitationCount,
    selectedInventoryId,
    selectInventory,
    loading,
    refreshing,
    storageError,
    refreshInventory: loadInventory,
    addItem,
    updateItem,
    adjustQuantity,
    removeItem,
  };
}
