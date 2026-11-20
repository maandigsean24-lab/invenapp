import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appConfig from '../app.json';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import { changeUserPassword, updateUserName } from '../utils/auth';
import { confirm, notify } from '../utils/dialog';
import { formatName } from '../utils/format';
import { saveUserSettings } from '../utils/settings';
import theme from '../theme';

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

export default function SettingsScreen({
  user,
  items,
  threshold,
  onBack,
  onUserUpdate,
  onThresholdChange,
  onLogout,
}) {
  const [name, setName] = useState(user.fullName || '');
  const [newThreshold, setNewThreshold] = useState(String(threshold));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setNewThreshold(String(threshold));
  }, [threshold]);

  const initials = useMemo(() => {
    const parts = formatName(user.fullName || user.email).split(/\s+/);
    return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
  }, [user.email, user.fullName]);

  const handleSaveName = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      notify('Name required', 'Enter a name for your account.');
      return;
    }

    setBusy('name');
    try {
      const updatedUser = await updateUserName(user.email, cleanName);
      onUserUpdate(updatedUser);
      notify('Name updated', 'Your account name has been saved.');
    } catch (error) {
      notify('Could not update name', error.message);
    } finally {
      setBusy('');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notify('Current password required', 'Enter your current password to continue.');
      return;
    }
    if (newPassword.length < 8) {
      notify('Password too short', 'Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match', 'Check the new password and confirmation.');
      return;
    }

    setBusy('password');
    try {
      await changeUserPassword({ email: user.email, currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password changed', 'Your new password is ready to use.');
    } catch (error) {
      notify('Could not change password', error.message);
    } finally {
      setBusy('');
    }
  };

  const handleSaveThreshold = async () => {
    if (!newThreshold.trim()) {
      notify('Threshold required', 'Enter the quantity to use for low-stock items.');
      return;
    }
    const value = Number(newThreshold);
    if (!Number.isInteger(value) || value < 0 || value > 999999) {
      notify('Invalid threshold', 'Enter a whole number between 0 and 999,999.');
      return;
    }

    setBusy('threshold');
    try {
      await saveUserSettings(user.email, { lowStockThreshold: value });
      onThresholdChange(value);
      notify('Threshold updated', `Items with fewer than ${value} units will be marked low stock.`);
    } catch (error) {
      notify('Could not save threshold', error.message);
    } finally {
      setBusy('');
    }
  };

  const handleExport = async () => {
    if (items.length === 0) {
      notify('Nothing to export', 'Add some items to your inventory first.');
      return;
    }

    const rows = [
      ['Name', 'Category', 'Quantity', 'Price', 'Total value'],
      ...items.map((item) => [item.name, item.category, item.quantity, item.price, item.quantity * item.price]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(csv);
            notify('Copied', 'Inventory CSV copied to clipboard.');
            return;
          } catch {
            // Some browsers expose the clipboard API but block it without permission.
          }
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'invenapp-inventory.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify('Exported', 'Your inventory CSV has been downloaded.');
      } else {
        await Share.share({ title: 'Inventory export', message: csv });
      }
    } catch (error) {
      notify('Export failed', error.message || 'Unable to export your inventory. Please try again.');
    }
  };

  const handleLogout = async () => {
    if (await confirm('Log out?', 'Are you sure you want to log out?', 'Log out')) {
      await onLogout();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to inventory">
            <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.accountCard}>
            <View style={styles.accountTop}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName} numberOfLines={1}>{formatName(user.fullName) || 'Your account'}</Text>
                <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
            <FormInput label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
            <AppButton label="Save name" onPress={handleSaveName} loading={busy === 'name'} disabled={!!busy} />
          </View>

          <SettingsCard title="Change password" icon="lock-closed-outline">
            <Text style={styles.helper}>Verify your current password before choosing a new one.</Text>
            <FormInput label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
            <FormInput label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <FormInput label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <AppButton label="Change password" onPress={handleChangePassword} loading={busy === 'password'} disabled={!!busy} />
          </SettingsCard>

          <SettingsCard title="Low-stock threshold" icon="alert-circle-outline">
            <Text style={styles.helper}>Items below this quantity are counted in “Needs restock” and marked low stock.</Text>
            <FormInput
              label="Units"
              value={newThreshold}
              onChangeText={(value) => setNewThreshold(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="10"
            />
            <AppButton label="Save threshold" onPress={handleSaveThreshold} loading={busy === 'threshold'} disabled={!!busy} />
          </SettingsCard>

          <SettingsCard title="Export inventory" icon="share-outline">
            <Text style={styles.helper}>Share or download a CSV copy of your inventory.</Text>
            <AppButton label="Export / share CSV" onPress={handleExport} disabled={!!busy} />
          </SettingsCard>

          <SettingsCard title="About" icon="information-circle-outline">
            <Text style={styles.aboutName}>InvenApp</Text>
            <Text style={styles.helper}>Version {appConfig.expo.version}</Text>
            <Text style={styles.helper}>Offline inventory manager</Text>
          </SettingsCard>

          <View style={styles.section}>
            <AppButton label="Log out" variant="outline" onPress={handleLogout} disabled={!!busy} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SettingsCard({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: '700', color: theme.colors.text },
  headerSpacer: { width: 44 },
  content: { padding: theme.spacing.xl, paddingTop: 4, paddingBottom: 36 },
  accountCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  accountTop: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.colors.chip, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  avatarText: { color: theme.colors.primary, fontSize: theme.fontSizes.lg, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountName: { color: theme.colors.text, fontSize: theme.fontSizes.lg, fontWeight: '700', marginBottom: 3 },
  email: { color: theme.colors.muted, fontSize: theme.fontSizes.sm },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { color: theme.colors.text, fontSize: theme.fontSizes.lg, fontWeight: '700', marginLeft: theme.spacing.sm },
  helper: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, lineHeight: 19, marginBottom: theme.spacing.md },
  aboutName: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSizes.md, marginBottom: 4 },
});
