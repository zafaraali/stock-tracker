import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSkeleton({ variant = 'view' }) {
  if (variant === 'dashboard') return <div role="status" aria-label="Loading dashboard" aria-live="polite" className="dashboard-loading-skeleton">
    <Loader2 aria-hidden="true" className="w-7 h-7 animate-spin" />
    <div className="dashboard-loading-grid" aria-hidden="true"><span /><span /><span /><span /></div>
    <p>Loading portfolio dashboard…</p>
  </div>;
  return <div role="status" aria-label="Loading view" aria-live="polite" className="view-loading">
    <Loader2 aria-hidden="true" className="w-7 h-7 animate-spin" />
    <p>Loading view…</p>
  </div>;
}
