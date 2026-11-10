import { it, expect } from 'vitest';
import { byValueThenName } from './chartOrdering';

it('orders chart slices and legend entries by value with a deterministic tie-break', () => {
  const entries = [{ name: 'ZZZ', value: 10 }, { name: 'AAA', value: 10 }, { name: 'Largest', value: 20 }];
  expect([...entries].sort(byValueThenName).map(item => item.name)).toEqual(['Largest', 'AAA', 'ZZZ']);
  expect(entries[0].name).toBe('ZZZ');
});
