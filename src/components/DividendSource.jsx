export function DividendSource({ item }) {
  const label = item.dividendYieldSource === 'historical' ? 'Historical payments (trailing year)' : item.dividendYieldSource === 'provider' ? 'Market-provider yield' : item.dividendYieldSource === 'manual' ? 'Manually entered yield' : 'Saved yield (source not recorded)';
  return <span className="data-source-label">Estimate: {label}. Payments are not guaranteed.</span>;
}
