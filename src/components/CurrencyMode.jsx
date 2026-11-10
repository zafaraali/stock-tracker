export function CurrencyMode({ mode, onChange, currencyCode }) {
  return <label className="currency-mode">Values in<select aria-label="Holding value currency" value={mode} onChange={event => onChange(event.target.value)}><option value="display">Display currency ({currencyCode})</option><option value="native">Asset’s native currency</option></select></label>;
}
