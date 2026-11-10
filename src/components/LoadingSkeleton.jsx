import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSkeleton() {
  return <div role="status" aria-label="Loading view" aria-live="polite" className="view-loading">
    <Loader2 aria-hidden="true" className="w-7 h-7 animate-spin" />
    <p>Loading view…</p>
  </div>;
}
