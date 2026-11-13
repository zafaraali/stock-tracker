export const SECTIONS = ['dashboard', 'holdings', 'history', 'watchlist', 'dividends', 'performance', 'rebalance', 'help'];
export function sectionFromHash(hash) {
  const section = String(hash || '').replace(/^#\/?/, '');
  return SECTIONS.includes(section) ? section : null;
}
