import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileAvatar from './ProfileAvatar';
import theme from '../theme';

function NavigationTab({ label, icon, active, onPress, accessibilityLabel, badge }) {
  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={active ? theme.colors.primary : theme.colors.muted} />
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

export default function BottomNavigation({
  activeTab,
  userName,
  unreadCount,
  onHome,
  onShared,
  onAdd,
  onNotifications,
  onProfile,
}) {
  return (
    <View style={styles.bar}>
      <NavigationTab label="Home" icon="home-outline" active={activeTab === 'home'} onPress={onHome} />
      <NavigationTab label="Shared" icon="people-outline" active={activeTab === 'shared'} onPress={onShared} />
      <Pressable
        style={styles.addTab}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add stock item"
      >
        <View style={styles.addButton}>
          <Ionicons name="add" size={29} color="#fff" />
        </View>
        <Text style={styles.label}>Add</Text>
      </Pressable>
      <NavigationTab
        label="Alerts"
        icon="notifications-outline"
        active={activeTab === 'notifications'}
        onPress={onNotifications}
        accessibilityLabel="Notifications"
        badge={unreadCount}
      />
      <Pressable
        style={styles.tab}
        onPress={onProfile}
        accessibilityRole="button"
        accessibilityLabel="Profile menu"
        accessibilityState={{ selected: activeTab === 'profile' }}
      >
        <View style={[styles.profileAvatar, activeTab === 'profile' && styles.activeProfileAvatar]}>
          <ProfileAvatar name={userName} size={25} />
        </View>
        <Text style={[styles.label, activeTab === 'profile' && styles.activeLabel]}>Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 2 },
  iconWrap: { position: 'relative', minWidth: 24, alignItems: 'center' },
  label: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  activeLabel: { color: theme.colors.primary },
  badge: {
    position: 'absolute',
    right: -12,
    top: -5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  addTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 2 },
  addButton: {
    width: 48,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  activeProfileAvatar: { borderWidth: 2, borderColor: theme.colors.primary },
});
