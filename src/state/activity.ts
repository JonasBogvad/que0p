const ACTIVE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface ActivityState {
  recordActivity(login: string): void;
  isActive(login: string, windowMs?: number): boolean;
  getLastActivity(login: string): number | null;
}

export function createActivityState(): ActivityState {
  const _lastMessage = new Map<string, number>();
  return {
    recordActivity(login) { _lastMessage.set(login, Date.now()); },
    isActive(login, windowMs = ACTIVE_WINDOW_MS) {
      return (Date.now() - (_lastMessage.get(login) ?? 0)) < windowMs;
    },
    getLastActivity(login) { return _lastMessage.get(login) ?? null; },
  };
}
