import { createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';

const DashboardCardsContext = createContext(null);

export function DashboardCardsProvider({ children }) {
  const [closed, setClosed] = useState([]);
  return <DashboardCardsContext.Provider value={{ closed, close: id => setClosed(previous => [...previous, id]) }}>{children}</DashboardCardsContext.Provider>;
}

export function DashboardCard({ cardId, label, as: Element = 'section', className = '', children, ...props }) {
  const cards = useContext(DashboardCardsContext);
  if (cards?.closed.includes(cardId)) return null;
  return <Element {...props} className={`${className} ${cards ? 'dashboard-closable-card' : ''}`}>
    {cards && <button type="button" className="icon-button dashboard-card-close no-print" aria-label={`Close ${label} until reload`} title="Close until page reload" onClick={() => cards.close(cardId)}><X size={16} aria-hidden="true" /></button>}
    {children}
  </Element>;
}
