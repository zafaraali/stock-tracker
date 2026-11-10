const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6', '#ec4899', '#84cc16', '#a78bfa', '#fb7185'];
export function chartColor(name, kind = 'asset') {
  const key = `${kind}:${String(name).trim().toUpperCase()}`;
  let hash = 0;
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
