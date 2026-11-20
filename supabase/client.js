import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.');
}

export function ensureSupabaseConfigured() {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
    throw new Error('The Supabase Project URL in .env.local is not valid. Copy the Project URL from your Supabase dashboard.');
  }
  if (!supabaseKey.startsWith('sb_publishable_')) {
    throw new Error('The Supabase key in .env.local is not a publishable key. Copy the Publishable key from your Supabase dashboard; never use a secret or service-role key in the app.');
  }
}

export function supabaseErrorMessage(error) {
  const message = error?.message || 'An unexpected Supabase error occurred.';
  if (/failed to fetch|network request failed|fetch failed|load failed/i.test(message)) {
    return 'Could not reach Supabase. Check your internet connection and confirm the Project URL in .env.local matches your Supabase dashboard.';
  }
  return message;
}

export async function supabaseRequest(operation) {
  ensureSupabaseConfigured();
  try {
    return await operation();
  } catch (error) {
    throw new Error(supabaseErrorMessage(error));
  }
}

// Keep Supabase sessions between app launches using the app's existing secure storage adapter.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh auth tokens while the native app is active, not while it is backgrounded.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
