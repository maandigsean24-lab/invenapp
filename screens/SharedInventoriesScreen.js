import React from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileAvatar from '../components/ProfileAvatar';
import AppButton from '../components/AppButton';
import theme from '../theme';

export default function SharedInventoriesScreen({
  inventories,
  pendingInvitationCount,
  onSelectInventory,
  onReviewInvitations,
  onManageSharing,
}) {
  const sharedInventories = inventories.filter((inventory) => !inventory.isOwner);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shared with you</Text>
        <Text style={styles.subtitle}>Choose an inventory to view live stock updates.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {pendingInvitationCount > 0 ? (
          <Pressable
            style={styles.invitationBanner}
            onPress={onReviewInvitations}
            accessibilityRole="button"
            accessibilityLabel={`Review ${pendingInvitationCount} pending invitation${pendingInvitationCount === 1 ? '' : 's'}`}
          >
            <Ionicons name="mail-unread-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.invitationText}>
              {pendingInvitationCount === 1 ? 'You have one pending invitation' : `You have ${pendingInvitationCount} pending invitations`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
          </Pressable>
        ) : null}

        {sharedInventories.length > 0 ? (
          sharedInventories.map((inventory) => (
            <Pressable
              key={inventory.id}
              style={styles.inventoryCard}
              onPress={() => onSelectInventory(inventory)}
              accessibilityRole="button"
              accessibilityLabel={`View ${inventory.name}`}
            >
              <ProfileAvatar name={inventory.ownerName} size={48} />
              <View style={styles.inventoryInfo}>
                <Text style={styles.inventoryName}>{inventory.name}</Text>
                <Text style={styles.inventoryHint}>Live shared inventory</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={30} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No shared inventories yet</Text>
            <Text style={styles.emptyText}>
              Accept an invitation to see another account’s live stock here.
            </Text>
            <AppButton label="Manage sharing" onPress={onManageSharing} style={styles.manageButton} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: 8, paddingBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.fontSizes.xl, fontWeight: '700' },
  subtitle: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginTop: 5 },
  content: { padding: theme.spacing.xl, paddingTop: theme.spacing.sm, flexGrow: 1 },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.chip,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  invitationText: { flex: 1, color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '700' },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 1,
  },
  inventoryInfo: { flex: 1, marginLeft: theme.spacing.md },
  inventoryName: { color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  inventoryHint: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginTop: 3 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xl, paddingBottom: 48 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.chip, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  emptyTitle: { color: theme.colors.text, fontSize: theme.fontSizes.lg, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, lineHeight: 20, textAlign: 'center', marginTop: theme.spacing.xs },
  manageButton: { width: '100%', marginTop: theme.spacing.lg },
});
