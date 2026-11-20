import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import theme from '../theme';

export default function AppButton({ label, onPress, style, textStyle, variant = 'primary', loading, disabled }) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isOutline && styles.outline,
        isDanger && styles.danger,
        pressed && !isOutline && !isDanger && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, isOutline && styles.outlineText, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
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
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary, elevation: 0, shadowOpacity: 0 },
  danger: { backgroundColor: theme.colors.danger },
  pressed: { backgroundColor: theme.colors.primaryPressed },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: theme.fontSizes.body },
  outlineText: { color: theme.colors.primary },
});
