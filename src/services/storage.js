export function readJSON(storage, key, fallback, validate = () => true, onError = () => {}) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    if (!validate(value)) throw new Error('Invalid saved data');
    return value;
  } catch {
    onError(`Could not load ${key}. Recovery data is shown; export it before replacing saved data.`);
    return fallback;
  }
}

export function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return '';
  } catch {
    return 'Could not save your changes in this browser. Export a JSON backup before closing the app.';
  }
}
// Access the browser storage getter inside the guarded operations as well.
export const browserStorage = {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value)
};

