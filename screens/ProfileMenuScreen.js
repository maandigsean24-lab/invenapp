import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appConfig from '../app.json';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import ProfileAvatar from '../components/ProfileAvatar';
import { confirm, notify } from '../utils/dialog';
import { formatName } from '../utils/format';
import { updateUserName } from '../utils/auth';
import theme from '../theme';

export default function ProfileMenuScreen({ user, onUserUpdate, onOpenSettings, onOpenSharedInventory, onLogout }) {
  const [name, setName] = useState(user.fullName || '');
  const [nameExpanded, setNameExpanded] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSaveName = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      notify('Name required', 'Enter a name for your account.');
      return;
    }

    setBusy(true);
    try {
      const updatedUser = await updateUserName(user, cleanName);
      onUserUpdate(updatedUser);
      setNameExpanded(false);
      notify('Name updated', 'Your account name has been saved.');
    } catch (error) {
      notify('Could not update name', error.message);
    } finally {
      setBusy(false);
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
        <Text style={styles.title}>Profile</Text>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.profileCard}>
            <ProfileAvatar name={user.fullName || user.email} size={58} />
            <View style={styles.profileInfo}>
              <Text style={styles.name} numberOfLines={1}>{formatName(user.fullName) || 'Your account'}</Text>
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Pressable
              style={styles.menuRow}
              onPress={() => setNameExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: nameExpanded }}
            >
              <Ionicons name="person-outline" size={21} color={theme.colors.primary} />
              <Text style={styles.menuTitle}>Change name</Text>
              <Ionicons name={nameExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
            </Pressable>
            {nameExpanded ? (
              <View style={styles.expandedContent}>
                <FormInput label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
                <AppButton label="Save name" onPress={handleSaveName} loading={busy} disabled={busy} />
              </View>
            ) : null}
          </View>

          <MenuLink icon="settings-outline" title="Settings" subtitle="Password and low-stock defaults" onPress={onOpenSettings} />
          <MenuLink icon="people-outline" title="Shared inventory" subtitle="Invitations and access" onPress={onOpenSharedInventory} />

          <View style={styles.section}>
            <Pressable
              style={styles.menuRow}
              onPress={() => setAboutExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: aboutExpanded }}
            >
              <Ionicons name="information-circle-outline" size={21} color={theme.colors.primary} />
              <Text style={styles.menuTitle}>About</Text>
              <Ionicons name={aboutExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
            </Pressable>
            {aboutExpanded ? (
              <View style={styles.aboutContent}>
                <Text style={styles.aboutName}>InvenApp</Text>
                <Text style={styles.helper}>Version {appConfig.expo.version}</Text>
                <Text style={styles.helper}>Cloud inventory manager</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.logoutSection}>
            <AppButton label="Log out" variant="outline" onPress={handleLogout} disabled={busy} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function MenuLink({ icon, title, subtitle, onPress }) {
  return (
    <Pressable style={styles.section} onPress={onPress} accessibilityRole="button">
      <View style={styles.menuRow}>
        <Ionicons name={icon} size={21} color={theme.colors.primary} />
        <View style={styles.menuInfo}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </View>
    </Pressable>
  );
}

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 60;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: topInset },
  title: { color: theme.colors.text, fontSize: theme.fontSizes.xl, fontWeight: '700', paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md },
  content: { padding: theme.spacing.xl, paddingTop: 4, paddingBottom: theme.spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  profileInfo: { flex: 1, marginLeft: theme.spacing.md },
  name: { color: theme.colors.text, fontSize: theme.fontSizes.lg, fontWeight: '700' },
  email: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginTop: 3 },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: theme.spacing.md },
  menuTitle: { flex: 1, color: theme.colors.text, fontSize: theme.fontSizes.md, fontWeight: '700' },
  menuInfo: { flex: 1 },
  menuSubtitle: { color: theme.colors.muted, fontSize: theme.fontSizes.xs, marginTop: 3 },
  expandedContent: { marginTop: theme.spacing.md },
  aboutContent: { marginTop: theme.spacing.md, paddingLeft: 33 },
  aboutName: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSizes.md, marginBottom: 4 },
  helper: { color: theme.colors.muted, fontSize: theme.fontSizes.sm, lineHeight: 19, marginBottom: 4 },
  logoutSection: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
});
