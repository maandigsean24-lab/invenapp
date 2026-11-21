import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileAvatar from './ProfileAvatar';
import theme from '../theme';

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function NotificationsScreen({
  notifications,
  loading,
  error,
  onBack,
  onOpenInvitation,
  onSelectNotification,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to inventory">
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : notifications.length === 0 ? (
        <Text style={styles.message}>You’re all caught up. Invitations and shared inventory updates will appear here.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((notification) => {
            const isInvitation = notification.type === 'inventory_invite';
            const icon = isInvitation
              ? 'mail-unread-outline'
              : notification.type === 'stock_added'
                ? 'add-circle-outline'
                : 'trash-outline';
            return (
              <Pressable
                key={notification.id}
                style={[styles.card, !notification.is_read && styles.unreadCard]}
                onPress={() => onSelectNotification(notification)}
                accessibilityRole="button"
                accessibilityLabel={`${notification.title}. ${notification.message}${isInvitation ? ' Review invitation.' : ''}`}
              >
                <View style={styles.avatarWrap}>
                  <ProfileAvatar name={notification.actor_name} size={40} />
                  <View style={styles.typeBadge}>
                    <Ionicons name={icon} size={12} color={theme.colors.primary} />
                  </View>
                </View>
                <View style={styles.details}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {!notification.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.body}>{notification.message}</Text>
                  <Text style={styles.date}>{formatDate(notification.created_at)}</Text>
                  {isInvitation ? (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onOpenInvitation(notification);
                      }}
                      style={styles.action}
                    >
                      <Text style={styles.actionText}>Review invitation</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset, paddingHorizontal: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: theme.spacing.md },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: '700', color: theme.colors.text },
  headerSpacer: { width: 44 },
  loader: { marginTop: 40 },
  list: { paddingBottom: 32 },
  card: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, elevation: 1 },
  unreadCard: { borderWidth: 1, borderColor: theme.colors.primary },
  avatarWrap: { width: 44, height: 44, marginRight: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', right: 0, bottom: 0, width: 19, height: 19, borderRadius: 10, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  details: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { flex: 1, color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginLeft: theme.spacing.sm },
  body: { color: theme.colors.label, fontSize: theme.fontSizes.sm, lineHeight: 20, marginTop: 4 },
  date: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  action: { alignSelf: 'flex-start', paddingTop: theme.spacing.sm },
  actionText: { color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '700' },
  message: { color: theme.colors.muted, textAlign: 'center', padding: theme.spacing.xl, lineHeight: 22 },
});
