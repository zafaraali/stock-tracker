export const BACKUP_EVENT = 'apex-backup-recorded';
export function recordBackup(kind) {
  try { localStorage.setItem('apex-last-backup', JSON.stringify({ at: Date.now(), kind })); } catch { /* Backup works when preferences cannot be saved. */ }
  window.dispatchEvent(new window.Event(BACKUP_EVENT));
}

export function backupIsDue(days, last, now = Date.now()) {
  return days > 0 && (!Number.isFinite(last?.at) || now - last.at >= days * 86400000);
}
