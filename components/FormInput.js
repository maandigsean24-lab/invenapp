import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

// A reusable text input used across Login, Register, and any future forms.
// It takes in the same props a normal TextInput needs, plus passes along
// anything extra (like secureTextEntry or keyboardType) via {...rest}.
export default function FormInput({ value, onChangeText, placeholder, ...rest }) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});