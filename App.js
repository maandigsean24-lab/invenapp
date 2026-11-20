import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DialogHost from './components/DialogHost';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { clearSession, restoreSession } from './utils/auth';
import { notify } from './utils/dialog';
import theme from './theme';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'register'
  const [user, setUser] = useState(null); // { email, fullName }
  const [restoring, setRestoring] = useState(true);

  // Keep people logged in between app launches.
  useEffect(() => {
    restoreSession()
      .then(setUser)
      .catch((error) => {
        notify('Unable to restore session', error.message);
        setUser(null);
      })
      .finally(() => setRestoring(false));
  }, []);

  const handleLogout = async () => {
    try {
      await clearSession();
      setUser(null);
      setScreen('login');
    } catch (error) {
      notify('Could not log out', error.message);
    }
  };

  const handleUserUpdate = (updatedUser) => setUser(updatedUser);

  let content;
  if (restoring) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  } else if (user) {
    content = (
      <HomeScreen
        user={user}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
      />
    );
  } else if (screen === 'register') {
    content = <RegisterScreen onSwitchToLogin={() => setScreen('login')} />;
  } else {
    content = <LoginScreen onSwitchToRegister={() => setScreen('register')} onLoginSuccess={setUser} />;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={user ? theme.colors.background : theme.colors.surface} />
      {content}
      <DialogHost />
    </>
  );
}
