import React, { useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { registerUser } from '../utils/auth';
import { notify } from '../utils/dialog';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      notify('Missing information', 'Please fill in all fields.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      notify('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      notify('Weak password', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      notify('Passwords do not match', 'Please re-enter your password.');
      return;
    }

    setBusy(true);
    try {
      await registerUser({ fullName, email, password });
      notify('Account created', 'You can now log in.');
      onSwitchToLogin();
    } catch (error) {
      notify('Could not register', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        <FormInput placeholder="Full Name" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <FormInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
        />
        <FormInput placeholder="Password (min. 6 characters)" value={password} onChangeText={setPassword} secureTextEntry />
        <FormInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <AppButton label="Register" onPress={handleRegister} loading={busy} />

        <Text style={styles.link} onPress={onSwitchToLogin}>
          Already have an account? Log in
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  link: { color: '#2f6fed', textAlign: 'center', marginTop: 16 },
});
