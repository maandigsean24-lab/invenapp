import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney, stockStatus } from '../utils/format';

const BADGES = {
  out: { text: 'Out of stock', bg: '#fde8e8', fg: '#b42318' },
  low: { text: 'Low stock', bg: '#fff3d6', fg: '#a15c00' },
};

export default function ItemCard({ item, onAdjust, onEdit, onDelete }) {
  const badge = BADGES[stockStatus(item.quantity)];

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>{item.category}</Text>
        <Text style={styles.sub}>
          {formatMoney(item.price)} each · {formatMoney(item.price * item.quantity)} total
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Text style={styles.qty}>Qty: {item.quantity}</Text>
        <View style={styles.row}>
          <Pressable style={styles.counter} onPress={() => onAdjust(item.id, -1)} accessibilityLabel={`Decrease ${item.name}`}>
            <Ionicons name="remove" size={18} color="#163d7a" />
          </Pressable>
          <Pressable style={styles.counter} onPress={() => onAdjust(item.id, 1)} accessibilityLabel={`Increase ${item.name}`}>
            <Ionicons name="add" size={18} color="#163d7a" />
          </Pressable>
        </View>
        <View style={styles.row}>
          <Pressable style={styles.iconButton} onPress={() => onEdit(item)} accessibilityLabel={`Edit ${item.name}`}>
            <Ionicons name="create-outline" size={20} color="#2f6fed" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => onDelete(item)} accessibilityLabel={`Delete ${item.name}`}>
            <Ionicons name="trash-outline" size={20} color="#d33b3b" />
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 18, fontWeight: '700', color: '#17294a', marginBottom: 4 },
  sub: { color: '#5a6d8d', fontSize: 12, marginBottom: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  controls: { alignItems: 'flex-end' },
  qty: { fontSize: 14, fontWeight: '600', color: '#1d2b45', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  counter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dfeaff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  iconButton: { padding: 6, marginHorizontal: 2 },
});
