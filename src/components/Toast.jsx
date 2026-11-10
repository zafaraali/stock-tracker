import React from 'react';

export function Toast({ message, onDismiss, onUndo }) {
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite">
    <span>{message}</span>
    {onUndo && <button type="button" className="secondary-button toast-undo" onClick={onUndo}>Undo</button>}
    <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button>
  </div>;
}
