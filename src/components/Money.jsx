import { useContext, useEffect, useRef, useState } from 'react';
import { PrivacyContext } from './OverviewControls';
export function Money({ amount }) {
  const privateMode = useContext(PrivacyContext);
  const previousAmount = useRef(amount);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (previousAmount.current === amount) return undefined;
    previousAmount.current = amount;
    setChanged(true);
    const timeout = window.setTimeout(() => setChanged(false), 420);
    return () => window.clearTimeout(timeout);
  }, [amount]);
  const className = `money${changed ? ' money-value-change' : ''}`;
  if (privateMode) return <span className="money" aria-label="Amount hidden">••••</span>;
  const parts = String(amount).match(/^([+-]?)([A-Z]{3})\s(.+)$/);
  if (!parts) return <span className={className}>{amount}</span>;
  return <span className={className}><span className="money-sign">{parts[1]}</span><span className="money-currency">{parts[2]}</span>{' '}<span className="money-amount">{parts[3]}</span></span>;
}
