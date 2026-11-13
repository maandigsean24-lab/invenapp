import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

async function readUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function makeSalt() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hashPassword(password, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export const normalizeEmail = (email) => email.trim().toLowerCase();

export async function registerUser({ fullName, email, password }) {
  const key = normalizeEmail(email);
  const users = await readUsers();

  if (users[key]) {
    throw new Error('An account with this email already exists.');
  }

  const salt = await makeSalt();
  users[key] = {
    fullName: fullName.trim(),
    email: key,
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  await writeUsers(users);
}

// Returns { email, fullName } or throws an Error with a user-friendly message.
export async function loginUser({ email, password }) {
  const key = normalizeEmail(email);
  const users = await readUsers();
  const user = users[key];

  if (!user) {
    throw new Error('No account found with this email.');
  }

  // Accounts created by the first version of the app stored the raw password.
  // Accept it once, then upgrade the record to a salted hash.
  if (user.password !== undefined) {
    if (user.password !== password) throw new Error('Incorrect password.');
    const salt = await makeSalt();
    users[key] = {
      fullName: user.fullName,
      email: key,
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    await writeUsers(users);
  } else if ((await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new Error('Incorrect password.');
  }

  await AsyncStorage.setItem(SESSION_KEY, key);
  return { email: key, fullName: users[key].fullName };
}

export async function restoreSession() {
  const key = await AsyncStorage.getItem(SESSION_KEY);
  if (!key) return null;
  const users = await readUsers();
  const user = users[key];
  return user ? { email: key, fullName: user.fullName } : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
