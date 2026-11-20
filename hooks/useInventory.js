import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEY = 'inventory';

export default function useInventory(userEmail) {
  const storageKey = `inventory:${userEmail}`;
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
      let stored = await AsyncStorage.getItem(storageKey);

      if (!stored) {
        const legacy = await AsyncStorage.getItem(LEGACY_KEY);
        if (legacy) {
          stored = legacy;
        }
      }

      const loadedItems = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(loadedItems)) throw new Error('Stored inventory is invalid.');
      if (stored && !(await AsyncStorage.getItem(storageKey))) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(loadedItems));
        await AsyncStorage.removeItem(LEGACY_KEY);
      }
      itemsRef.current = loadedItems;
      setItems(loadedItems);
      setStorageError('');
      loaded.current = true;
    } catch {
      setStorageError('Unable to load your inventory. Please try again.');
      if (!loaded.current) itemsRef.current = [];
      throw new Error('Unable to load your inventory. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loaded.current = false;
    loadInventory().catch(() => {});
  }, [loadInventory]);

  const mutate = useCallback((update) => {
    const operation = writeQueue.current.catch(() => {}).then(async () => {
      if (!loaded.current) throw new Error('Inventory is still loading. Please try again.');
      const nextItems = update(itemsRef.current);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextItems));
      } catch {
        throw new Error('Unable to save your inventory. Please try again.');
      }
      itemsRef.current = nextItems;
      setItems(nextItems);
      setStorageError('');
    });
    writeQueue.current = operation;
    return operation;
  }, [storageKey]);

  const addItem = useCallback((fields) => mutate((current) => [
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), ...fields },
    ...current,
  ]), [mutate]);

  const updateItem = useCallback((id, fields) => mutate((current) =>
    current.map((item) => (item.id === id ? { ...item, ...fields } : item))
  ), [mutate]);

  const adjustQuantity = useCallback((id, change) => mutate((current) =>
    current.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
    )
  ), [mutate]);

  const removeItem = useCallback((id) => mutate((current) => current.filter((item) => item.id !== id)), [mutate]);

  return { items, loading, refreshing, storageError, refreshInventory: loadInventory, addItem, updateItem, adjustQuantity, removeItem };
}
