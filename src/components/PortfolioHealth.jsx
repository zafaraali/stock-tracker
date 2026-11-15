import { AlertTriangle } from 'lucide-react';

export function PortfolioHealth({ holdings = [], onReviewPrices, onReviewTargets }) {
  const now = Date.now();
  const stalePrices = holdings.filter(item => !item.priceUpdatedAt || now - Date.parse(item.priceUpdatedAt) >= 24 * 60 * 60 * 1000).length;
  const missingTargets = holdings.filter(item => item.targetPercent === '' || item.targetPercent === null || item.targetPercent === undefined).length;
  const issues = stalePrices + missingTargets;
  if (!issues) return null;
  return <section className="portfolio-health has-issues" aria-labelledby="portfolio-health-title">
    <div className="portfolio-health-icon" aria-hidden="true"><AlertTriangle className="h-4 w-4" /></div>
    <div className="min-w-0 flex-1"><h2 id="portfolio-health-title" className="text-sm font-semibold">Portfolio health</h2><p className="supporting-text"><>{stalePrices > 0 && <button type="button" className="health-count-link" onClick={onReviewPrices}>{stalePrices} stale price{stalePrices === 1 ? '' : 's'}</button>}{stalePrices > 0 && missingTargets > 0 && ' · '}{missingTargets > 0 && <button type="button" className="health-count-link" onClick={onReviewTargets}>{missingTargets} missing target{missingTargets === 1 ? '' : 's'}</button>}.</></p></div>

  </section>;
}
