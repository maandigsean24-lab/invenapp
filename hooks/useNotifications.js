import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { loadNotifications } from '../utils/notifications';

export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshNotifications = useCallback(async () => {
    const data = await loadNotifications(userId);
    setNotifications(data);
    setError('');
    return data;
  }, [userId]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        await refreshNotifications();
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();
    const channel = supabase
      .channel(`inventory-notifications-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_notifications',
        filter: `recipient_id=eq.${userId}`,
      }, () => {
        refresh().catch((loadError) => {
          if (active) setError(loadError.message);
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refreshNotifications, userId]);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
    loading,
    error,
    refreshNotifications,
  };
}
