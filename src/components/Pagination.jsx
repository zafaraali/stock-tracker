export function Pagination({ page, pages, pageSize, total, onPageChange, onPageSizeChange, label }) {
  if (!total) return null;
  return <nav className="pagination no-print" aria-label={`${label} pagination`}>
    <p aria-live="polite">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} · Page {page} of {pages}</p>
    <label>Rows per page<select aria-label={`${label} rows per page`} value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{[20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
    <div><button className="secondary-button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button><button className="secondary-button" disabled={page === pages} onClick={() => onPageChange(page + 1)}>Next</button></div>
  </nav>;
}
