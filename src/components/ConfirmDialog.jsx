import React from 'react';
import { Modal } from './Modal';

export function ConfirmDialog({ title = 'Confirm action', message, confirmLabel = 'Continue', onConfirm, onCancel, danger = false }) {
  return <Modal title={title} onClose={onCancel}>
    <p className="text-sm text-slate-300 leading-6">{message}</p>
    <div className="flex justify-end gap-3 mt-6">
      <button className="secondary-button" onClick={onCancel}>Cancel</button>
      <button className={`primary-button ${danger ? 'bg-rose-600 hover:bg-rose-500' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Modal>;
}
