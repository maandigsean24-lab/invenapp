import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatName } from '../utils/format';
import theme from '../theme';

function getInitials(name) {
  return formatName(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export default function ProfileAvatar({ name, size = 40 }) {
  const initials = getInitials(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${name} profile` : 'User profile'}
    >
      {initials ? (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.36) }]}>
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={theme.colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: { color: theme.colors.primary, fontWeight: '700' },
});
