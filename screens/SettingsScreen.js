import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import { changeUserPassword } from '../utils/auth';
import { saveUserSettings } from '../utils/settings';
import { notify } from '../utils/dialog';
import theme from '../theme';

export default function SettingsScreen({ user, threshold: initialThreshold, onThresholdChange, onBack }) {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [threshold, setThreshold] = useState(String(initialThreshold));
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [thresholdExpanded, setThresholdExpanded] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => {
    setThreshold(String(initialThreshold));
  }, [initialThreshold]);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notify('Current password required', 'Enter your current password to continue.');
      return;
    }
    if (password.length < 6) {
      notify('Password too short', 'Your password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      notify('Passwords do not match', 'Please enter the same password in both fields.');
      return;
    }

    setSavingPassword(true);
    try {
      await changeUserPassword({ email: user.email, currentPassword, newPassword: password });
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setPasswordExpanded(false);
      notify('Password updated', 'Your password has been changed.');
    } catch (error) {
      notify('Could not update password', error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveThreshold = async () => {
    const value = Number(threshold);
    if (!Number.isInteger(value) || value < 0 || value > 999999) {
      notify('Invalid threshold', 'Enter a whole number between 0 and 999,999.');
      return;
    }

    setSavingThreshold(true);
    try {
      await saveUserSettings(user.id, { lowStockThreshold: value });
      onThresholdChange(value);
      setThresholdExpanded(false);
      notify('Threshold saved', `Items with ${value} or fewer units will be marked low stock.`);
    } catch (error) {
      notify('Could not save threshold', error.message);
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={onBack} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          <Text style={styles.backText}>Profile</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage account security and stock alerts.</Text>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SettingSection
            icon="lock-closed-outline"
            title="Change password"
            expanded={passwordExpanded}
            onPress={() => setPasswordExpanded((value) => !value)}
          >
            <FormInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
            />
            <FormInput
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
            <FormInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
            />
            <AppButton label="Update password" onPress={handleChangePassword} loading={savingPassword} disabled={savingPassword} />
          </SettingSection>

          <SettingSection
            icon="alert-circle-outline"
            title="Default low-stock threshold"
            expanded={thresholdExpanded}
            onPress={() => setThresholdExpanded((value) => !value)}
            subtitle={`Currently ${threshold} units`}
          >
            <Text style={styles.helper}>
              Items at or below this quantity will be marked as needing restock.
            </Text>
            <FormInput
              label="Units"
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
              placeholder="5"
            />
            <AppButton label="Save threshold" onPress={handleSaveThreshold} loading={savingThreshold} disabled={savingThreshold} />
          </SettingSection>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SettingSection({ icon, title, expanded, onPress, subtitle, children }) {
  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Ionicons name={icon} size={21} color={theme.colors.primary} />
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
      </Pressable>
      {expanded ? <View style={styles.expandedContent}>{children}</View> : null}
    </View>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset },
  backButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md },
  backText: { color: theme.colors.primary, fontSize: theme.fontSizes.sm, fontWeight: '600' },
  title: { color: theme.colors.text, fontSize: theme.fontSizes.xl, fontWeight: '700', paddingHorizontal: theme.spacing.xl },
  subtitle: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, paddingHorizontal: theme.spacing.xl, marginTop: 4, marginBottom: theme.spacing.md },
  content: { padding: theme.spacing.xl, paddingTop: 4, paddingBottom: theme.spacing.lg },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 36 },
  sectionInfo: { flex: 1 },
  sectionTitle: { color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  sectionSubtitle: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, marginTop: 3 },
  expandedContent: { marginTop: theme.spacing.md },
  helper: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, lineHeight: 20, marginBottom: theme.spacing.sm },
});
