export const INITIAL_CATEGORIES = ['Tech', 'Semi', 'Retail', 'EV', 'Crypto', 'Dividend', 'ETF', 'Real Estate', 'Other'];

export const INITIAL_HOLDINGS = [
  { 
    id: 'h-1', 
    symbol: 'AAPL', 
    name: 'Apple Inc.', 
    shares: 15, 
    avgCost: 165.40, 
    currentPrice: 182.52, 
    category: 'Tech', 
    dividendYield: 0.55, 
    targetPercent: 30,
    notes: 'Core tech long-term holding.', 
    currency: 'USD', 
    buyDate: '2023-05-12' 
  },
  { 
    id: 'h-2', 
    symbol: 'MSFT', 
    name: 'Microsoft Corp.', 
    shares: 8, 
    avgCost: 340.00, 
    currentPrice: 415.30, 
    category: 'Tech', 
    dividendYield: 0.72, 
    targetPercent: 25,
    notes: 'Cloud & AI market leader.', 
    currency: 'USD', 
    buyDate: '2023-08-20' 
  },
  { 
    id: 'h-3', 
    symbol: 'NVDA', 
    name: 'NVIDIA Corp.', 
    shares: 5, 
    avgCost: 450.25, 
    currentPrice: 875.28, 
    category: 'Semi', 
    dividendYield: 0.03, 
    targetPercent: 15,
    notes: 'High growth GPU infrastructure.', 
    currency: 'USD', 
    buyDate: '2023-10-15' 
  },
  { 
    id: 'h-4', 
    symbol: 'BTC', 
    name: 'Bitcoin (USD)', 
    shares: 0.25, 
    avgCost: 42000.00, 
    currentPrice: 67450.00, 
    category: 'Crypto', 
    dividendYield: 0.0, 
    targetPercent: 15,
    notes: 'Digital store of value.', 
    currency: 'USD', 
    buyDate: '2024-01-10' 
  },
  { 
    id: 'h-5', 
    symbol: 'O', 
    name: 'Realty Income Corp', 
    shares: 25, 
    avgCost: 52.50, 
    currentPrice: 55.20, 
    category: 'Dividend', 
    dividendYield: 5.60, 
    targetPercent: 15,
    notes: 'Monthly dividend cashflow generator.', 
    currency: 'USD', 
    buyDate: '2023-11-01' 
  }
];

export const INITIAL_WATCHLIST = [
  {
    id: 'w-1',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 175.50,
    targetBuyPrice: 165.00,
    category: 'Tech',
    notes: 'Waiting for slight pullback before entry.'
  },
  {
    id: 'w-2',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    currentPrice: 185.20,
    targetBuyPrice: 178.00,
    category: 'Retail',
    notes: 'AWS growth catalyst.'
  }
];

export const INITIAL_TRANSACTIONS = [
  { id: 't-1', date: '2023-05-12', type: 'BUY', symbol: 'AAPL', shares: 15, price: 165.40, total: 2481.00 },
  { id: 't-2', date: '2023-08-20', type: 'BUY', symbol: 'MSFT', shares: 8, price: 340.00, total: 2720.00 },
  { id: 't-3', date: '2023-10-15', type: 'BUY', symbol: 'NVDA', shares: 5, price: 450.25, total: 2251.25 },
  { id: 't-4', date: '2024-01-10', type: 'BUY', symbol: 'BTC', shares: 0.25, price: 42000.00, total: 10500.00 },
  { id: 't-5', date: '2023-11-01', type: 'BUY', symbol: 'O', shares: 25, price: 52.50, total: 1312.50 }
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
  { date: 'Today', value: 15450 }
];
