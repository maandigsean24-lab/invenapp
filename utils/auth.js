import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

async function readUsers() {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('Unable to access saved accounts. Please try again.');
  }
}

async function writeUsers(users) {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    throw new Error('Unable to save your account. Please try again.');
  }
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
    throw new Error('Email already registered.');
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

  if (!user) throw new Error('Wrong email or password.');

  // Accounts created by the first version of the app stored the raw password.
  // Accept it once, then upgrade the record to a salted hash.
  if (user.password !== undefined) {
    if (user.password !== password) throw new Error('Wrong email or password.');
    const salt = await makeSalt();
    users[key] = {
      fullName: user.fullName,
      email: key,
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    await writeUsers(users);
  } else if ((await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new Error('Wrong email or password.');
  }

  try {
    await AsyncStorage.setItem(SESSION_KEY, key);
  } catch {
    throw new Error('Unable to save your session. Please try again.');
  }
  return { email: key, fullName: users[key].fullName };
}

export async function updateUserName(email, fullName) {
  const key = normalizeEmail(email);
  const users = await readUsers();
  if (!users[key]) throw new Error('Unable to find this account. Please log in again.');

  users[key] = { ...users[key], fullName: fullName.trim() };
  await writeUsers(users);
  return { email: key, fullName: users[key].fullName };
}

export async function changeUserPassword({ email, currentPassword, newPassword }) {
  const key = normalizeEmail(email);
  const users = await readUsers();
  const user = users[key];
  if (!user) throw new Error('Unable to find this account. Please log in again.');

  const currentPasswordMatches = user.password !== undefined
    ? user.password === currentPassword
    : (await hashPassword(currentPassword, user.salt)) === user.passwordHash;
  if (!currentPasswordMatches) throw new Error('Current password is incorrect.');

  const salt = await makeSalt();
  users[key] = {
    fullName: user.fullName,
    email: key,
    salt,
    passwordHash: await hashPassword(newPassword, salt),
  };
  await writeUsers(users);
}

export async function restoreSession() {
  try {
    const key = await AsyncStorage.getItem(SESSION_KEY);
    if (!key) return null;
    const users = await readUsers();
    const user = users[key];
    return user ? { email: key, fullName: user.fullName } : null;
  } catch {
    throw new Error('Unable to restore your saved session. Please try again.');
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    throw new Error('Unable to log out right now. Please try again.');
  }
}
