import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

export default function FormInput({ value, onChangeText, placeholder, style, ...rest }) {
  return (
    <TextInput
      style={[styles.input, style]}
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
    borderColor: '#dfe7f5',
    backgroundColor: '#f8fbff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
});