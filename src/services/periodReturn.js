// A period needs a starting observation and at least one subsequent return.
export function calculatePeriodReturn(points, cutoff) {
  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (ordered.length < 2 || ordered[0].date > cutoff) return null;
  let base = -1;
  ordered.forEach((point, index) => { if (point.date <= cutoff) base = index; });
  const observations = ordered.slice(base + 1);
  if (base < 0 || !observations.length || observations.some(point => !Number.isFinite(point.periodReturn))) return null;
  return observations.reduce((factor, point) => factor * (1 + point.periodReturn), 1) - 1;
}
