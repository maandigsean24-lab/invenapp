import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { clearSession, restoreSession } from './utils/auth';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'register'
  const [user, setUser] = useState(null); // { email, fullName }
  const [restoring, setRestoring] = useState(true);

  // Keep people logged in between app launches.
  useEffect(() => {
    restoreSession()
      .then(setUser)
      .catch((error) => console.error('Failed to restore session.', error))
      .finally(() => setRestoring(false));
  }, []);

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    setScreen('login');
  };

  let content;
  if (restoring) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2f6fed" />
      </View>
    );
  } else if (user) {
    content = <HomeScreen user={user} onLogout={handleLogout} />;
  } else if (screen === 'register') {
    content = <RegisterScreen onSwitchToLogin={() => setScreen('login')} />;
  } else {
    content = <LoginScreen onSwitchToRegister={() => setScreen('register')} onLoginSuccess={setUser} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {content}
    </>
  );
}
