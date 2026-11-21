import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InventorySharingSection from '../components/InventorySharingSection';
import theme from '../theme';

export default function SharedInventoryScreen({ user, onBack, onLeaveInventory }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
          </Pressable>
          <Text style={styles.title}>Shared inventory</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Invite people you trust, manage access, or leave an inventory shared with you.
          </Text>
          <InventorySharingSection user={user} onLeaveInventory={onLeaveInventory} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: '700', color: theme.colors.text },
  headerSpacer: { width: 44 },
  content: { padding: theme.spacing.xl, paddingTop: 4, paddingBottom: 36 },
  intro: {
    color: theme.colors.muted,
    fontSize: theme.fontSizes.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
});
