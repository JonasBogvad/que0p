import type { QueueMode } from './channelStore.js';

export interface QueueRestoreData {
  players: string[];
  open: boolean;
  mode: QueueMode | null;
  lastActivityAt: number | null;
}

export interface QueueState {
  /** Apply persisted state without notifying onChange. */
  restore(data: QueueRestoreData): void;
  join(login: string): number | null;
  leave(login: string): boolean;
  /** Put players at the front (e.g. after a restart interrupted their ready-up). Returns those actually added. */
  prepend(logins: string[]): string[];
  drawSequential(filterFn?: (login: string) => boolean): string | null;
  drawRandom(filterFn?: (login: string) => boolean): string | null;
  list(): string[];
  size(): number;
  clear(): void;
  has(login: string): boolean;
  open(mode: QueueMode): void;
  close(): void;
  isQueueOpen(): boolean;
  getMode(): QueueMode | null;
  /** Epoch ms of the last open/join/leave/draw, or null if the queue has never been used. */
  getLastActivityAt(): number | null;
  startAnnounce(callback: () => void): void;
  stopAnnounce(): void;
  getAnnounceGen(): number;
}

/**
 * In-memory queue for one channel. Persistence is the caller's job: `onChange`
 * fires after every mutation so the owner can snapshot the whole channel.
 */
export function createQueueState(onChange: () => void = () => {}): QueueState {
  let _queue: string[] = [];
  let _inQueue = new Set<string>();
  let _isOpen = false;
  let _mode: QueueMode | null = null;
  let _announceTimer: ReturnType<typeof setInterval> | null = null;
  let _announceGen = 0;
  let _lastActivityAt: number | null = null;

  function touch(): void {
    _lastActivityAt = Date.now();
    onChange();
  }

  function remove(login: string): void {
    _queue = _queue.filter(l => l !== login);
    _inQueue = new Set(_queue);
  }

  const state: QueueState = {
    restore(data) {
      _queue = [...data.players];
      _inQueue = new Set(_queue);
      _isOpen = data.open && data.mode !== null;
      _mode = _isOpen ? data.mode : null;
      _lastActivityAt = data.lastActivityAt;
    },

    join(login) {
      if (_inQueue.has(login)) return null;
      _queue = [..._queue, login];
      _inQueue = new Set(_queue);
      touch();
      return _queue.length;
    },

    leave(login) {
      if (!_inQueue.has(login)) return false;
      remove(login);
      touch();
      return true;
    },

    prepend(logins) {
      const fresh = [...new Set(logins)].filter(l => !_inQueue.has(l));
      if (fresh.length === 0) return [];
      _queue = [...fresh, ..._queue];
      _inQueue = new Set(_queue);
      onChange();
      return fresh;
    },

    drawSequential(filterFn) {
      const idx = filterFn ? _queue.findIndex(filterFn) : 0;
      if (idx === -1 || idx >= _queue.length) return null;
      const winner = _queue[idx];
      remove(winner);
      touch();
      return winner;
    },

    drawRandom(filterFn) {
      const eligible = filterFn ? _queue.filter(filterFn) : [..._queue];
      if (eligible.length === 0) return null;
      const winner = eligible[Math.floor(Math.random() * eligible.length)];
      remove(winner);
      touch();
      return winner;
    },

    list() { return [..._queue]; },
    size() { return _queue.length; },

    clear() {
      _queue = [];
      _inQueue = new Set();
      onChange();
    },

    has(login) { return _inQueue.has(login); },

    open(mode) {
      _isOpen = true;
      _mode = mode;
      touch();
    },

    close() {
      _isOpen = false;
      _mode = null;
      onChange();
    },

    isQueueOpen() { return _isOpen; },
    getMode() { return _mode; },
    getLastActivityAt() { return _lastActivityAt; },

    startAnnounce(callback) {
      state.stopAnnounce();
      _announceTimer = setInterval(callback, 60_000);
    },

    stopAnnounce() {
      // Bumping the generation invalidates any in-flight async announce tick
      // (startAnnounce also bumps it, via its stopAnnounce call).
      _announceGen++;
      if (_announceTimer !== null) {
        clearInterval(_announceTimer);
        _announceTimer = null;
      }
    },

    getAnnounceGen() { return _announceGen; },
  };

  return state;
}
