import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, RefreshCw, History } from 'lucide-react';

export function HoldingContextMenu({ item, x, y, onClose, onEdit, onPrice, onTransactions }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const menu = ref.current;
    const previous = document.activeElement;
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
    menu.querySelector('button')?.focus();
    const outside = event => { if (!menu.contains(event.target)) onClose(); };
    const dismiss = () => onClose();
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
      if (menu.contains(document.activeElement) && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [x, y, onClose]);
  return createPortal(<div ref={ref} role="menu" aria-label={`${item.symbol} actions`} className="holding-context-menu" style={{ left: x, top: y }} onKeyDown={event => {
    const buttons = [...ref.current.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}>
    <p>{item.symbol}</p>
    {[[Edit2, 'Edit holding', onEdit], [RefreshCw, 'Update price', onPrice], [History, 'View transactions', onTransactions]].map(([Icon, label, action]) => <button type="button" role="menuitem" key={label} onClick={() => { onClose(); action(); }}><Icon size={15} aria-hidden="true" /><span>{label}</span></button>)}
  </div>, document.querySelector('.app-shell') || document.body);
}
