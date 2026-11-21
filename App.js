import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DialogHost from './components/DialogHost';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import { clearSession, consumePasswordRecoveryLink, restoreSession } from './utils/auth';
import { supabase } from './supabase/client';
import { notify } from './utils/dialog';
import theme from './theme';

export default function App() {
  const [screen, setScreen] = useState('login'); // login, register, forgot-password, or reset-password
  const [user, setUser] = useState(null); // { email, fullName }
  const [restoring, setRestoring] = useState(true);

  // Restore sessions and route password-recovery links to the new-password form.
  useEffect(() => {
    let active = true;
    let recoveryInProgress = false;

    const handleRecoveryUrl = async (url) => {
      try {
        const isRecovery = await consumePasswordRecoveryLink(url);
        if (isRecovery && active) {
          recoveryInProgress = true;
          setUser(null);
          setScreen('reset-password');
        }
      } catch (error) {
        if (!active) return;
        recoveryInProgress = true;
        setUser(null);
        setScreen('login');
        notify('Password reset link unavailable', error.message);
      }
    };

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryUrl(url);
    });
    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) {
        recoveryInProgress = true;
        setUser(null);
        setScreen('reset-password');
      }
    });

    const initialize = async () => {
      try {
        const initialUrl = Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : await Linking.getInitialURL();
        await handleRecoveryUrl(initialUrl);
        if (!recoveryInProgress) {
          const restoredUser = await restoreSession();
          if (active) setUser(restoredUser);
        }
      } catch (error) {
        if (active) {
          notify('Unable to restore session', error.message);
          setUser(null);
        }
      } finally {
        if (active) setRestoring(false);
      }
    };

    initialize();
    return () => {
      active = false;
      urlSubscription.remove();
      authSubscription.data.subscription.unsubscribe();
    };
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
  } else if (screen === 'forgot-password') {
    content = <ForgotPasswordScreen onBackToLogin={() => setScreen('login')} />;
  } else if (screen === 'reset-password') {
    content = <ResetPasswordScreen onComplete={() => {
      setScreen('login');
      notify('Password updated', 'Log in with your new password.');
    }} />;
  } else {
    content = (
      <LoginScreen
        onSwitchToRegister={() => setScreen('register')}
        onSwitchToForgotPassword={() => setScreen('forgot-password')}
        onLoginSuccess={setUser}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={user ? theme.colors.background : theme.colors.surface} />
      {content}
      <DialogHost />
    </>
  );
}
