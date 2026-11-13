import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function AppButton({ label, onPress, style, textStyle, variant = 'primary', loading, disabled }) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      style={[styles.button, isOutline && styles.outline, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#2f6fed' : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, isOutline && styles.outlineText, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2f6fed', elevation: 0, shadowOpacity: 0 },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  outlineText: { color: '#2f6fed' },
});
