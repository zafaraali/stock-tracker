import { CURRENCY_RATES } from '../data/mockData';

export const fallbackRates = Object.fromEntries(Object.entries(CURRENCY_RATES).map(([code, value]) => [code, value.rate]));
export const validRates = data => data && /^\d{4}-\d{2}-\d{2}$/.test(data.date) && Object.keys(fallbackRates).every(code => Number.isFinite(data.rates?.[code]) && data.rates[code] > 0) && data.rates.USD === 1;
const FX_API_URL = import.meta.env.VITE_FX_API_URL || '/api/fx-rates';

export async function fetchExchangeRates(date = 'latest', signal) {
  // Include the preceding week so weekends and holidays use the last published rate.
  const start = date === 'latest' ? null : new Date(`${date}T00:00:00Z`);
  if (start) start.setUTCDate(start.getUTCDate() - 7);
  const query = start ? `&from=${start.toISOString().slice(0, 10)}&to=${encodeURIComponent(date)}` : '';
  const response = await fetch(`${FX_API_URL}?base=USD&quotes=EUR,GBP,CAD,JPY${query}${query ? '&' : '&'}_=${Date.now()}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Exchange rates unavailable');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid exchange rates');
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const result = { date: ordered.at(-1)?.date, fetchedAt: new Date().toISOString(), rates: { USD: 1 } };
  for (const row of ordered) result.rates[row.quote] = row.rate;
  if (!validRates(result)) throw new Error('Invalid exchange rates');
  return result;
}
