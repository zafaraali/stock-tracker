import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Eye, EyeOff } from 'lucide-react';

function PasswordForm({ confirm, onFinish }) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  return <form onSubmit={event => {
    event.preventDefault();
    if (confirm && password !== confirmation) { setError('Passwords did not match.'); return; }
    onFinish(password);
  }} className="space-y-4">
    <h2 id="backup-password-title" className="text-xl font-bold">{confirm ? 'Encrypt backup' : 'Unlock encrypted backup'}</h2>
    <p className="text-sm text-slate-400">{confirm ? 'Use at least 8 characters. This password cannot be recovered if forgotten.' : 'Enter the password used to encrypt this backup.'}</p>
    <label className="block">Encryption password
      <div className="flex items-center gap-2 mt-2">
        <input autoFocus required minLength={confirm ? 8 : undefined} type={visible ? 'text' : 'password'} autoComplete={confirm ? 'new-password' : 'current-password'} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} className="form-input min-w-0 flex-1" />
        <button type="button" className="icon-button shrink-0" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff aria-hidden="true" className="w-5 h-5" /> : <Eye aria-hidden="true" className="w-5 h-5" />}</button>
      </div>
    </label>
    {confirm && <label className="block">Confirm password<input required minLength={8} type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={event => { setConfirmation(event.target.value); setError(''); }} className="form-input block w-full mt-2" /></label>}
    {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => onFinish(null)}>Cancel</button><button type="submit" className="primary-button">Continue</button></div>
  </form>;
}

export function requestBackupPassword({ confirm = false } = {}) {
  return new Promise(resolve => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'backup-password-dialog app-shell';
    const app = document.querySelector('.app-shell');
    if (app?.classList.contains('theme-light')) dialog.classList.add('theme-light');
    if (app) for (const name of ['--accent', '--accent-text', '--surface', '--surface-muted', '--surface-raised', '--border', '--foreground', '--muted']) dialog.style.setProperty(name, window.getComputedStyle(app).getPropertyValue(name));
    dialog.style.colorScheme = app?.classList.contains('theme-light') ? 'light' : 'dark';
    dialog.setAttribute('aria-labelledby', 'backup-password-title');
    document.body.append(dialog);
    const root = createRoot(dialog);
    const finish = value => {
      dialog.close();
      root.unmount();
      dialog.remove();
      previous?.focus();
      resolve(value);
    };
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    root.render(<PasswordForm confirm={confirm} onFinish={finish} />);
    dialog.showModal();
  });
}
