export function formatMoney(value, currency = 'USD', { signed = false, compact = false } = {}) {
  if (!Number.isFinite(Number(value)) || value === null || value === '') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
    ...(compact ? { notation: 'compact' } : {}),
  }).formatToParts(Object.is(Number(value), -0) ? 0 : Number(value))
    .map(part => part.type === 'currency' ? `${currency} ${part.value}` : part.value).join('');
}
