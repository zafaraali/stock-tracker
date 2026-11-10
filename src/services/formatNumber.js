export function formatQuantity(value) {
  if (value === null || value === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(Object.is(Number(value), -0) ? 0 : Number(value));
}

export function formatPercent(value, { signed = false } = {}) {
  if (value === null || value === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: signed ? 'exceptZero' : 'auto' }).format(Number(Number(value).toFixed(2)) || 0) + '%';
}
