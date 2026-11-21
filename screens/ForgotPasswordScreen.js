import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { requestPasswordReset } from '../utils/auth';
import theme from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(cleanEmail);
      setSent(true);
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
        <Text style={styles.title}>{sent ? 'Check your email' : 'Forgot password?'}</Text>
        <Text style={styles.description}>
          {sent
            ? `If an account exists for ${email.trim()}, a password reset email will arrive shortly. Follow its link to choose a new password.`
            : 'Enter the email address on your account and we will send a password reset link.'}
        </Text>

        {!sent ? (
          <>
            <FormInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => { setEmail(value); setError(''); }}
              error={error.includes('valid email') || error === 'Email is required.' ? error : ''}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
            {error && error !== 'Email is required.' && !error.includes('valid email') ? (
              <Text style={styles.serverError}>{error}</Text>
            ) : null}
            <AppButton label="Send reset link" onPress={handleSubmit} loading={busy} style={styles.submit} />
          </>
        ) : null}

        <Text onPress={onBackToLogin} style={styles.link}>
          Back to log in
        </Text>
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
  serverError: { color: theme.colors.danger, textAlign: 'center', marginBottom: theme.spacing.md },
  submit: { marginTop: theme.spacing.sm },
  link: { color: theme.colors.primary, textAlign: 'center', marginTop: theme.spacing.lg },
});
