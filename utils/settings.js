import { LOW_STOCK_THRESHOLD } from './format';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

export async function readUserSettings(userId) {
  const { data, error } = await supabaseRequest(() => supabase
    .from('profiles')
    .select('low_stock_threshold')
    .eq('id', userId)
    .single());
  if (error) throw new Error(`Unable to load your settings: ${supabaseErrorMessage(error)}`);

  const threshold = data.low_stock_threshold;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 999999) {
    throw new Error('Saved low-stock threshold is invalid.');
  }
  return { lowStockThreshold: threshold };
}

export async function saveUserSettings(userId, settings) {
  if (
    !Number.isInteger(settings.lowStockThreshold) ||
    settings.lowStockThreshold < 0 ||
    settings.lowStockThreshold > 999999
  ) {
    throw new Error('Enter a whole number between 0 and 999,999.');
  }

  const { data, error } = await supabaseRequest(() => supabase
    .from('profiles')
    .update({ low_stock_threshold: settings.lowStockThreshold })
    .eq('id', userId)
    .select('id')
    .single());
  if (error || !data) {
    throw new Error(`Unable to save your settings${error ? `: ${supabaseErrorMessage(error)}` : '.'}`);
  }
}
