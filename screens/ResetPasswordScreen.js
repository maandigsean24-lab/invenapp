import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { setRecoveredPassword } from '../utils/auth';
import theme from '../theme';

export default function ResetPasswordScreen({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await setRecoveredPassword(password);
      onComplete();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/brand-logo.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="InvenApp" />
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.description}>Choose a new password with at least 8 characters.</Text>

        <FormInput
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(value) => { setPassword(value); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormInput
          label="Confirm new password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChangeText={(value) => { setConfirmPassword(value); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label="Update password" onPress={handleSubmit} loading={busy} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xxl, paddingVertical: 48 },
  brandLogo: { width: 240, height: 68, alignSelf: 'center', marginBottom: theme.spacing.xxl },
  title: { fontSize: theme.fontSizes.xl, fontWeight: '700', textAlign: 'center', color: theme.colors.text, marginBottom: theme.spacing.sm },
  description: { color: theme.colors.muted, fontSize: theme.fontSizes.md, lineHeight: 21, textAlign: 'center', marginBottom: theme.spacing.xl },
  error: { color: theme.colors.danger, textAlign: 'center', marginBottom: theme.spacing.md },
  submit: { marginTop: theme.spacing.sm },
});
