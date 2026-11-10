export function dataQualityIssues(holdings, now = Date.now()) {
  return holdings.flatMap(item => {
    const issues = [];
    if (!(Number(item.avgCost) > 0)) issues.push('Missing cost basis');
    const updated = Date.parse(item.priceUpdatedAt);
    if (!Number.isFinite(updated) || now - updated > 86400000 || item.priceRefreshFailed) issues.push('Price needs review');
    if (!item.currency || !/^[A-Z]{3}$/.test(item.currency)) issues.push('Currency not recorded');
    return issues.length ? [{ id: item.id, symbol: item.symbol, issues }] : [];
  });
}

export function DataQuality({ holdings, onReview }) {
  const issues = dataQualityIssues(holdings);
  return <details className="data-quality no-print"><summary className="secondary-button cursor-pointer">Data quality{issues.length ? ` · ${issues.length} holdings to review` : ''}</summary><div className="overview-customize-panel">{issues.length ? <ul className="space-y-3">{issues.map(item => <li key={item.id}><button className="secondary-button" onClick={() => onReview(item.symbol)}>{item.symbol} · {item.issues.join(' · ')}</button></li>)}</ul> : <p className="supporting-text">No missing cost bases, unknown currencies, or stale price records found.</p>}</div></details>;
}
