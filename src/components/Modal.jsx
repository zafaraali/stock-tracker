import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

function prepareFormContent(nodes) {
  return Children.map(nodes, node => {
    if (!isValidElement(node)) return node;
    if (node.type === 'form') {
      const parts = Children.toArray(node.props.children);
      const actions = parts.at(-1);
      if (isValidElement(actions) && actions.type === 'div') {
        return cloneElement(node, { className: `${node.props.className || ''} modal-form` },
          <div className="modal-form-body">{parts.slice(0, -1)}</div>,
          cloneElement(actions, { className: `${actions.props.className || ''} modal-form-actions` }));
      }
    }
    return node.props.children ? cloneElement(node, {}, prepareFormContent(node.props.children)) : node;
  });
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const id = useId();
  const [fieldErrors, setFieldErrors] = useState([]);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    let invalidIndex = 0;
    let focusFrame = null;
    const invalid = event => {
      event.preventDefault();
      const control = event.target;
      if (!control.id) control.id = `${id}-invalid-${invalidIndex++}`;
      const errorId = `${control.id}-error`;
      control.setAttribute('aria-invalid', 'true');
      const descriptions = new Set((control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
      descriptions.add(errorId);
      control.setAttribute('aria-describedby', [...descriptions].join(' '));
      setFieldErrors(previous => [...previous.filter(error => error.id !== control.id), { id: control.id, errorId, control, message: control.validationMessage }]);
      if (focusFrame === null) focusFrame = window.requestAnimationFrame(() => {
        let ancestor = control.parentElement;
        while (ancestor && ancestor !== panel) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
        control.focus(); control.scrollIntoView({ block: 'nearest' }); focusFrame = null;
      });
    };
    const clearError = event => {
      const control = event.target;
      control.removeAttribute('aria-invalid');
      const descriptions = (control.getAttribute('aria-describedby') || '').split(' ').filter(value => value && value !== `${control.id}-error`);
      if (descriptions.length) control.setAttribute('aria-describedby', descriptions.join(' ')); else control.removeAttribute('aria-describedby');
      setFieldErrors(previous => previous.some(error => error.id === control.id) ? previous.filter(error => error.id !== control.id) : previous);
    };
    panel.addEventListener('invalid', invalid, true);
    panel.addEventListener('input', clearError);
    panel.addEventListener('change', clearError);
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
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      panel.removeEventListener('invalid', invalid, true);
      panel.removeEventListener('input', clearError);
      panel.removeEventListener('change', clearError);
      panel.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [id]);
  return createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className="modal-panel">
      <header className="flex items-center justify-between gap-4 mb-5"><h2 id={id} className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="icon-button"><X className="w-5 h-5" /></button></header>
      {prepareFormContent(children)}
      {fieldErrors.filter(error => error.control.isConnected).map(error => createPortal(<p id={error.errorId} className="field-error" role="alert">{error.message}</p>, error.control.closest('label') || error.control.parentElement, error.id))}
    </section>
  </div>, document.querySelector('.app-shell') || document.body);
}

export function FormError({ message }) {
  const errorRef = useRef(null);
  useEffect(() => { if (message) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'nearest' }); } }, [message]);
  return message ? <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">{message}</p> : null;
}
