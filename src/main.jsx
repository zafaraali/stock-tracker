/* global navigator */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './index.css'

window.history.scrollRestoration = 'manual';

function LaunchReady({ children }) {
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const delay = window.setTimeout(() => {
        const splash = document.getElementById('launch-screen');
        if (!splash) return;
        splash.classList.add('is-ready');
        splash.setAttribute('aria-hidden', 'true');
        splash.addEventListener('transitionend', () => splash.remove(), { once: true });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) splash.remove();
    }, 200);
    return () => window.clearTimeout(delay);
  }, []);
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LaunchReady><AppErrorBoundary>
      <App />
    </AppErrorBoundary></LaunchReady>
  </React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
