import React from 'react';

export function LoadingSkeleton() {
  return <div role="status" aria-label="Loading view" className="space-y-4 animate-pulse">
    <span className="sr-only">Loading view</span>
    <div className="h-24 rounded-2xl bg-slate-800/70" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="h-40 rounded-2xl bg-slate-800/70" /><div className="h-40 rounded-2xl bg-slate-800/70" /></div>
    <div className="h-56 rounded-2xl bg-slate-800/70" />
  </div>;
}
