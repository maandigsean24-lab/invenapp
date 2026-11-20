import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney, stockStatus } from '../utils/format';
import theme from '../theme';

const BADGES = {
  out: { text: 'Out of stock', bg: theme.colors.dangerBackground, fg: theme.colors.danger },
  low: { text: 'Low stock', bg: theme.colors.warningBackground, fg: theme.colors.warning },
};

export default function ItemCard({ item, threshold, onAdjust, onEdit, onDelete, onHistory }) {
  const [expanded, setExpanded] = useState(false);
  const itemThreshold = item.lowStockThreshold ?? threshold;
  const badge = BADGES[stockStatus(item.quantity, itemThreshold)];

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summary}
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.name}, quantity ${item.quantity}${badge ? `, ${badge.text}` : ''}. ${expanded ? 'Collapse' : 'Expand'} details`}
      >
        <View style={styles.summaryInfo}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
          <View style={styles.stockSummary}>
            <Text style={styles.summaryQuantity} numberOfLines={1}>{item.quantity} in stock</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.summaryEnd}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <Pressable style={styles.counter} onPress={() => onAdjust(item.id, -1)} accessibilityRole="button" accessibilityLabel={`Decrease ${item.name}`}>
                <Ionicons name="remove" size={18} color={theme.colors.primaryDark} />
              </Pressable>
              <Text style={styles.quantity}>{item.quantity}</Text>
              <Pressable style={styles.counter} onPress={() => onAdjust(item.id, 1)} accessibilityRole="button" accessibilityLabel={`Increase ${item.name}`}>
                <Ionicons name="add" size={18} color={theme.colors.primaryDark} />
              </Pressable>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price per item</Text>
            <Text style={styles.money}>{formatMoney(item.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total value</Text>
            <Text style={styles.money} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
              {formatMoney(item.price * item.quantity)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Low-stock alert</Text>
            <Text style={styles.detailValue}>Below {itemThreshold} units</Text>
          </View>

          <View style={styles.actions}>
            <ActionButton icon="time-outline" label="History" onPress={() => onHistory(item)} />
            <ActionButton icon="create-outline" label="Edit" onPress={() => onEdit(item)} />
            <ActionButton icon="trash-outline" label="Delete" onPress={() => onDelete(item)} danger />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({ icon, label, onPress, danger }) {
  return (
    <Pressable
      style={styles.actionButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} item`}
    >
      <Ionicons name={icon} size={19} color={danger ? theme.colors.danger : theme.colors.primary} />
      <Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  summary: { flexDirection: 'row', alignItems: 'center', minHeight: 76, paddingHorizontal: 14, paddingVertical: 11 },
  summaryInfo: { flex: 1, minWidth: 0, paddingRight: theme.spacing.sm },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textStrong, marginBottom: 2 },
  category: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, marginBottom: 5 },
  stockSummary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  summaryQuantity: { color: theme.colors.text, fontSize: theme.fontSizes.sm, fontWeight: '600' },
  summaryEnd: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  badge: { borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  badgeText: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
  details: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, gap: 12 },
  detailLabel: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, flex: 1 },
  detailValue: { color: theme.colors.text, fontSize: theme.fontSizes.sm, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  money: { color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700', textAlign: 'right', maxWidth: '58%', flexShrink: 1 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantity: { minWidth: 32, textAlign: 'center', color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  counter: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.chip, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8, paddingTop: 8 },
  actionButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '600' },
  dangerText: { color: theme.colors.danger },
});
