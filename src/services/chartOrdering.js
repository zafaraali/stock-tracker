export const byValueThenName = (a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name));
