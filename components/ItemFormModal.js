import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import FormInput from './FormInput';
import AppButton from './AppButton';
import { notify } from '../utils/dialog';

const EMPTY = { name: '', category: '', quantity: '', price: '' };

// Used for both adding (item = null) and editing an existing item.
export default function ItemFormModal({ visible, item, categories, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const isEditing = !!item;

  useEffect(() => {
    if (!visible) return;
    setForm(
      item
        ? { name: item.name, category: item.category, quantity: String(item.quantity), price: String(item.price) }
        : EMPTY
    );
  }, [visible, item]);

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSave = () => {
    const name = form.name.trim();
    const category = form.category.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!name || !category || form.quantity.trim() === '' || form.price.trim() === '') {
      notify('Missing information', 'Please complete all item fields.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      notify('Invalid quantity', 'Quantity must be a whole number, 0 or more.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      notify('Invalid price', 'Price must be a number, 0 or more.');
      return;
    }

    onSave({ name, category, quantity, price });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? 'Edit item' : 'Add inventory item'}</Text>

            <FormInput label="Item name" placeholder="e.g. Wireless Mouse" value={form.name} onChangeText={set('name')} />
            <FormInput label="Category" placeholder="e.g. Accessories" value={form.category} onChangeText={set('category')} />

            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} keyboardShouldPersistTaps="handled">
                {categories.map((c) => (
                  <Pressable key={c} style={styles.chip} onPress={() => set('category')(c)}>
                    <Text style={styles.chipText}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <FormInput label="Quantity" placeholder="0" keyboardType="number-pad" value={form.quantity} onChangeText={set('quantity')} />
            <FormInput label="Price (₱)" placeholder="0.00" keyboardType="decimal-pad" value={form.price} onChangeText={set('price')} />

            <View style={styles.actions}>
              <AppButton label={isEditing ? 'Save changes' : 'Add item'} onPress={handleSave} style={styles.save} />
              <Pressable onPress={onClose}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%' },
  title: { fontSize: 22, fontWeight: '700', color: '#13233d', marginBottom: 16 },
  chips: { marginBottom: 12, flexGrow: 0 },
  chip: { backgroundColor: '#eef4ff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipText: { color: '#2f6fed', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  save: { flex: 1, marginRight: 12 },
  cancel: { color: '#2f6fed', fontWeight: '700', paddingVertical: 12 },
});
