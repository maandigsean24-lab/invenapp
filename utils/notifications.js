import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

function throwDatabaseError(error, action) {
  if (error) throw new Error(`Unable to ${action}: ${supabaseErrorMessage(error)}`);
}

export async function loadNotifications(userId) {
  const { data, error } = await supabaseRequest(() => supabase
    .from('inventory_notifications')
    .select('id, type, title, message, actor_name, inventory_owner_id, is_read, created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100));
  throwDatabaseError(error, 'load notifications');
  return data || [];
}

export async function markNotificationRead(notificationId, userId) {
  const { error } = await supabaseRequest(() => supabase
    .from('inventory_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .eq('is_read', false));
  throwDatabaseError(error, 'mark notification as read');
}
