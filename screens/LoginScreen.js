import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';
import { loginUser } from '../utils/auth';
import { notify } from '../utils/dialog';

export default function LoginScreen({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      notify('Missing information', 'Please fill in all fields.');
      return;
    }

    setBusy(true);
    try {
      const user = await loginUser({ email, password });
      onLoginSuccess(user);
    } catch (error) {
      notify('Could not log in', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>InvenApp</Text>
        <Text style={styles.title}>Log In</Text>

        <FormInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
        />
        <FormInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={handleLogin}
        />

        <AppButton label="Log In" onPress={handleLogin} loading={busy} />

        <Text style={styles.link} onPress={onSwitchToRegister}>
          Don't have an account? Register
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 14, fontWeight: '700', color: '#2f6fed', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  link: { color: '#2f6fed', textAlign: 'center', marginTop: 16 },
});
