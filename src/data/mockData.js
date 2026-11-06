export const INITIAL_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Tech' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'Tech' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'Semi' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Tech' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'Retail' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'EV' },
  { symbol: 'BTC', name: 'Bitcoin (USD)', category: 'Crypto' }
];

export const INITIAL_HOLDINGS = [
  { id: 'h-1', symbol: 'AAPL', shares: 15, avgCost: 165.40, currentPrice: 182.52, currency: 'USD', buyDate: '2023-05-12' },
  { id: 'h-2', symbol: 'MSFT', shares: 8, avgCost: 340.00, currentPrice: 415.30, currency: 'USD', buyDate: '2023-08-20' },
  { id: 'h-3', symbol: 'NVDA', shares: 5, avgCost: 450.25, currentPrice: 875.28, currency: 'USD', buyDate: '2023-10-15' },
  { id: 'h-4', symbol: 'BTC', shares: 0.25, avgCost: 42000.00, currentPrice: 67450.00, currency: 'USD', buyDate: '2024-01-10' }
];

export const CURRENCY_RATES = {
  USD: { symbol: '$', rate: 1.0, label: 'US Dollar' },
  EUR: { symbol: '€', rate: 0.92, label: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, label: 'British Pound' },
  CAD: { symbol: 'CA$', rate: 1.35, label: 'Canadian Dollar' },
  JPY: { symbol: '¥', rate: 151.4, label: 'Japanese Yen' }
};

export const PORTFOLIO_HISTORY = [
  { date: 'Jan 01', value: 9200 },
  { date: 'Jan 15', value: 9800 },
  { date: 'Feb 01', value: 10400 },
  { date: 'Feb 15', value: 10100 },
  { date: 'Mar 01', value: 11200 },
  { date: 'Mar 15', value: 11950 },
  { date: 'Today', value: 12450 }
];
