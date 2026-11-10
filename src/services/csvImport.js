import { inferSymbolMetadata } from './marketApi';
import { validDate } from './portfolioValidation';
import { CURRENCY_RATES } from '../data/mockData';

const normalizeHeader = header => String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  const addRow = () => { if (row.some(cell => cell !== '')) { Object.defineProperty(row, 'sourceLine', { value: rowLine }); rows.push(row); } };
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && source[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(value.trim());
      addRow();
      row = []; value = '';
      rowLine = line + 1;
    } else value += char;
    if (char === '\n' || (char === '\r' && source[index + 1] !== '\n')) line += 1;
  }
  row.push(value.trim());
  if (quoted) throw new Error(`Unclosed quoted field starting near source line ${rowLine}.`);
  addRow();
  return rows;
}

export const parseCsvNumber = value => Number(String(value || '').replace(/[$,%\s]/g, ''));

export const CSV_FIELDS = { symbol: 'Symbol', shares: 'Shares / quantity', avgcost: 'Average cost per share', totalcost: 'Total cost basis', currentprice: 'Current price', marketvalue: 'Market value', currency: 'Currency', name: 'Name', category: 'Category', holdingslist: 'Holdings list', type: 'Transaction type', date: 'Trade date (YYYY-MM-DD)', price: 'Execution price', fee: 'Fees', amount: 'Cash amount' };

export function parsePortfolioCsv(text, selectedAccountId, mapping) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error('The CSV does not contain any data rows.');
  if (mapping) {
    const used = Object.values(mapping).filter(value => value !== '' && value !== null).map(Number);
    if (new Set(used).size !== used.length) throw new Error('Map each source column to only one field.');
    rows[0] = rows[0].map((header, index) => Object.keys(mapping).find(field => mapping[field] !== '' && mapping[field] !== null && Number(mapping[field]) === index) || `ignored${index}`);
  }
  const headers = rows[0].map(normalizeHeader);
  const indexOf = aliases => headers.findIndex(header => aliases.some(alias => header === alias || header.startsWith(alias)));
  const symbolIndex = indexOf(['symbol', 'ticker', 'tickersymbol', 'instrument', 'security']);
  const listIndex = indexOf(['holdingslist', 'listname', 'accountname']);
  // Do not use the broad `curr` alias: it also matches `currentprice`.
  const currencyIndex = indexOf(['currency', 'assetcurrency', 'currencycode', 'currcode']);
  const sharesIndex = indexOf(['shares', 'quantity', 'units']);
  const actionIndex = indexOf(['type', 'action', 'transactiontype', 'activity']);
  const dateIndex = indexOf(['date', 'tradedate', 'transactiondate', 'settlementdate']);
  const priceIndex = indexOf(['price', 'shareprice', 'executionprice']);
  const feeIndex = indexOf(['fee', 'fees', 'commission']);
  const amountIndex = indexOf(['amount', 'total', 'proceeds', 'netamount']);
  const avgIndex = indexOf(['avgcost', 'averagecost', 'costpershare', 'averageprice']);
  const totalCostIndex = indexOf(['costbasistotal', 'totalcost', 'costbasis']);
  const currentPriceIndex = indexOf(['currentprice', 'lastprice', 'shareprice', 'markprice']);
  const marketValueIndex = indexOf(['marketvalue', 'currentvalue', 'value']);
  const nameIndex = indexOf(['name', 'description', 'investmentname']);
  const sectorIndex = indexOf(['sector', 'category']);
  const broker = headers.some(header => header.includes('accountname')) ? 'Broker export' : headers.includes('tickersymbol') ? 'Fidelity / generic' : headers.includes('instrument') ? 'Robinhood / generic' : headers.includes('investmentname') ? 'Vanguard / generic' : 'ApexFinance CSV';
  const dataRows = rows.slice(1);
  const review = (items, kind) => {
    const accepted = [], rejectedRows = [], sourceLines = [];
    items.forEach((item, index) => {
      const reasons = [];
      if (dataRows[index].length !== headers.length) reasons.push(`Expected ${headers.length} columns, found ${dataRows[index].length}`);
      if (item.currency && !Object.hasOwn(CURRENCY_RATES, item.currency)) reasons.push(`Unsupported currency: ${item.currency}`);
      if (kind === 'holdings') {
        if (!String(item.symbol || '').trim()) reasons.push('Missing symbol');
        if (!Number.isFinite(item.shares) || item.shares <= 0) reasons.push('Shares must be a positive number');
        if (!Number.isFinite(item.avgCost) || item.avgCost < 0) reasons.push('Average cost must be a nonnegative number');
        if (!Number.isFinite(item.currentPrice) || item.currentPrice < 0) reasons.push('Current price must be a nonnegative number');
      } else {
        if (!item.type) reasons.push(`Unsupported transaction type: ${dataRows[index][actionIndex] || '(empty)'}`);
        if (!validDate(item.date)) reasons.push('Date must be a valid YYYY-MM-DD date');
        if (!['DEPOSIT', 'WITHDRAW'].includes(item.type) && !String(item.symbol || '').trim()) reasons.push('Missing symbol');
        if (['BUY', 'SELL', 'SPLIT'].includes(item.type) && (!Number.isFinite(item.shares) || item.shares <= 0)) reasons.push('Quantity or split ratio must be positive');
        if (['BUY', 'SELL'].includes(item.type) && (!Number.isFinite(item.price) || item.price <= 0)) reasons.push('Execution price must be positive');
        if (['DEPOSIT', 'WITHDRAW', 'DIVIDEND'].includes(item.type) && (!Number.isFinite(item.total) || item.total <= 0)) reasons.push('Amount must be positive');
        if (!Number.isFinite(item.fee) || item.fee < 0) reasons.push('Fees must be nonnegative');
      }
      const sourceLine = dataRows[index].sourceLine;
      if (reasons.length) rejectedRows.push({ sourceLine, reasons });
      else { accepted.push(item); sourceLines.push(sourceLine); }
    });
    return { kind, rows: accepted, rejectedRows, sourceLines, broker };
  };
  const hasTransactions = actionIndex >= 0 && dateIndex >= 0 && (priceIndex >= 0 || amountIndex >= 0);
  if (hasTransactions) {
    const normalizeAction = value => {
      const action = String(value || '').toUpperCase();
      if (action.includes('BUY') || action.includes('PURCHASE') || action.includes('BOUGHT')) return 'BUY';
      if (action.includes('SELL') || action.includes('SOLD')) return 'SELL';
      if (action.includes('DIV')) return 'DIVIDEND';
      if (action.includes('SPLIT')) return 'SPLIT';
      if (action.includes('DEPOSIT')) return 'DEPOSIT';
      if (action.includes('WITHDRAW')) return 'WITHDRAW';
      return '';
    };
    const transactions = dataRows.map(row => {
      const type = normalizeAction(row[actionIndex]);
      const shares = parseCsvNumber(row[sharesIndex]);
      const amount = amountIndex >= 0 ? Math.abs(parseCsvNumber(row[amountIndex])) : 0;
      const price = priceIndex >= 0 ? parseCsvNumber(row[priceIndex]) : shares > 0 ? amount / shares : 0;
      return { type, date: row[dateIndex], symbol: row[symbolIndex] || '', shares, ratio: shares, price, total: amount || shares * price, fee: feeIndex >= 0 ? Math.abs(parseCsvNumber(row[feeIndex])) : 0, ...(currencyIndex >= 0 && row[currencyIndex] ? { currency: String(row[currencyIndex]).toUpperCase() } : {}), cashImpact: false, accountId: selectedAccountId };
    });
    return review(transactions, 'transactions');
  }
  if (symbolIndex < 0 || sharesIndex < 0 || (avgIndex < 0 && totalCostIndex < 0)) throw new Error('CSV needs a symbol, shares/quantity, and cost basis or average cost column.');
  const holdings = dataRows.map(row => {
    const shares = parseCsvNumber(row[sharesIndex]);
    const avgCost = avgIndex >= 0 ? parseCsvNumber(row[avgIndex]) : parseCsvNumber(row[totalCostIndex]) / shares;
    const currentPrice = currentPriceIndex >= 0 ? parseCsvNumber(row[currentPriceIndex]) : marketValueIndex >= 0 ? parseCsvNumber(row[marketValueIndex]) / shares : avgCost;
    const metadata = inferSymbolMetadata(row[symbolIndex]);
    return { symbol: row[symbolIndex], name: nameIndex >= 0 ? row[nameIndex] : row[symbolIndex], category: sectorIndex >= 0 ? String(row[sectorIndex] || '').trim() || metadata.category : metadata.category, assetType: metadata.assetType, exchange: metadata.exchange, shares, avgCost, currentPrice, currency: currencyIndex >= 0 ? String(row[currencyIndex] || '').toUpperCase() || metadata.currency : metadata.currency, targetPercent: 0, dividendYield: 0, notes: `Imported from ${broker}`, accountId: selectedAccountId, accountName: listIndex >= 0 ? String(row[listIndex] || '').trim() : '' };
  });
  return review(holdings, 'holdings');
}
