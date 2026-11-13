export const LOW_STOCK_THRESHOLD = 10;

export function formatMoney(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function stockStatus(quantity) {
  if (quantity === 0) return 'out';
  if (quantity < LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}
