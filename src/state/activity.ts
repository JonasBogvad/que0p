const ACTIVE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const _lastMessage = new Map<string, number>();

export function recordActivity(login: string): void {
  _lastMessage.set(login, Date.now());
}

export function isActive(login: string, windowMs = ACTIVE_WINDOW_MS): boolean {
  return (Date.now() - (_lastMessage.get(login) ?? 0)) < windowMs;
}

export function getLastActivity(login: string): number | null {
  return _lastMessage.get(login) ?? null;
}
