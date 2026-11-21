import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';
import { deleteItemPhoto, getItemPhotoUrl, uploadItemPhoto } from '../utils/itemPhotos';

const ITEM_FIELDS = 'id, name, category, quantity, price, low_stock_threshold, image_path, created_at';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageError, setStorageError] = useState('');
  const itemsRef = useRef([]);
  const loaded = useRef(false);
  const writeQueue = useRef(Promise.resolve());

  const loadInventory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabaseRequest(() => supabase
        .from('inventory_items')
        .select(ITEM_FIELDS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }));
      throwDatabaseError(error, 'load your inventory');
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
  }, [userId]);

  useEffect(() => {
    loaded.current = false;
    loadInventory().catch(() => {});
  }, [loadInventory]);

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
    const imagePath = photo ? await uploadItemPhoto(userId, photo) : null;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .insert({ ...itemFields, low_stock_threshold: lowStockThreshold, image_path: imagePath, user_id: userId })
      .select(ITEM_FIELDS)
      .single());
    if (error) {
      if (imagePath) await deleteItemPhoto(imagePath);
      throwDatabaseError(error, 'save your item');
    }
    return [await itemFromRow(data), ...current];
  }), [mutate, userId]);

  const updateItem = useCallback((id, fields) => mutate(async (current) => {
    // The database trigger records a history entry when this edit changes quantity.
    const { lowStockThreshold, photo, ...itemFields } = fields;
    const previousItem = current.find((item) => item.id === id);
    if (!previousItem) throw new Error('This item is no longer in your inventory. Refresh and try again.');
    const uploadedPath = photo ? await uploadItemPhoto(userId, photo) : null;
    const imagePath = photo === undefined ? previousItem.image_path : uploadedPath;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .update({ ...itemFields, low_stock_threshold: lowStockThreshold, image_path: imagePath })
      .eq('id', id)
      .eq('user_id', userId)
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
  }), [mutate, userId]);

  const adjustQuantity = useCallback((id, change) => mutate(async (current) => {
    const item = current.find((entry) => entry.id === id);
    if (!item) throw new Error('This item is no longer in your inventory. Refresh and try again.');
    // The database trigger logs this quantity change in the same transaction.
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .update({ quantity: Math.max(0, item.quantity + change) })
      .eq('id', id)
      .eq('user_id', userId)
      .select(ITEM_FIELDS)
      .single());
    throwDatabaseError(error, 'update item quantity');
    const updated = await itemFromRow(data);
    return current.map((entry) => (entry.id === id ? updated : entry));
  }), [mutate, userId]);

  const removeItem = useCallback((id) => mutate(async (current) => {
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
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
  }), [mutate, userId]);

  return { items, loading, refreshing, storageError, refreshInventory: loadInventory, addItem, updateItem, adjustQuantity, removeItem };
}
