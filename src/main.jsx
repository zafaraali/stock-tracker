/* global navigator */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './index.css'

function LaunchReady({ children }) {
  React.useEffect(() => {
    let second;
    let delay;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        delay = window.setTimeout(() => {
        const splash = document.getElementById('launch-screen');
        if (!splash) return;
        splash.classList.add('is-ready');
        splash.setAttribute('aria-hidden', 'true');
        splash.addEventListener('transitionend', () => splash.remove(), { once: true });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) splash.remove();
        }, 1000);
      });
    });
    return () => { window.cancelAnimationFrame(first); window.cancelAnimationFrame(second); window.clearTimeout(delay); };
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
