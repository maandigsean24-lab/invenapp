import React, { useState } from 'react';
import { Text, Image, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { registerUser } from '../utils/auth';
import { notify } from '../utils/dialog';
import theme from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleRegister = async () => {
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await registerUser({ fullName, email, password });
      notify('Account created', 'Log in with your new account to continue.');
      onSwitchToLogin();
    } catch (error) {
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const clearError = (key, setter) => (value) => {
    setter(value);
    setErrors((current) => ({ ...current, [key]: '' }));
    setServerError('');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/brand-logo.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="InvenApp" />
        <Text style={styles.title}>Create Account</Text>

        <FormInput label="Full name" placeholder="Your name" value={fullName} onChangeText={clearError('fullName', setFullName)} error={errors.fullName} autoComplete="name" />
        <FormInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={clearError('email', setEmail)}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormInput
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={clearError('password', setPassword)}
          error={errors.password}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          accessory={
            <Pressable onPress={() => setShowPassword((shown) => !shown)} style={styles.eye} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
            </Pressable>
          }
        />
        <FormInput
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={clearError('confirmPassword', setConfirmPassword)}
          error={errors.confirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          accessory={
            <Pressable onPress={() => setShowConfirmPassword((shown) => !shown)} style={styles.eye} accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
            </Pressable>
          }
        />

        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
        <AppButton label="Register" onPress={handleRegister} loading={busy} style={styles.submit} />

        <Text style={styles.link} onPress={onSwitchToLogin}>
          Already have an account? Log in
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xxl, paddingVertical: 48 },
  brandLogo: { width: 260, height: 72, alignSelf: 'center', marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSizes.xl, fontWeight: 'bold', textAlign: 'center', color: theme.colors.text, marginBottom: theme.spacing.lg },
  eye: { padding: theme.spacing.md },
  serverError: { color: theme.colors.danger, textAlign: 'center', marginBottom: theme.spacing.md },
  submit: { marginTop: theme.spacing.sm },
  link: { color: theme.colors.primary, textAlign: 'center', marginTop: theme.spacing.lg },
});
