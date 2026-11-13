import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function FormInput({ label, value, onChangeText, placeholder, style, ...rest }) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholder={placeholder}
        placeholderTextColor="#8a97ad"
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#44536e', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe7f5',
    backgroundColor: '#f8fbff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#13233d',
  },
});
