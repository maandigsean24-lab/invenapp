import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import FormInput from './FormInput';
import ProfileAvatar from './ProfileAvatar';
import { confirm, notify } from '../utils/dialog';
import {
  inviteInventoryCollaborator,
  leaveInventoryShare,
  loadInventoryShares,
  removeInventoryShare,
  respondToInventoryInvitation,
} from '../utils/inventorySharing';
import { supabase } from '../supabase/client';
import theme from '../theme';

export default function InventorySharingSection({ user, onLeaveInventory }) {
  const [email, setEmail] = useState('');
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadShares = useCallback(async () => {
    const shares = await loadInventoryShares(user.id);
    setOutgoing(shares.outgoing);
    setIncoming(shares.incoming);
    setSharedWithMe(shares.sharedWithMe);
    setError('');
  }, [user.id]);

  useEffect(() => {
    let active = true;
    loadShares()
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel(`sharing-settings-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_shares' }, () => {
        loadShares().catch((loadError) => {
          if (active) setError(loadError.message);
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadShares, user.id]);

  const handleInvite = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      notify('Enter a valid email', 'Use the email address of an existing InvenApp account.');
      return;
    }
    if (normalizedEmail === user.email?.trim().toLowerCase()) {
      notify('Cannot invite yourself', 'Choose another InvenApp account to share with.');
      return;
    }

    setBusy(true);
    try {
      await inviteInventoryCollaborator(normalizedEmail);
      setEmail('');
      await loadShares();
      notify('Invitation created', 'The invitation will appear in the recipient’s InvenApp account. No email notification is sent.');
    } catch (inviteError) {
      notify('Could not send invitation', inviteError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (share) => {
    const action = share.status === 'accepted' ? 'revoke their access to' : 'cancel their invitation to';
    if (!await confirm('Remove access?', `This will ${action} your inventory for ${share.invited_email}.`, 'Remove')) return;

    setBusy(true);
    try {
      await removeInventoryShare(share.id, user.id);
      await loadShares();
      notify('Access removed', `${share.invited_email} can no longer access your inventory.`);
    } catch (removeError) {
      notify('Could not remove access', removeError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResponse = async (share, status) => {
    setBusy(true);
    try {
      await respondToInventoryInvitation(share.id, user.id, status);
      await loadShares();
    } catch (responseError) {
      notify('Could not update invitation', responseError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (share) => {
    const ownerName = share.owner_name || 'this account';
    if (!await confirm('Leave shared inventory?', `You will lose access to ${ownerName}'s inventory.`, 'Leave')) return;

    setBusy(true);
    try {
      await leaveInventoryShare(share.id);
      await loadShares();
      onLeaveInventory(share.owner_id);
      notify('Left shared inventory', `You no longer have access to ${ownerName}'s inventory.`);
    } catch (leaveError) {
      notify('Could not leave shared inventory', leaveError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Manage access</Text>
      </View>
      <Text style={styles.helper}>
        Invite an existing InvenApp account to view and edit your stock. Owners can revoke access, and collaborators can leave at any time.
      </Text>

      <FormInput
        label="Invite by account email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <AppButton label="Invite account" onPress={handleInvite} loading={busy} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.status}>Loading invitations…</Text> : null}
      {!loading && outgoing.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>People with access</Text>
          {outgoing.map((share) => (
            <View style={styles.shareRow} key={share.id}>
              <View style={styles.shareInfo}>
                <Text style={styles.email}>{share.invited_email}</Text>
                <Text style={styles.status}>
                  {share.status === 'accepted' ? 'Can view and edit' : share.status === 'declined' ? 'Invitation declined' : 'Invitation pending'}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemove(share)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={share.status === 'accepted' ? `Remove ${share.invited_email}` : `Remove invitation for ${share.invited_email}`}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle-outline" size={23} color={theme.colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {!loading && incoming.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Invitations for you</Text>
          {incoming.map((share) => (
            <View style={styles.invitation} key={share.id}>
              <Text style={styles.email}>{share.owner_name || 'An InvenApp user'} invited you to share their inventory.</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => handleResponse(share, 'declined')} disabled={busy} style={styles.responseButton}>
                  <Text style={styles.decline}>Decline</Text>
                </Pressable>
                <Pressable onPress={() => handleResponse(share, 'accepted')} disabled={busy} style={styles.responseButton}>
                  <Text style={styles.accept}>Accept</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {!loading && sharedWithMe.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Shared with you</Text>
          {sharedWithMe.map((share) => (
            <View style={styles.shareRow} key={share.id}>
              <ProfileAvatar name={share.owner_name} size={42} />
              <View style={styles.shareInfo}>
                <Text style={styles.email}>{share.owner_name || 'An InvenApp user'}</Text>
                <Text style={styles.status}>Can view and edit</Text>
              </View>
              <Pressable
                onPress={() => handleLeave(share)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Leave ${share.owner_name || 'shared'} inventory`}
                style={styles.leaveButton}
              >
                <Text style={styles.leaveText}>Leave</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.fontSizes.lg, fontWeight: '700', marginLeft: theme.spacing.sm },
  helper: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, lineHeight: 19, marginBottom: theme.spacing.md },
  error: { color: theme.colors.danger, marginTop: theme.spacing.md },
  list: { marginTop: theme.spacing.lg },
  listTitle: { color: theme.colors.label, fontSize: theme.fontSizes.sm, fontWeight: '700', marginBottom: theme.spacing.sm },
  shareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  shareInfo: { flex: 1, marginLeft: theme.spacing.md },
  email: { color: theme.colors.text, fontSize: theme.fontSizes.body, fontWeight: '600' },
  status: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginTop: 3 },
  removeButton: { padding: theme.spacing.sm },
  leaveButton: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  leaveText: { color: theme.colors.danger, fontSize: theme.fontSizes.sm, fontWeight: '700' },
  invitation: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: theme.spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm },
  responseButton: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  accept: { color: theme.colors.primary, fontWeight: '700' },
  decline: { color: theme.colors.danger, fontWeight: '600' },
});
