import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    panel.querySelectorAll('label').forEach((label, index) => {
      const input = label.querySelector('input,select,textarea') || label.parentElement.querySelector('input,select,textarea');
      if (input && !label.control) {
        if (!input.id) input.id = `${id}-field-${index}`;
        label.htmlFor = input.id;
      }
    });
    const controls = () => [...panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    (controls().find(el => el.tagName !== 'BUTTON') || panel).focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key === 'Tab') {
        const items = controls();
        const first = items[0], last = items.at(-1);
        if (!items.length) { event.preventDefault(); panel.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener('keydown', keydown);
    return () => {
      panel.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [id]);
  return createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className="modal-panel">
      <header className="flex items-center justify-between gap-4 mb-5"><h2 id={id} className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="icon-button"><X className="w-5 h-5" /></button></header>
      {children}
    </section>
  </div>, document.querySelector('.app-shell') || document.body);
}

export function FormError({ message }) {
  return message ? <p role="alert" className="form-error">{message}</p> : null;
}
