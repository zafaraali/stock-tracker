import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function PortfolioHealth({ holdings = [], onReviewPrices, onReviewTargets }) {
  const now = Date.now();
  const stalePrices = holdings.filter(item => !item.priceUpdatedAt || now - Date.parse(item.priceUpdatedAt) >= 24 * 60 * 60 * 1000).length;
  const missingTargets = holdings.filter(item => item.targetPercent === '' || item.targetPercent === null || item.targetPercent === undefined).length;
  const issues = stalePrices + missingTargets;
  return <section className={`portfolio-health ${issues ? 'has-issues' : 'is-healthy'}`} aria-labelledby="portfolio-health-title">
    <div className="portfolio-health-icon" aria-hidden="true">{issues ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</div>
    <div className="min-w-0 flex-1"><h2 id="portfolio-health-title" className="text-sm font-semibold">Portfolio health</h2><p className="supporting-text">{issues ? <>{stalePrices > 0 && <button type="button" className="health-count-link" onClick={onReviewPrices}>{stalePrices} stale price{stalePrices === 1 ? '' : 's'}</button>}{stalePrices > 0 && missingTargets > 0 && ' · '}{missingTargets > 0 && <button type="button" className="health-count-link" onClick={onReviewTargets}>{missingTargets} missing target{missingTargets === 1 ? '' : 's'}</button>}.</> : 'Prices and allocation targets look complete.'}</p></div>
    {issues > 0 && <div className="portfolio-health-actions">{stalePrices > 0 && onReviewPrices && <button type="button" className="secondary-button" onClick={onReviewPrices}>Review prices</button>}{missingTargets > 0 && onReviewTargets && <button type="button" className="secondary-button" onClick={onReviewTargets}>Set targets</button>}</div>}
  </section>;
}
