import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney, stockStatus } from '../utils/format';
import theme from '../theme';

const BADGES = {
  out: { text: 'Out of stock', bg: theme.colors.dangerBackground, fg: theme.colors.danger },
  low: { text: 'Low stock', bg: theme.colors.warningBackground, fg: theme.colors.warning },
};

export default function ItemCard({ item, threshold, onAdjust, onEdit, onDelete }) {
  const badge = BADGES[stockStatus(item.quantity, threshold)];

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.category}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {formatMoney(item.price)} each · {formatMoney(item.price * item.quantity)} total
        </Text>
        <View style={styles.badgeSlot}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={styles.qty} numberOfLines={1}>Qty: {item.quantity}</Text>
        <View style={styles.row}>
          <Pressable style={styles.counter} onPress={() => onAdjust(item.id, -1)} accessibilityRole="button" accessibilityLabel={`Decrease ${item.name}`}>
            <Ionicons name="remove" size={18} color={theme.colors.primaryDark} />
          </Pressable>
          <Pressable style={styles.counter} onPress={() => onAdjust(item.id, 1)} accessibilityRole="button" accessibilityLabel={`Increase ${item.name}`}>
            <Ionicons name="add" size={18} color={theme.colors.primaryDark} />
          </Pressable>
        </View>
        <View style={styles.row}>
          <Pressable style={styles.iconButton} onPress={() => onEdit(item)} accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`}>
            <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => onDelete(item)} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`}>
            <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    minHeight: 144,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.textStrong, marginBottom: 4 },
  sub: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginBottom: 2 },
  badgeSlot: { height: 30, justifyContent: 'center', alignItems: 'flex-start' },
  badge: { alignSelf: 'flex-start', borderRadius: theme.borderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: theme.fontSizes.xs, lineHeight: 15, fontWeight: '700' },
  controls: { width: 112, alignItems: 'flex-end' },
  qty: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  counter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
});
