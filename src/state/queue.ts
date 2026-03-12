import { writeFile, readFile } from 'fs/promises';
import { QUEUE_FILE } from '../paths.js';

let _queue: string[] = [];
let _inQueue = new Set<string>();
let _isOpen = false;
let _mode: 'seq' | 'ran' | null = null;
let _announceTimer: ReturnType<typeof setInterval> | null = null;

function persist(): void {
  writeFile(QUEUE_FILE, JSON.stringify(_queue, null, 2), 'utf-8').catch(err =>
    console.error('[queue] Failed to persist:', err)
  );
}

export async function loadPersistedQueue(): Promise<void> {
  try {
    const data = JSON.parse(await readFile(QUEUE_FILE, 'utf-8')) as unknown;
    if (Array.isArray(data)) {
      _queue = data as string[];
      _inQueue = new Set(_queue);
      console.log(`[queue] Loaded ${_queue.length} entries from persistence.`);
    }
  } catch {
    // No persisted queue — start fresh
  }
}

export function join(login: string): number | null {
  if (_inQueue.has(login)) return null;
  _queue.push(login);
  _inQueue.add(login);
  persist();
  return _queue.length;
}

export function leave(login: string): boolean {
  const idx = _queue.indexOf(login);
  if (idx === -1) return false;
  _queue.splice(idx, 1);
  _inQueue.delete(login);
  persist();
  return true;
}

// Sequential: pick the first eligible entry (FIFO), remove and return it.
export function drawSequential(filterFn?: (login: string) => boolean): string | null {
  const idx = filterFn ? _queue.findIndex(filterFn) : 0;
  if (idx === -1 || idx >= _queue.length) return null;
  const winner = _queue[idx];
  _queue.splice(idx, 1);
  _inQueue.delete(winner);
  persist();
  return winner;
}

// Random: pick a random eligible entry, remove and return it.
export function drawRandom(filterFn?: (login: string) => boolean): string | null {
  const eligible = filterFn ? _queue.filter(filterFn) : [..._queue];
  if (eligible.length === 0) return null;
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  leave(winner);
  return winner;
}

export function list(): string[] {
  return [..._queue];
}

export function size(): number {
  return _queue.length;
}

export function clear(): void {
  _queue = [];
  _inQueue = new Set();
  persist();
}

export function has(login: string): boolean {
  return _inQueue.has(login);
}

export function open(mode: 'seq' | 'ran'): void {
  _isOpen = true;
  _mode = mode;
}

export function close(): void {
  _isOpen = false;
  _mode = null;
}

export function isQueueOpen(): boolean {
  return _isOpen;
}

export function getMode(): 'seq' | 'ran' | null {
  return _mode;
}

export function startAnnounce(callback: () => void): void {
  stopAnnounce();
  _announceTimer = setInterval(callback, 60_000);
}

export function stopAnnounce(): void {
  if (_announceTimer !== null) {
    clearInterval(_announceTimer);
    _announceTimer = null;
  }
}
