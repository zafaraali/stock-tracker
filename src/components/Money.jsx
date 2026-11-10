export function Money({ amount }) {
  const parts = String(amount).match(/^([+-]?)([A-Z]{3})\s(.+)$/);
  if (!parts) return <span className="money">{amount}</span>;
  return <span className="money"><span className="money-sign">{parts[1]}</span><span className="money-currency">{parts[2]}</span>{' '}<span className="money-amount">{parts[3]}</span></span>;
}
