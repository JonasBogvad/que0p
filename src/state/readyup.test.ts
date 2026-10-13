import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReadyupState } from './readyup.js';

const say = vi.fn();
beforeEach(() => { vi.useFakeTimers(); say.mockClear(); });
afterEach(() => { vi.useRealTimers(); });

describe('readyup state', () => {
  it('exposes the current winner and the rest as pending, and notifies onChange', () => {
    const onChange = vi.fn();
    const r = createReadyupState(onChange);
    r.startMultiReadyUp(['a', 'b', 'c'], () => {}, () => {}, say);
    expect(r.getPendingWinner()).toBe('a');
    expect(r.getPendingList()).toEqual(['b', 'c']);
    expect(onChange).toHaveBeenCalled();
  });

  it('notifies onChange on ready, skip, timeout and cancel', () => {
    const onChange = vi.fn();
    const lost = vi.fn();
    const ready = vi.fn();
    const r = createReadyupState(onChange);
    r.startMultiReadyUp(['a', 'b', 'c', 'd'], lost, ready, say);
    onChange.mockClear();

    expect(r.confirmReady('a', say)).toBe(true);
    expect(ready).toHaveBeenCalledWith('a');
    expect(onChange).toHaveBeenCalledTimes(1);

    r.skipCurrent(say);
    expect(lost).toHaveBeenCalledWith('b');
    expect(onChange).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(30_000);
    expect(lost).toHaveBeenCalledWith('c');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(r.getPendingWinner()).toBe('d');

    r.cancelAll();
    expect(r.getPendingWinner()).toBeNull();
    expect(r.getPendingList()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('ignores a ready from someone who is not the current winner', () => {
    const r = createReadyupState();
    r.startMultiReadyUp(['a', 'b'], () => {}, () => {}, say);
    expect(r.confirmReady('b', say)).toBe(false);
    expect(r.getPendingWinner()).toBe('a');
  });
});
