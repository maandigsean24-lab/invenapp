import React, { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login', 'register', or 'home'
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleLoginSuccess = (fullName) => {
    setLoggedInUser(fullName);
    setScreen('home');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setScreen('login');
  };

  if (screen === 'register') {
    return <RegisterScreen onSwitchToLogin={() => setScreen('login')} />;
  }

  if (screen === 'home') {
    return <HomeScreen username={loggedInUser} onLogout={handleLogout} />;
  }

  return (
    <LoginScreen
      onSwitchToRegister={() => setScreen('register')}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}