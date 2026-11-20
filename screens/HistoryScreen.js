import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';
import theme from '../theme';

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function HistoryScreen({ user, item, onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    supabaseRequest(() => supabase
      .from('stock_logs')
      .select('id, previous_quantity, new_quantity, change_amount, previous_price, new_price, created_at')
      .eq('user_id', user.id)
      .eq('item_id', item.id)
      .order('created_at', { ascending: false })
      .limit(100))
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) throw new Error(supabaseErrorMessage(queryError));
        setLogs(data || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [item.id, user.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to inventory">
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.title}>Stock history</Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : logs.length === 0 ? (
        <Text style={styles.message}>No stock or price changes have been recorded yet.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              {log.previous_quantity === null || log.previous_quantity !== log.new_quantity ? (
                <>
                  <View style={styles.logTop}>
                    <Text style={[styles.change, log.change_amount >= 0 ? styles.increase : styles.decrease]}>
                      {log.change_amount > 0 ? '+' : ''}{log.change_amount} units
                    </Text>
                    <Text style={styles.date}>{formatDate(log.created_at)}</Text>
                  </View>
                  <Text style={styles.quantities}>
                    {log.previous_quantity === null ? 'Starting stock' : `${log.previous_quantity} units`}
                    {'  →  '}
                    {log.new_quantity} units
                  </Text>
                </>
              ) : null}
              {log.previous_quantity !== null && log.previous_quantity === log.new_quantity ? (
                <View style={styles.logTop}>
                  <Text style={styles.changeTitle}>Price updated</Text>
                  <Text style={styles.date}>{formatDate(log.created_at)}</Text>
                </View>
              ) : null}
              {log.new_price !== null && log.new_price !== undefined && (
                <View style={styles.priceChange}>
                  <Text style={styles.priceLabel}>Price per item</Text>
                  <Text style={styles.quantities}>
                    {log.previous_price === null || log.previous_price === undefined
                      ? 'Starting price'
                      : `₱${Number(log.previous_price).toLocaleString('en-PH')}`}
                    {'  →  '}
                    ₱{Number(log.new_price).toLocaleString('en-PH')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset, paddingHorizontal: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: theme.spacing.sm },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: '700', color: theme.colors.text },
  headerSpacer: { width: 44 },
  itemName: { color: theme.colors.muted, textAlign: 'center', fontSize: theme.fontSizes.md, marginBottom: theme.spacing.lg },
  loader: { marginTop: 40 },
  list: { paddingBottom: 32 },
  logCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  logTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: theme.spacing.xs },
  change: { fontSize: theme.fontSizes.lg, fontWeight: '700' },
  changeTitle: { color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  increase: { color: theme.colors.success },
  decrease: { color: theme.colors.danger },
  date: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, flexShrink: 1, textAlign: 'right' },
  quantities: { color: theme.colors.text, fontSize: theme.fontSizes.md },
  priceChange: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, gap: 4 },
  priceLabel: { color: theme.colors.muted, fontSize: theme.fontSizes.xs },
  message: { color: theme.colors.muted, textAlign: 'center', padding: theme.spacing.xl, lineHeight: 22 },
});
