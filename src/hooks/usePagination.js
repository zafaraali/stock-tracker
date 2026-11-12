import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export function usePagination(items, resetKey, pageSize = 10) {
  const [selection, setSelection] = useState({ key: resetKey, page: 1 });
  const [printing, setPrinting] = useState(false);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.key === resetKey ? Math.min(selection.page, pages) : 1;
  if (selection.key !== resetKey || selection.page > pages) setSelection({ key: resetKey, page });
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);
  return {
    page, pages, pageSize,
    setPage: next => setSelection({ key: resetKey, page: Math.max(1, Math.min(next, pages)) }),
    pageItems: printing ? items : items.slice((page - 1) * pageSize, page * pageSize),
  };
}
