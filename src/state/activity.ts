const ACTIVE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface ActivityState {
  recordActivity(login: string): void;
  isActive(login: string, windowMs?: number): boolean;
  getLastActivity(login: string): number | null;
}

/**
 * Tracks the last chat message per user so draws can skip AFK players.
 * Users with no record are treated as active until one full window has
 * passed since boot: after a restart nobody has chatted yet, and a draw in
 * that first window must not skip the whole queue.
 */
export function createActivityState(now: () => number = Date.now): ActivityState {
  const _lastMessage = new Map<string, number>();
  const _bootedAt = now();
  return {
    recordActivity(login) { _lastMessage.set(login, now()); },
    isActive(login, windowMs = ACTIVE_WINDOW_MS) {
      const last = _lastMessage.get(login) ?? _bootedAt;
      return (now() - last) < windowMs;
    },
    getLastActivity(login) { return _lastMessage.get(login) ?? null; },
  };
}
