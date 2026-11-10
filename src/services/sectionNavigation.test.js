import { expect, it } from 'vitest';
import { sectionFromHash } from './sectionNavigation';

it('recognizes shareable sections without treating anchor targets as pages', () => {
  expect(sectionFromHash('#/holdings')).toBe('holdings');
  expect(sectionFromHash('#performance')).toBe('performance');
  expect(sectionFromHash('#main-content')).toBeNull();
  expect(sectionFromHash('#/unknown')).toBeNull();
});
