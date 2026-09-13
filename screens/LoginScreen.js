import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';

export default function LoginScreen({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    const usersData = await AsyncStorage.getItem('users');
    const users = usersData ? JSON.parse(usersData) : {};

    const user = users[email];

    if (!user) {
      alert('No account found with this email.');
      return;
    }

    if (user.password !== password) {
      alert('Incorrect password.');
      return;
    }

    onLoginSuccess(user.fullName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <FormInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <FormInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <AppButton label="Log In" onPress={handleLogin} />

      <Text style={styles.link} onPress={onSwitchToRegister}>
        Don't have an account? Register
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  link: { color: '#2f6fed', textAlign: 'center', marginTop: 16 },
});