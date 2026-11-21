import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

function throwDatabaseError(error, action) {
  if (error) throw new Error(`Unable to ${action}: ${supabaseErrorMessage(error)}`);
}

export async function loadInventoryShares(userId) {
  const [outgoing, incoming] = await Promise.all([
    supabaseRequest(() => supabase
      .from('inventory_shares')
      .select('id, invited_email, status, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })),
    supabaseRequest(() => supabase
      .from('inventory_shares')
      .select('id, owner_id, owner_name, status, created_at')
      .eq('invited_user_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })),
  ]);
  throwDatabaseError(outgoing.error, 'load sharing invitations');
  throwDatabaseError(incoming.error, 'load invitations for your account');
  const incomingShares = incoming.data || [];
  return {
    outgoing: outgoing.data || [],
    incoming: incomingShares.filter((share) => share.status === 'pending'),
    sharedWithMe: incomingShares.filter((share) => share.status === 'accepted'),
  };
}

export async function inviteInventoryCollaborator(email) {
  const { data, error } = await supabaseRequest(() => supabase.rpc(
    'invite_inventory_collaborator',
    { p_invited_email: email.trim().toLowerCase() }
  ));
  throwDatabaseError(error, 'send inventory invitation');
  return data;
}

export async function respondToInventoryInvitation(shareId, userId, status) {
  if (!['accepted', 'declined'].includes(status)) {
    throw new Error('Choose whether to accept or decline this invitation.');
  }
  const { data, error } = await supabaseRequest(() => supabase
    .from('inventory_shares')
    .update({ status })
    .eq('id', shareId)
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .select('id')
    .single());
  throwDatabaseError(error, 'respond to inventory invitation');
  return data;
}

export async function removeInventoryShare(shareId, ownerId) {
  const { data, error } = await supabaseRequest(() => supabase
    .from('inventory_shares')
    .delete()
    .eq('id', shareId)
    .eq('owner_id', ownerId)
    .select('id')
    .single());
  throwDatabaseError(error, 'remove inventory access');
  return data;
}

export async function leaveInventoryShare(shareId) {
  const { data, error } = await supabaseRequest(() => supabase.rpc(
    'leave_inventory_share',
    { p_share_id: shareId }
  ));
  if (error?.code === 'PGRST202') {
    throw new Error('Self-leave is not enabled yet. Run the updated supabase/inventory_sharing.sql script in Supabase.');
  }
  throwDatabaseError(error, 'leave shared inventory');
  if (data !== true) {
    throw new Error('This shared inventory is no longer available to leave. Refresh and try again.');
  }
  return { id: shareId };
}
