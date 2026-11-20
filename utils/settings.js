import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeEmail } from './auth';
import { LOW_STOCK_THRESHOLD } from './format';

function settingsKey(email) {
  return `settings:${normalizeEmail(email)}`;
}

export async function readUserSettings(email) {
  try {
    const raw = await AsyncStorage.getItem(settingsKey(email));
    if (!raw) return { lowStockThreshold: LOW_STOCK_THRESHOLD };

    const settings = JSON.parse(raw);
    if (
      !settings ||
      !Number.isInteger(settings.lowStockThreshold) ||
      settings.lowStockThreshold < 0 ||
      settings.lowStockThreshold > 999999
    ) {
      throw new Error('Saved settings are invalid.');
    }
    return { lowStockThreshold: settings.lowStockThreshold };
  } catch (error) {
    if (error.message === 'Saved settings are invalid.') throw error;
    throw new Error('Unable to load your settings. Please try again.');
  }
}

export async function saveUserSettings(email, settings) {
  if (
    !Number.isInteger(settings.lowStockThreshold) ||
    settings.lowStockThreshold < 0 ||
    settings.lowStockThreshold > 999999
  ) {
    throw new Error('Enter a whole number between 0 and 999,999.');
  }

  try {
    await AsyncStorage.setItem(settingsKey(email), JSON.stringify(settings));
  } catch {
    throw new Error('Unable to save your settings. Please try again.');
  }
}
