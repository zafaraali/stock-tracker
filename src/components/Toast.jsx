import React from 'react';

export function Toast({ message, onDismiss }) {
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite">
    <span>{message}</span>
    <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button>
  </div>;
}
