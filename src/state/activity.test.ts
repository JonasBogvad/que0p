import { describe, it, expect } from 'vitest';
import { createActivityState } from './activity.js';

const MIN = 60_000;

describe('activity state', () => {
  it('gives unknown users the benefit of the doubt during the first window after boot', () => {
    let now = 1_000_000;
    const a = createActivityState(() => now);
    now += 5 * MIN;
    expect(a.isActive('stranger')).toBe(true);
    now += 6 * MIN;
    expect(a.isActive('stranger')).toBe(false);
  });

  it('tracks recorded users against the window', () => {
    let now = 1_000_000;
    const a = createActivityState(() => now);
    now += 30 * MIN;
    a.recordActivity('alice');
    expect(a.getLastActivity('alice')).toBe(now);
    now += 9 * MIN;
    expect(a.isActive('alice')).toBe(true);
    now += 2 * MIN;
    expect(a.isActive('alice')).toBe(false);
    expect(a.isActive('alice', 20 * MIN)).toBe(true);
  });
});
