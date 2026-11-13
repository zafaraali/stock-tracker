import React from 'react';

export function EmptyState({ title, description, actionLabel, onAction, compact = false }) {
  return <div className={`empty-state ${compact ? 'compact py-8' : 'py-12'} px-4 text-center`}>
    <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg">＋</div>
    <p className="font-semibold text-slate-300">{title}</p>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
    {actionLabel && onAction && <button className="primary-button mt-4" onClick={onAction}>{actionLabel}</button>}
  </div>;
}
