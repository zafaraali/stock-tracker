let busy = false;

export async function withBackupProgress(label, operation) {
  if (busy) throw new Error('A backup operation is already in progress.');
  busy = true;
  const dialog = document.createElement('dialog');
  dialog.className = 'backup-password-dialog';
  const app = document.querySelector('.app-shell');
  if (app) for (const name of ['--surface', '--foreground', '--border']) dialog.style.setProperty(name, window.getComputedStyle(app).getPropertyValue(name));
  dialog.setAttribute('aria-label', label);
  dialog.setAttribute('aria-busy', 'true');
  const text = document.createElement('p');
  text.setAttribute('role', 'status');
  text.textContent = label;
  dialog.append(text);
  dialog.addEventListener('cancel', event => event.preventDefault());
  document.body.append(dialog);
  dialog.showModal();
  try { return await operation(); }
  finally { dialog.close(); dialog.remove(); busy = false; }
}
