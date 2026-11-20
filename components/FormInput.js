import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import theme from '../theme';

export default function FormInput({ label, value, onChangeText, placeholder, style, error, accessory, ...rest }) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          style={[styles.input, style]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
        {accessory}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.label, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.input,
    borderRadius: theme.borderRadius.md,
  },
  inputError: { borderColor: theme.colors.danger },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: theme.fontSizes.body,
    color: theme.colors.text,
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSizes.sm, marginTop: 4 },
});
