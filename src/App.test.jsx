import { afterEach, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

it('renders the app with an empty browser store', () => {
  vi.stubGlobal('localStorage', { getItem: () => null });
  const html = renderToString(<App />);
  expect(html).toContain('Start empty');
  expect(html).toContain('Explore demo');
  expect(html).not.toContain('Apple Inc.');
});

it('renders recovery instructions when browser storage cannot be accessed', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Storage disabled'); } });
  const html = renderToString(<App />);
  expect(html).toContain('role="alert"');
  expect(html).toContain('Replace saved data with recovered portfolio');
});
