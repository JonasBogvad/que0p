import { describe, it, expect, vi } from 'vitest';
import { createQueueState } from './queue.js';

describe('queue state', () => {
  it('starts closed with no activity timestamp', () => {
    const q = createQueueState();
    expect(q.isQueueOpen()).toBe(false);
    expect(q.getMode()).toBeNull();
    expect(q.getLastActivityAt()).toBeNull();
    expect(q.list()).toEqual([]);
  });

  it('notifies onChange for every mutation and open/close', () => {
    const onChange = vi.fn();
    const q = createQueueState(onChange);
    q.open('seq');
    q.join('a');
    q.join('b');
    q.leave('a');
    q.drawSequential();
    q.clear();
    q.close();
    expect(onChange).toHaveBeenCalledTimes(7);
    expect(typeof q.getLastActivityAt()).toBe('number');
  });

  it('does not notify on a rejected duplicate join or a no-op leave', () => {
    const onChange = vi.fn();
    const q = createQueueState(onChange);
    q.join('a');
    expect(q.join('a')).toBeNull();
    expect(q.leave('zzz')).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('restore applies a snapshot silently', () => {
    const onChange = vi.fn();
    const q = createQueueState(onChange);
    q.restore({ players: ['a', 'b'], open: true, mode: 'ran', lastActivityAt: 555 });
    expect(q.list()).toEqual(['a', 'b']);
    expect(q.has('b')).toBe(true);
    expect(q.isQueueOpen()).toBe(true);
    expect(q.getMode()).toBe('ran');
    expect(q.getLastActivityAt()).toBe(555);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('prepend puts players at the front, skips duplicates, and keeps lastActivityAt untouched', () => {
    const onChange = vi.fn();
    const q = createQueueState(onChange);
    q.restore({ players: ['x', 'y'], open: true, mode: 'seq', lastActivityAt: 10 });
    expect(q.prepend(['p', 'x', 'q', 'p'])).toEqual(['p', 'q']);
    expect(q.list()).toEqual(['p', 'q', 'x', 'y']);
    expect(q.getLastActivityAt()).toBe(10);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('prepend with nothing new is a no-op', () => {
    const onChange = vi.fn();
    const q = createQueueState(onChange);
    q.join('a');
    onChange.mockClear();
    expect(q.prepend(['a'])).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sequential draw honours the filter and removes the winner', () => {
    const q = createQueueState();
    ['a', 'b', 'c'].forEach(l => q.join(l));
    expect(q.drawSequential(l => l !== 'a')).toBe('b');
    expect(q.list()).toEqual(['a', 'c']);
  });
});
