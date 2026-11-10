import { inferSymbolMetadata } from './marketApi';

const normalizeHeader = header => String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && source[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  return rows;
}

export const parseCsvNumber = value => Number(String(value || '').replace(/[$,%\s]/g, ''));

export function parsePortfolioCsv(text, selectedAccountId) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error('The CSV does not contain any data rows.');
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
  const hasTransactions = actionIndex >= 0 && dateIndex >= 0 && symbolIndex >= 0 && sharesIndex >= 0 && (priceIndex >= 0 || amountIndex >= 0);
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
      return { type, date: row[dateIndex], symbol: row[symbolIndex] || '', shares, ratio: shares, price, total: amount || shares * price, fee: feeIndex >= 0 ? Math.abs(parseCsvNumber(row[feeIndex])) : 0, cashImpact: false, accountId: selectedAccountId };
    }).filter(item => item.type && item.date && (item.type === 'DIVIDEND' || item.type === 'DEPOSIT' || item.type === 'WITHDRAW' || (item.type === 'SPLIT' ? item.shares > 0 : item.symbol && item.shares > 0 && item.price > 0)));
    if (!transactions.length) throw new Error('No valid transactions were found in the CSV.');
    return { kind: 'transactions', rows: transactions, broker };
  }
  if (symbolIndex < 0 || sharesIndex < 0 || (avgIndex < 0 && totalCostIndex < 0)) throw new Error('CSV needs a symbol, shares/quantity, and cost basis or average cost column.');
  const holdings = dataRows.map(row => {
    const shares = parseCsvNumber(row[sharesIndex]);
    const avgCost = avgIndex >= 0 ? parseCsvNumber(row[avgIndex]) : parseCsvNumber(row[totalCostIndex]) / shares;
    const currentPrice = currentPriceIndex >= 0 ? parseCsvNumber(row[currentPriceIndex]) : marketValueIndex >= 0 ? parseCsvNumber(row[marketValueIndex]) / shares : avgCost;
    const metadata = inferSymbolMetadata(row[symbolIndex]);
    return { symbol: row[symbolIndex], name: nameIndex >= 0 ? row[nameIndex] : row[symbolIndex], category: sectorIndex >= 0 ? String(row[sectorIndex] || '').trim() || metadata.category : metadata.category, assetType: metadata.assetType, exchange: metadata.exchange, shares, avgCost, currentPrice, currency: currencyIndex >= 0 ? String(row[currencyIndex] || '').toUpperCase() || metadata.currency : metadata.currency, targetPercent: 0, dividendYield: 0, notes: `Imported from ${broker}`, accountId: selectedAccountId, accountName: listIndex >= 0 ? String(row[listIndex] || '').trim() : '' };
  }).filter(item => item.symbol && item.shares > 0 && item.avgCost >= 0 && item.currentPrice >= 0);
  if (!holdings.length) throw new Error('No valid holdings were found in the CSV.');
  return { kind: 'holdings', rows: holdings, broker };
}
