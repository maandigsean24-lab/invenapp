import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import FormInput from './FormInput';
import AppButton from './AppButton';
import theme from '../theme';

const EMPTY = { name: '', category: '', quantity: '', price: '', lowStockThreshold: '' };

// Used for both adding (item = null) and editing an existing item.
export default function ItemFormModal({ visible, item, categories, defaultThreshold, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (!visible) return;
    setErrors({});
    setSaving(false);
    setForm(
      item
        ? {
          name: item.name,
          category: item.category,
          quantity: String(item.quantity),
          price: String(item.price),
          lowStockThreshold: String(item.lowStockThreshold ?? defaultThreshold),
        }
        : { ...EMPTY, lowStockThreshold: String(defaultThreshold) }
    );
  }, [visible, item, defaultThreshold]);

  const set = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const category = form.category.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    const lowStockThreshold = Number(form.lowStockThreshold);
    const nextErrors = {};

    if (!name) nextErrors.name = 'Item name is required.';
    if (!category) nextErrors.category = 'Category is required.';
    if (form.quantity.trim() === '') nextErrors.quantity = 'Quantity is required.';
    else if (!Number.isInteger(quantity) || quantity < 0) nextErrors.quantity = 'Enter a whole number, 0 or more.';
    if (form.price.trim() === '') nextErrors.price = 'Price is required.';
    else if (!Number.isFinite(price) || price < 0) nextErrors.price = 'Enter a number, 0 or more.';
    if (form.lowStockThreshold.trim() === '') nextErrors.lowStockThreshold = 'Low-stock threshold is required.';
    else if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 999999) {
      nextErrors.lowStockThreshold = 'Enter a whole number between 0 and 999,999.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await onSave({ name, category, quantity, price, lowStockThreshold });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? 'Edit item' : 'Add inventory item'}</Text>

            <FormInput label="Item name" placeholder="e.g. Wireless Mouse" value={form.name} onChangeText={set('name')} error={errors.name} />
            <FormInput label="Category" placeholder="e.g. Accessories" value={form.category} onChangeText={set('category')} error={errors.category} />

            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} keyboardShouldPersistTaps="handled">
                {categories.map((c) => (
                  <Pressable key={c} style={styles.chip} onPress={() => set('category')(c)}>
                    <Text style={styles.chipText}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <FormInput label="Quantity" placeholder="0" keyboardType="number-pad" value={form.quantity} onChangeText={(value) => set('quantity')(value.replace(/\D/g, ''))} error={errors.quantity} />
            <FormInput label="Price (₱)" placeholder="0.00" keyboardType="decimal-pad" value={form.price} onChangeText={(value) => set('price')(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))} error={errors.price} />
            <FormInput
              label="Low-stock alert at"
              placeholder="10"
              keyboardType="number-pad"
              value={form.lowStockThreshold}
              onChangeText={(value) => set('lowStockThreshold')(value.replace(/\D/g, ''))}
              error={errors.lowStockThreshold}
            />

            <View style={styles.actions}>
              <AppButton label="Save" onPress={handleSave} loading={saving} style={styles.save} />
              <AppButton label="Cancel" variant="outline" onPress={onClose} disabled={saving} style={styles.cancelButton} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, maxHeight: '90%' },
  title: { fontSize: theme.fontSizes.xl, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.lg },
  chips: { marginBottom: theme.spacing.md, flexGrow: 0 },
  chip: { backgroundColor: theme.colors.chip, borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.md, paddingVertical: 6, marginRight: theme.spacing.sm },
  chipText: { color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  save: { flex: 1, marginRight: theme.spacing.md },
  cancelButton: { flex: 1 },
});
