import { withBackupPreferences, PREFERENCES_RESTORED } from '../services/backupPreferences';
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { requestBackupPassword } from './BackupPasswordDialog';
import { withBackupProgress } from '../services/backupProgress';
import { BackupReminder, useBackupReminder } from './BackupReminder';
import { recordBackup } from '../services/backupReminder';
import { TrendingUp, PieChart as PieIcon, ArrowDownUp, Sliders, History, Eye, EyeOff, Download, Upload, Sun, Moon, Monitor, Trash2, RefreshCw, Settings, CalendarDays, Activity, Menu, X } from 'lucide-react';
import { CURRENCY_RATES } from '../data/mockData';
import { downloadGoogleDriveBackup, downloadLatestGoogleDriveBackup, ENCRYPTED_DRIVE_BACKUP_PREFIX, isGoogleDriveConfigured, uploadGoogleDriveBackup } from '../services/googleDrive';
import { decryptBackup, encryptBackup } from '../services/encryptedBackup';
import { OverviewControls } from './OverviewControls';
import { formatMoney } from '../services/formatMoney';

const OPTIONAL_TABS = [['history', 'Transactions'], ['watchlist', 'Watchlist'], ['dividends', 'Dividends'], ['performance', 'Performance'], ['rebalance', 'Rebalance']];

export function Navbar({ viewDensity = 'default', setViewDensity, reducedMotionPreference = 'system', setReducedMotionPreference, privateMode, onTogglePrivacy, activeTab, setActiveTab, portfolioSummary, currency, setCurrency, theme, themePreference = 'dark', setThemePreference, toggleTheme, accent, setAccent, overviewLayout, setOverviewLayout, exportJSON, exportEncryptedJSON, backupPayload, restoreJSONBackup, exportCSV, exportAllCSV, importJSON, importEncryptedJSON, importCSV, accounts = [], selectedAccountId, setSelectedAccountId, addAccount, renameAccount, deleteAccount, onDeleteAllData, refreshMarketData, marketStatus }) {
  const [hiddenTabs, setHiddenTabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('apex-hidden-tabs'));
      return Array.isArray(saved) ? saved.filter(tab => OPTIONAL_TABS.some(([key]) => key === tab)) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('apex-hidden-tabs', JSON.stringify(hiddenTabs)); } catch { /* Preference works in memory. */ }
  }, [hiddenTabs]);
  const reminder = useBackupReminder();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState('appearance');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [driveStatus, setDriveStatus] = useState('');
  const [driveBusy, setDriveBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopControlsOpen, setDesktopControlsOpen] = useState(true);
  const [themePulse, setThemePulse] = useState(false);
  const [refreshPulse, setRefreshPulse] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState('');
  useEffect(() => {
    const restore = event => {
      if (Object.hasOwn(event.detail, 'apex-hidden-tabs')) setHiddenTabs(event.detail['apex-hidden-tabs']);
      if (Object.hasOwn(event.detail, 'apex-desktop-controls')) setDesktopControlsOpen(event.detail['apex-desktop-controls']);
    };
    window.addEventListener(PREFERENCES_RESTORED, restore);
    return () => window.removeEventListener(PREFERENCES_RESTORED, restore);
  }, []);
  const drawerRef = useRef(null);
  const shortcutsRef = useRef(null);
  const isLight = theme === 'light';

  useEffect(() => {
    const closeShortcuts = event => {
      if (shortcutsRef.current?.open && !shortcutsRef.current.contains(event.target)) shortcutsRef.current.open = false;
    };
    document.addEventListener('pointerdown', closeShortcuts);
    return () => document.removeEventListener('pointerdown', closeShortcuts);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('apex-desktop-controls', String(desktopControlsOpen)); } catch { /* Controls still work when storage is unavailable. */ }
  }, [desktopControlsOpen]);

  useEffect(() => {
    const handleShortcut = event => {
      const target = event.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) return;
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setDesktopControlsOpen(open => !open);
        showPreferenceNotice(desktopControlsOpen ? 'Portfolio controls hidden.' : 'Portfolio controls shown.');
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [desktopControlsOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const panel = drawerRef.current;
    panel?.querySelector('button')?.focus();
    const handleEscape = event => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button, a[href], input, select')].filter(el => !el.disabled);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const breakpoint = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = event => { if (event.matches) setMobileMenuOpen(false); };
    breakpoint.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      breakpoint.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mobileMenuOpen]);

  const handleSectionLink = (event, tab, mobile = false) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (mobile) navigateFromMobileMenu(tab);
    else setActiveTab(tab);
  };

  const navigateFromMobileMenu = tab => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleAppInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') setInstallPrompt(null);
  };

  const handleThemeToggle = () => {
    setThemePulse(true);
    toggleTheme();
    window.setTimeout(() => setThemePulse(false), 420);
  };

  const handleRefresh = () => {
    setRefreshPulse(true);
    refreshMarketData();
    window.setTimeout(() => setRefreshPulse(false), 520);
  };

  const showPreferenceNotice = message => {
    setPreferenceNotice(message);
    window.setTimeout(() => setPreferenceNotice(''), 1800);
  };

  const backupToDrive = async () => {
    if (driveBusy) return;
    setDriveBusy(true);
    setDriveStatus('Backing up…');
    try {
      await withBackupProgress('Uploading backup…', () => uploadGoogleDriveBackup(withBackupPreferences(backupPayload)));
      setDriveStatus('Backup saved to Google Drive.');
      recordBackup('drive');
    } catch (error) {
      setDriveStatus(error.message);
    } finally {
      setDriveBusy(false);
    }
  };

  const restoreFromDrive = async () => {
    if (driveBusy) return;
    setDriveBusy(true);
    setDriveStatus('Loading backup…');
    try {
      const payload = await withBackupProgress('Downloading backup…', () => downloadGoogleDriveBackup());
      restoreJSONBackup(payload);
      setDriveStatus('Restore awaiting confirmation. Review the backup preview; your data has not changed.');
    } catch (error) {
      setDriveStatus(error.message);
    } finally {
      setDriveBusy(false);
    }
  };

  const backupEncryptedToDrive = async () => {
    if (driveBusy) return;
    const password = await requestBackupPassword({ confirm: true });
    if (!password) return;
    setDriveBusy(true);
    setDriveStatus('Encrypting and backing up…');
    try {
      const envelope = await withBackupProgress('Encrypting backup…', () => encryptBackup(withBackupPreferences(backupPayload), password));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await withBackupProgress('Uploading encrypted backup…', () => uploadGoogleDriveBackup(JSON.parse(envelope), `${ENCRYPTED_DRIVE_BACKUP_PREFIX} ${timestamp}.json`));
      setDriveStatus('Encrypted backup saved to Google Drive.');
      recordBackup('drive');
    } catch (error) { setDriveStatus(error.message); }
    finally { setDriveBusy(false); }
  };

  const restoreEncryptedFromDrive = async () => {
    if (driveBusy) return;
    const password = await requestBackupPassword();
    if (!password) return;
    setDriveBusy(true);
    setDriveStatus('Loading encrypted backup…');
    try {
      const envelope = await withBackupProgress('Downloading encrypted backup…', () => downloadLatestGoogleDriveBackup(ENCRYPTED_DRIVE_BACKUP_PREFIX));
      restoreJSONBackup(await withBackupProgress('Decrypting backup…', () => decryptBackup(JSON.stringify(envelope), password)));
      setDriveStatus('Encrypted restore awaiting confirmation. Review the backup preview; your data has not changed.');
    } catch (error) { setDriveStatus(error.message); }
    finally { setDriveBusy(false); }
  };

  const renderControls = () => <>
          <select
            aria-label="Display currency"
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); showPreferenceNotice(`Display currency changed to ${e.target.value}.`); }}
            className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'} text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border`}
          >
            {Object.keys(CURRENCY_RATES).sort((a, b) => a.localeCompare(b)).map(code => (
              <option key={code} value={code}>
                {code} ({CURRENCY_RATES[code].symbol})
              </option>
            ))}
          </select>
          <select
            aria-label="Holdings list"
            title="Select holdings list"
            value={selectedAccountId}
            onChange={e => { setSelectedAccountId(e.target.value); showPreferenceNotice('Holdings list changed.'); }}
            className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'} text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border max-w-36`}
          >
            <option value="__combined__">Combined</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>

          {/* Theme Toggle Button */}
          <button
            onClick={handleRefresh}
            disabled={marketStatus?.loading}
            title="Refresh live market prices"
            aria-label="Refresh live market prices"
            className={`refresh-market-button p-2 rounded-xl text-xs font-medium transition border ${refreshPulse ? 'refresh-pulse' : ''} ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${marketStatus?.loading ? 'animate-spin' : ''}`} /><kbd className="shortcut-hint">R</kbd>
          </button>
          <button
            aria-label={`Current theme: ${themePreference === 'system' ? 'Match device' : isLight ? 'Light' : 'Dark'}. Switch to ${themePreference === 'system' ? 'Dark' : isLight ? 'Match device' : 'Light'} mode`}
            onClick={handleThemeToggle}
            title={`Current: ${themePreference === 'system' ? 'Match device' : isLight ? 'Light' : 'Dark'} · Switch to ${themePreference === 'system' ? 'Dark' : isLight ? 'Match device' : 'Light'}`}
            className={`theme-toggle-button p-2 rounded-xl text-xs font-medium transition border ${themePulse ? 'theme-toggle-pulse' : ''} ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'}`}
          >
            <span className="theme-toggle-icon inline-flex">{themePreference === 'system' ? <Monitor className="w-5 h-5 text-indigo-400" /> : isLight ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-300" />}</span>
          </button>

          {installPrompt && <button aria-label="Install ApexFinance app" title="Install ApexFinance app" onClick={installApp} className="icon-button"><Download className="w-5 h-5" /></button>}
          <button aria-label={reminder.due ? 'Open settings · Backup due' : 'Open settings'} onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }} className="icon-button"><Settings className="w-5 h-5" />{reminder.due && <span className="backup-due-dot" aria-hidden="true" />}</button>
          <details ref={shortcutsRef} className="keyboard-shortcuts">
            <summary className="secondary-button" aria-label="Show keyboard shortcuts">? <span className="shortcut-label">Shortcuts</span></summary>
            <div className="keyboard-shortcuts-popover" role="note">
              <p><kbd>R</kbd><span>Refresh prices</span></p>
              <p><kbd>H</kbd><span>Open help</span></p>
              <p><kbd>C</kbd><span>Toggle controls</span></p>
              <p><kbd>1</kbd><span>Dashboard</span></p>
              <p><kbd>2</kbd><span>Holdings</span></p>
              <p><kbd>3</kbd><span>Transactions</span></p>
              <p><kbd>4</kbd><span>Watchlist</span></p>
              <p><kbd>5</kbd><span>Dividends</span></p>
              <p><kbd>6</kbd><span>Performance</span></p>
              <p><kbd>7</kbd><span>Rebalance</span></p>
            </div>
          </details>
          {preferenceNotice && <span className="preference-notice" role="status" aria-live="polite">{preferenceNotice}</span>}
</>;

  return (
    <nav className={`no-print ${isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-100'} border-b sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors duration-200`}>
      <div className="navbar-top-row max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <button aria-label="Go to dashboard" className="flex items-center gap-2 cursor-pointer" aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}>
          <div className="brand-logo p-2 rounded-xl text-white shadow-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className={`font-bold text-lg tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Apex<span className="brand-accent">Finance</span>
          </span>
        </button>

        <button type="button" className={`navbar-privacy icon-button ${privateMode ? 'privacy-active' : ''}`} aria-label={privateMode ? 'Show balances' : 'Hide balances'} title={privateMode ? 'Privacy on · Show balances' : 'Hide balances'} aria-pressed={privateMode} onClick={onTogglePrivacy}>{privateMode ? <EyeOff aria-hidden="true" className="w-5 h-5" /> : <Eye aria-hidden="true" className="w-5 h-5" />}</button>
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setMobileMenuOpen(open => !open)}
          className={`lg:hidden icon-button ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop & Tablet Tabs */}
        <div className={`desktop-section-links hidden lg:flex items-center gap-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'} p-1 rounded-xl border`}>
          <a href="#/dashboard"
            aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <PieIcon className="w-4 h-4" /> Dashboard
          </a>
          <a href="#/holdings"
            aria-current={activeTab === 'holdings' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'holdings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'holdings' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`
            }`}
          >
            <ArrowDownUp className="w-4 h-4" /> Holdings
          </a>
          {!hiddenTabs.includes('history') && (<a href="#/history" aria-current={activeTab === 'history' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}`}><History className="w-4 h-4" /> Transactions</a>)}
          {!hiddenTabs.includes('watchlist') && (<a href="#/watchlist" aria-current={activeTab === 'watchlist' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'watchlist')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'watchlist' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}`}><Eye className="w-4 h-4" /> Watchlist</a>)}
          {!hiddenTabs.includes('dividends') && (<a href="#/dividends" aria-current={activeTab === 'dividends' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'dividends')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dividends' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}`}><CalendarDays className="w-4 h-4" /> Dividends</a>)}
          {!hiddenTabs.includes('performance') && (<a href="#/performance" aria-current={activeTab === 'performance' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'performance')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'performance' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}`}><Activity className="w-4 h-4" /> Performance</a>)}
          {!hiddenTabs.includes('rebalance') && (<a href="#/rebalance" aria-current={activeTab === 'rebalance' ? 'page' : undefined} onClick={event => handleSectionLink(event, 'rebalance')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'rebalance' ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}`}><Sliders className="w-4 h-4" /> Rebalance</a>)}
        </div>

        {/* Actions & Currency & Theme Toggle */}
        <button type="button" className="desktop-controls-toggle secondary-button hidden lg:inline-flex" aria-expanded={desktopControlsOpen} aria-controls="desktop-portfolio-controls" onClick={() => setDesktopControlsOpen(open => !open)}>
          <Sliders className="w-4 h-4" /> {desktopControlsOpen ? 'Hide controls' : 'Portfolio controls'}
        </button>
        <div id="desktop-portfolio-controls" className={`navbar-actions ${desktopControlsOpen ? 'hidden lg:flex' : 'hidden'} items-center gap-2.5 flex-wrap justify-start w-full border-t border-slate-800 pt-3`}>
          {renderControls()}
        </div>
          {settingsOpen && <Modal title="Settings & data" onClose={() => setSettingsOpen(false)}>
            <p className="text-sm text-slate-400 mb-5">Your holdings, transactions, watchlist, settings, and snapshots stay in this browser's local storage. Keep an encrypted or otherwise secure copy of exported backups.</p>
            <nav className="settings-category-nav settings-category-nav-sticky" aria-label="Settings categories">
              {[['app', 'App'], ['appearance', 'Appearance'], ['lists', 'Holdings lists'], ['data', 'Data']].map(([key, label]) => <button type="button" key={key} aria-pressed={settingsSection === key} aria-controls={`settings-${key}-panel`} onClick={() => setSettingsSection(key)}>{label}</button>)}
            </nav>
            <section id="settings-app-panel" aria-labelledby="settings-app-title" className="settings-category-panel" hidden={settingsSection !== 'app'}>
              <h3 id="settings-app-title" className="section-title">App</h3>
              <p className="supporting-text mb-3">Privacy mode hides displayed amounts and quantities for screen sharing. It does not encrypt data, redact notes, or change backup contents. Turn it off before printing financial reports.</p>
              <p className="supporting-text mb-3">Install ApexFinance for quick access from your device.</p>
              {installPrompt ? <button type="button" onClick={installApp} className="primary-button"><Download className="w-4 h-4" /> Install ApexFinance app</button> : <p className="supporting-text">If installation is available, you can also find it in your browser’s menu. An installed app can be opened from your device.</p>}
            </section>
            <section id="settings-appearance-panel" aria-labelledby="settings-appearance-title" className="settings-category-panel" hidden={settingsSection !== 'appearance'}>
              <h3 id="settings-appearance-title" className="section-title">Appearance</h3>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 p-3 text-sm"><span><strong className="block">Accent color</strong><small className="text-slate-500">Choose the highlight color used throughout the app.</small></span><select aria-label="Accent color" value={accent} onChange={event => setAccent(event.target.value)} className="field mt-0 w-auto"><option value="green">Green (default)</option><option value="red">Red</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="blue">Blue</option><option value="indigo">Indigo</option><option value="violet">Violet</option></select></label>
              <label className="settings-theme-control"><span><strong className="block">View density</strong><small className="text-slate-500">Compact reduces vertical spacing so more fits on screen.</small></span><select aria-label="View density" value={viewDensity} onChange={event => setViewDensity(event.target.value)} className="field mt-0 w-auto"><option value="default">Default</option><option value="compact">Compact</option></select></label>
              <label className="settings-theme-control"><span><strong className="block">Motion</strong><small className="supporting-text">Choose whether animations follow your device accessibility preference.</small></span><select aria-label="Motion" value={reducedMotionPreference} onChange={event => setReducedMotionPreference?.(event.target.value)} className="field mt-0 w-auto"><option value="system">Follow device</option><option value="off">Animations on</option><option value="on">Reduce motion</option></select></label>
              <fieldset className="settings-tab-options"><legend className="font-semibold">Navigation tabs</legend><p className="supporting-text">Choose which tabs appear in the top bar and mobile menu.</p>
                {['Dashboard', 'Holdings'].map(label => <label key={label} className="settings-tab-option"><span>{label}<small>Always shown</small></span><input type="checkbox" checked disabled aria-label={`Show ${label} tab`} /></label>)}
                {OPTIONAL_TABS.map(([key, label]) => <label key={key} className="settings-tab-option"><span>{label}</span><input type="checkbox" aria-label={`Show ${label} tab`} checked={!hiddenTabs.includes(key)} onChange={event => {
                  const visible = event.target.checked;
                  setHiddenTabs(previous => visible ? previous.filter(tab => tab !== key) : [...previous, key]);
                  if (!visible && activeTab === key) setActiveTab('dashboard');
                }} /></label>)}
              </fieldset>
              <label className="settings-theme-control"><span><strong className="block">Theme</strong><small className="supporting-text">Current appearance: {themePreference === 'system' ? `Match device (${isLight ? 'Light' : 'Dark'})` : isLight ? 'Light' : 'Dark'}</small></span><select aria-label="Theme" value={themePreference} onChange={event => setThemePreference?.(event.target.value)} className="field mt-0 w-auto"><option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
              <div className="settings-theme-control settings-overview-control"><div><strong>Portfolio overview</strong><p className="supporting-text">Choose which overview sections are shown and how they are ordered.</p></div><OverviewControls layout={overviewLayout} onChange={setOverviewLayout} /></div>
            </section>
            <section id="settings-lists-panel" aria-labelledby="settings-lists-title" className="settings-category-panel" hidden={settingsSection !== 'lists'}>
              <h3 id="settings-lists-title" className="section-title">Holdings lists</h3>
              <div className="rounded-xl border border-slate-800 p-3">
                <p className="text-xs text-slate-500 mb-3">Create separate named lists and switch between them with the selector.</p>
                <div className="space-y-2 mb-3">{accounts.map(account => <div key={account.id} className="flex items-center gap-2"><span className="text-sm flex-1">{account.name}</span><button className="secondary-button" onClick={() => { const next = window.prompt('Rename list', account.name); if (next) renameAccount(account.id, next); }}>Rename</button><button className="danger-button secondary-button text-rose-400" onClick={() => { if (window.confirm(`Delete the ${account.name} list and its holdings?`)) deleteAccount(account.id); }}>Delete</button></div>)}</div>
                <div className="flex gap-2"><input aria-label="New holdings list name" className="field" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g. Retirement" /><button className="primary-button" onClick={() => { addAccount(newAccountName); setNewAccountName(''); }}>Add list</button></div>
              </div>

            </section>
            <section id="settings-data-panel" aria-labelledby="settings-data-title" className="settings-category-panel" hidden={settingsSection !== 'data'}>
              <BackupReminder reminder={reminder} />
              <h3 id="settings-data-title" className="section-title">Everyday data tools</h3><p className="supporting-text">Save copies, export spreadsheets, or add holdings from CSV. Recovery and deletion are grouped below.</p>
              <div className="rounded-xl border border-slate-800 p-3">
                <p className="text-sm font-semibold mb-1">Google Drive backup</p>
                <p className="text-xs text-slate-500 mb-3">{isGoogleDriveConfigured() ? 'Save or restore your complete portfolio backup from Google Drive.' : 'Add VITE_GOOGLE_CLIENT_ID to enable Google Drive backup.'}</p>
                {isGoogleDriveConfigured() && <div className="drive-action-groups">
                  <div><h4>Back up</h4><div className="settings-action-pair"><button type="button" className="primary-button" disabled={driveBusy} onClick={backupToDrive}>Back up to Drive</button><button type="button" className="primary-button" disabled={driveBusy} onClick={backupEncryptedToDrive}>Encrypted backup</button></div></div>

                </div>}
                {driveStatus && <p className={`text-xs mt-2 ${/saved|started|awaiting confirmation/i.test(driveStatus) ? 'drive-status-success' : 'text-slate-400'}`} role="status">{driveStatus}</p>}
              </div>
              <section className="settings-file-group"><h4>Download backup</h4><p>Complete portfolio and settings as a JSON file.</p><div className="settings-file-actions">
              <button className="secondary-button" onClick={exportJSON}><Download className="w-4 h-4" /> Download complete JSON backup</button>
              <button className="secondary-button" onClick={exportEncryptedJSON}><Download className="w-4 h-4" /> Download encrypted backup</button>
</div></section>
              <section className="settings-file-group"><h4>Export CSV</h4><p>Download holdings for a spreadsheet or another tool.</p><div className="settings-file-actions">
              <button className="secondary-button" onClick={exportCSV}><Download className="w-4 h-4" /> Export current list CSV</button>
              <button className="secondary-button" onClick={exportAllCSV}><Download className="w-4 h-4" /> Export all lists CSV</button>
</div></section>
              <section className="settings-file-group"><h4>Import CSV</h4><p>Add holdings from a broker or spreadsheet file.</p><div className="settings-file-actions">
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Import holdings CSV<input aria-label="Choose holdings CSV" type="file" accept=".csv,text/csv" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importCSV(event); setSettingsOpen(false); }} /></label>
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Import all lists CSV<input aria-label="Choose all lists CSV" type="file" accept=".csv,text/csv" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importCSV(event); setSettingsOpen(false); }} /></label>
</div></section>

            <details className="recovery-tools"><summary>Recovery & deletion</summary><div className="recovery-tools-body"><p className="supporting-text">Restore actions can replace your portfolio. Review the backup before confirming. Export a copy of your current data first.</p>
              {isGoogleDriveConfigured() && <section className="settings-file-group"><h4>Restore from Google Drive</h4><div className="settings-action-pair"><button type="button" className="secondary-button" disabled={driveBusy} onClick={restoreFromDrive}>Restore from Drive</button><button type="button" className="secondary-button" disabled={driveBusy} onClick={restoreEncryptedFromDrive}>Restore encrypted</button></div>{driveStatus && <p className="supporting-text" role="status">{driveStatus}</p>}</section>}
              <section className="settings-file-group"><h4>Restore backup</h4><p>Review a saved JSON backup before replacing your portfolio.</p><div className="settings-file-actions">
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Restore JSON backup<input aria-label="Choose JSON backup" type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importJSON(event); setSettingsOpen(false); }} /></label>
              <label className="secondary-button cursor-pointer relative"><Upload className="w-4 h-4" /> Restore encrypted backup<input aria-label="Choose encrypted backup" type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={event => { importEncryptedJSON(event); setSettingsOpen(false); }} /></label>
</div></section>
            <div className="mt-6 pt-5 border-t border-slate-800">
              <h3 className="section-title mb-2">Delete portfolio data</h3><p className="text-sm text-slate-400 mb-3">Permanently clear this browser’s portfolio. Export a backup first.</p>
              <button className="danger-button secondary-button text-rose-400" onClick={onDeleteAllData}><Trash2 className="w-4 h-4" /> Delete all saved data</button>
            </div>
            </div></details>
            </section>
          </Modal>}

      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && <div className="lg:hidden fixed inset-0 z-50" role="presentation">
        <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 w-full h-full bg-slate-950/60 backdrop-blur-sm" />
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          id="mobile-navigation-drawer"
          aria-label="Mobile navigation"
          className={`relative ml-auto h-full w-[min(86vw,22rem)] overflow-y-auto border-l p-5 shadow-2xl ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}
        >
          <div className="mobile-drawer-header flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[.18em] text-slate-500">Navigation</p>
              <p className="text-lg font-semibold">ApexFinance</p>
            </div>
            <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="icon-button"><X className="w-5 h-5" /></button>
          </div>
          <p className="drawer-current-page">Current page: <strong>{({ dashboard: 'Dashboard', holdings: 'Holdings', history: 'Transactions', watchlist: 'Watchlist', dividends: 'Dividends', performance: 'Performance', rebalance: 'Rebalance', help: 'Help' })[activeTab]}</strong></p>
          {portfolioSummary && <div className="drawer-portfolio-summary" aria-label="Portfolio summary"><div><span>Portfolio</span><strong>{formatMoney(portfolioSummary.totalValue || 0, currency)}</strong></div><div><span>Cash</span><strong>{formatMoney(portfolioSummary.cashValue || 0, currency)}</strong></div></div>}
          <div className="mobile-drawer-nav grid gap-2" aria-label="Primary sections">
            {[
              ["dashboard", "Dashboard", PieIcon],
              ["holdings", "Holdings", ArrowDownUp],
              ["history", "Transactions", History],
              ["watchlist", "Watchlist", Eye],
              ["dividends", "Dividends", CalendarDays],
              ["performance", "Performance", Activity],
              ["rebalance", "Rebalance", Sliders],
            ].filter(([tab]) => !hiddenTabs.includes(tab)).map(([tab, label, Icon]) => (
              <a
                href={`#/${tab}`}
                key={tab}
                aria-current={activeTab === tab ? 'page' : undefined}
                onClick={event => handleSectionLink(event, tab, true)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : `${isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'}`}`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
                {activeTab === tab && <span className="ml-auto text-xs font-medium opacity-80">Current</span>}
              </a>
            ))}
          </div>
          <div className="drawer-controls mt-6 border-t border-slate-800 pt-5"><p className="text-xs uppercase tracking-[.18em] text-slate-500 mb-2">Controls</p><h2 className="section-title mb-3">Portfolio controls</h2>{renderControls()}</div>
        </aside>
      </div>}
    </nav>
  );
}
