import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEY = 'inventory';

// Inventory is stored per account so users no longer share one list.
export default function useInventory(userEmail) {
  const storageKey = `inventory:${userEmail}`;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setLoading(true);

    (async () => {
      try {
        let stored = await AsyncStorage.getItem(storageKey);

        // One-time migration of the old shared list to the first account that logs in.
        if (!stored) {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) {
            stored = legacy;
            await AsyncStorage.removeItem(LEGACY_KEY);
          }
        }

        if (!cancelled) setItems(stored ? JSON.parse(stored) : []);
      } catch (error) {
        console.error('Failed to load inventory.', error);
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Save whenever the list changes (but never before the first load finishes,
  // which would overwrite stored data with an empty list).
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(items)).catch((error) =>
      console.error('Failed to save inventory.', error)
    );
  }, [items, storageKey]);

  const addItem = useCallback((fields) => {
    setItems((current) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...fields }, ...current]);
  }, []);

  const updateItem = useCallback((id, fields) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...fields } : item)));
  }, []);

  const adjustQuantity = useCallback((id, change) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, loading, addItem, updateItem, adjustQuantity, removeItem };
}
