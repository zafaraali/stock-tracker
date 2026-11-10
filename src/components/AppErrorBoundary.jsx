import React from 'react';

export default class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    window.console.error('ApexFinance rendering error', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-state" role="alert">
        <h1>Something went wrong</h1>
        <p>Your saved data is still in this browser. Reload the app and export a backup if the problem continues.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload app</button>
      </main>
    );
  }
}
