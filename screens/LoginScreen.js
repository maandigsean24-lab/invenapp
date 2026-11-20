import React, { useState } from 'react';
import { Image, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { loginUser } from '../utils/auth';
import { notify } from '../utils/dialog';
import theme from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleLogin = async () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const user = await loginUser({ email, password });
      onLoginSuccess(user);
    } catch (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) setServerError('Wrong email or password.');
      else notify('Could not log in', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/brand-logo.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="InvenApp" />
        <Text style={styles.subtitle}>Inventory, made simple</Text>
        <Text style={styles.title}>Welcome back</Text>

        <FormInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: '' })); }}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <FormInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: '' })); }}
          error={errors.password}
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={handleLogin}
          returnKeyType="done"
          accessory={
            <Pressable onPress={() => setShowPassword((shown) => !shown)} style={styles.eye} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
            </Pressable>
          }
        />
        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
        <AppButton label="Log in" onPress={handleLogin} loading={busy} style={styles.submit} />

        <Text style={styles.link} onPress={onSwitchToRegister}>
          Don't have an account? Register
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xxl, paddingVertical: 48 },
  brandLogo: { width: 260, height: 72, alignSelf: 'center', marginBottom: theme.spacing.md },
  subtitle: { fontSize: theme.fontSizes.md, color: theme.colors.muted, textAlign: 'center', marginBottom: theme.spacing.xxl },
  title: { fontSize: theme.fontSizes.xl, fontWeight: 'bold', textAlign: 'center', color: theme.colors.text, marginBottom: theme.spacing.lg },
  eye: { padding: theme.spacing.md },
  serverError: { color: theme.colors.danger, textAlign: 'center', marginBottom: theme.spacing.md },
  submit: { marginTop: theme.spacing.sm },
  link: { color: theme.colors.primary, textAlign: 'center', marginTop: theme.spacing.lg },
});
