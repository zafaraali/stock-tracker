import React from 'react';
import { BarChart3, CalendarClock, Inbox, ListPlus, Receipt, Search, WalletCards } from 'lucide-react';

export function EmptyState({ title, description, actionLabel, onAction, compact = false }) {
  const normalizedTitle = String(title || '').toLowerCase();
  const Icon = normalizedTitle.includes('matching')
    ? Search
    : normalizedTitle.includes('dividend')
      ? CalendarClock
      : normalizedTitle.includes('transaction') || normalizedTitle.includes('cash flow')
        ? Receipt
        : normalizedTitle.includes('performance')
          ? BarChart3
          : normalizedTitle.includes('watchlist') || normalizedTitle.includes('ideas')
            ? ListPlus
            : normalizedTitle.includes('portfolio') || normalizedTitle.includes('holding')
              ? WalletCards
              : Inbox;
  return <div className={`empty-state ${compact ? 'compact py-8' : 'py-12'} px-4 text-center`}>
    <div className="empty-state-icon mx-auto mb-3 h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><Icon aria-hidden="true" className="h-5 w-5" /></div>
    <p className="font-semibold text-slate-300">{title}</p>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
    {actionLabel && onAction && <button className="primary-button mt-4" onClick={onAction}>{actionLabel}</button>}
  </div>;
}
