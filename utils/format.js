export const LOW_STOCK_THRESHOLD = 10;

export function formatName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(' ');
}

export function formatMoney(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function stockStatus(quantity, threshold = LOW_STOCK_THRESHOLD) {
  if (quantity === 0) return 'out';
  if (quantity < threshold) return 'low';
  return 'ok';
}
