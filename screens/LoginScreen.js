import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormInput from '../components/FormInput';
import AppButton from '../components/AppButton';

export default function RegisterScreen({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const usersData = await AsyncStorage.getItem('users');
    const users = usersData ? JSON.parse(usersData) : {};

    if (users[email]) {
      alert('An account with this email already exists.');
      return;
    }

    const newUser = { fullName, email, password };
    users[email] = newUser;
    await AsyncStorage.setItem('users', JSON.stringify(users));

    console.log('Account created:', newUser);
    alert('Account created! You can now log in.');
    onSwitchToLogin();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <FormInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
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
      <FormInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <AppButton label="Register" onPress={handleRegister} />

      <Text style={styles.link} onPress={onSwitchToLogin}>
        Already have an account? Log in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  link: { color: '#2f6fed', textAlign: 'center', marginTop: 16 },
});