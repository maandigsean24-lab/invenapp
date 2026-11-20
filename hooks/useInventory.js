import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

const ITEM_FIELDS = 'id, name, category, quantity, price, low_stock_threshold, created_at';

function itemFromRow(row) {
  const { low_stock_threshold: lowStockThreshold, ...item } = row;
  return {
    ...item,
    price: Number(row.price),
    lowStockThreshold,
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
      const loadedItems = data.map(itemFromRow);
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
      itemsRef.current = nextItems;
      setItems(nextItems);
      setStorageError('');
    });
    writeQueue.current = queuedOperation;
    return queuedOperation;
  }, []);

  const addItem = useCallback((fields) => mutate(async (current) => {
    const { lowStockThreshold, ...itemFields } = fields;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .insert({ ...itemFields, low_stock_threshold: lowStockThreshold, user_id: userId })
      .select(ITEM_FIELDS)
      .single());
    throwDatabaseError(error, 'save your item');
    return [itemFromRow(data), ...current];
  }), [mutate, userId]);

  const updateItem = useCallback((id, fields) => mutate(async (current) => {
    // The database trigger records a history entry when this edit changes quantity.
    const { lowStockThreshold, ...itemFields } = fields;
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .update({ ...itemFields, low_stock_threshold: lowStockThreshold })
      .eq('id', id)
      .eq('user_id', userId)
      .select(ITEM_FIELDS)
      .single());
    throwDatabaseError(error, 'update your item');
    const updated = itemFromRow(data);
    return current.map((item) => (item.id === id ? updated : item));
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
    const updated = itemFromRow(data);
    return current.map((entry) => (entry.id === id ? updated : entry));
  }), [mutate, userId]);

  const removeItem = useCallback((id) => mutate(async (current) => {
    const { data, error } = await supabaseRequest(() => supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single());
    throwDatabaseError(error, 'delete your item');
    return current.filter((item) => item.id !== data.id);
  }), [mutate, userId]);

  return { items, loading, refreshing, storageError, refreshInventory: loadInventory, addItem, updateItem, adjustQuantity, removeItem };
}
