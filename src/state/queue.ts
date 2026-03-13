import { writeFile, readFile } from 'fs/promises';

export interface QueueState {
  loadPersisted(): Promise<void>;
  join(login: string): number | null;
  leave(login: string): boolean;
  drawSequential(filterFn?: (login: string) => boolean): string | null;
  drawRandom(filterFn?: (login: string) => boolean): string | null;
  list(): string[];
  size(): number;
  clear(): void;
  has(login: string): boolean;
  open(mode: 'seq' | 'ran'): void;
  close(): void;
  isQueueOpen(): boolean;
  getMode(): 'seq' | 'ran' | null;
  startAnnounce(callback: () => void): void;
  stopAnnounce(): void;
}

export function createQueueState(persistFile: string): QueueState {
  let _queue: string[] = [];
  let _inQueue = new Set<string>();
  let _isOpen = false;
  let _mode: 'seq' | 'ran' | null = null;
  let _announceTimer: ReturnType<typeof setInterval> | null = null;

  function persist(): void {
    writeFile(persistFile, JSON.stringify(_queue, null, 2), 'utf-8').catch(err =>
      console.error('[queue] Failed to persist:', err)
    );
  }

  const state: QueueState = {
    async loadPersisted() {
      try {
        const data = JSON.parse(await readFile(persistFile, 'utf-8')) as unknown;
        if (Array.isArray(data)) {
          _queue = data as string[];
          _inQueue = new Set(_queue);
          console.log(`[queue] Loaded ${_queue.length} entries from ${persistFile}.`);
        }
      } catch {
        // No persisted queue — start fresh
      }
    },

    join(login) {
      if (_inQueue.has(login)) return null;
      _queue.push(login);
      _inQueue.add(login);
      persist();
      return _queue.length;
    },

    leave(login) {
      const idx = _queue.indexOf(login);
      if (idx === -1) return false;
      _queue.splice(idx, 1);
      _inQueue.delete(login);
      persist();
      return true;
    },

    drawSequential(filterFn) {
      const idx = filterFn ? _queue.findIndex(filterFn) : 0;
      if (idx === -1 || idx >= _queue.length) return null;
      const winner = _queue[idx];
      _queue.splice(idx, 1);
      _inQueue.delete(winner);
      persist();
      return winner;
    },

    drawRandom(filterFn) {
      const eligible = filterFn ? _queue.filter(filterFn) : [..._queue];
      if (eligible.length === 0) return null;
      const winner = eligible[Math.floor(Math.random() * eligible.length)];
      const idx = _queue.indexOf(winner);
      if (idx !== -1) {
        _queue.splice(idx, 1);
        _inQueue.delete(winner);
        persist();
      }
      return winner;
    },

    list() { return [..._queue]; },
    size() { return _queue.length; },

    clear() {
      _queue = [];
      _inQueue = new Set();
      persist();
    },

    has(login) { return _inQueue.has(login); },
    open(mode) { _isOpen = true; _mode = mode; },
    close() { _isOpen = false; _mode = null; },
    isQueueOpen() { return _isOpen; },
    getMode() { return _mode; },

    startAnnounce(callback) {
      state.stopAnnounce();
      _announceTimer = setInterval(callback, 60_000);
    },

    stopAnnounce() {
      if (_announceTimer !== null) {
        clearInterval(_announceTimer);
        _announceTimer = null;
      }
    },
  };

  return state;
}
