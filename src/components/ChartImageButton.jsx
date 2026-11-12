import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export function ChartImageButton({ label, disabled, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <span className="chart-image-control no-print">
    <button type="button" className="icon-button" aria-label={`Save ${label} as image`} title="Save as PNG image" disabled={disabled || saving} aria-busy={saving} onClick={async () => {
      setSaving(true); setError('');
      try { await onSave(); } catch (error) { setError(error.message || 'Could not save the image. Please try again.'); }
      finally { setSaving(false); }
    }}><ImageIcon size={18} aria-hidden="true" /></button>
    {error && <span className="chart-image-error" role="alert">{error}</span>}
  </span>;
}
