import { PREFERENCES_RESTORED } from '../services/backupPreferences';
import { useEffect, useState } from 'react';
import { usePreference } from '../hooks/usePreference';
import { BACKUP_EVENT, backupIsDue } from '../services/backupReminder';

export function useBackupReminder() {
  const [days, setDays] = usePreference('apex-backup-reminder-days', 0, [0, 7, 30, 90]);
  const read = () => { try { const value = JSON.parse(localStorage.getItem('apex-last-backup')); return Number.isFinite(value?.at) && ['drive', 'download'].includes(value.kind) ? value : null; } catch { return null; } };
  const [last, setLast] = useState(read);
  useEffect(() => {
    const update = () => setLast(read());
    window.addEventListener(BACKUP_EVENT, update); window.addEventListener('storage', update); window.addEventListener(PREFERENCES_RESTORED, update);
    return () => { window.removeEventListener(BACKUP_EVENT, update); window.removeEventListener('storage', update); window.removeEventListener(PREFERENCES_RESTORED, update); };
  }, []);
  return { days, setDays, last, due: backupIsDue(days, last) };
}

export function BackupReminder({ reminder }) {
  return <section className="rounded-xl border border-slate-800 p-3 mb-4"><label className="block">Quiet backup reminder<select className="field" value={reminder.days} onChange={event => reminder.setDays(Number(event.target.value))}><option value={0}>Off</option><option value={7}>Every 7 days</option><option value={30}>Every 30 days</option><option value={90}>Every 90 days</option></select></label><p className="supporting-text mt-2">{reminder.due ? 'Backup due. Save a copy when convenient.' : 'Opt-in only. Reminders appear in settings, never as popups.'}</p><p className="supporting-text">{reminder.last?.at ? `Last ${reminder.last.kind === 'drive' ? 'Google Drive backup completed' : 'file download initiated'}: ${new Date(reminder.last.at).toLocaleString()}.` : 'No backup recorded on this device yet.'} File downloads cannot be confirmed by the app; check your Downloads folder.</p></section>;
}
