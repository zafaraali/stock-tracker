import React from 'react';

export function Toast({ message, onDismiss, onUndo }) {
  if (!message) return null;
  const normalized = message.toLowerCase();
  const tone = /error|failed|unable|invalid|could not/.test(normalized) ? 'error' : /warning|stale|unavailable|discard/.test(normalized) ? 'warning' : 'success';
  const isError = tone === 'error';
  return <div className={`toast toast-${tone}`} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
    <span>{message}</span>
    {onUndo && <button type="button" className="secondary-button toast-undo" onClick={onUndo}>Undo</button>}
    <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button>
  </div>;
}
