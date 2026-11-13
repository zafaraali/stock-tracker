export const SECTIONS = ['dashboard', 'holdings', 'history', 'watchlist', 'dividends', 'performance', 'rebalance', 'help'];
export function sectionFromHash(hash) {
  const section = String(hash || '').replace(/^#\/?/, '');
  return SECTIONS.includes(section) ? section : null;
}
export function sectionFromLocation(location) {
  const pathSection = String(location?.pathname || '').replace(/^\/+|\/+$/g, '');
  return SECTIONS.includes(pathSection) ? pathSection : sectionFromHash(location?.hash);
}
