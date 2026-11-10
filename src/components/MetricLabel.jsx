export function MetricLabel({ label, explanation }) {
  return <details className="metric-help">
    <summary>{label}<span aria-hidden="true" className="metric-help-icon">?</span></summary>
    <p>{explanation}</p>
  </details>;
}
