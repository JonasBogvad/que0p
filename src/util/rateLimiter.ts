// Wraps any say function to enforce a minimum gap between messages.
// Excess messages are queued and drained in order.

const RATE_LIMIT_MS = 1200;

interface PendingEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
  resolve: () => void;
  reject: (err: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRateLimitedSay<F extends (...args: any[]) => Promise<void>>(
  originalSay: F,
): F {
  const pending: PendingEntry[] = [];
  let lastSent = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timer !== null || pending.length === 0) return;
    const wait = Math.max(0, lastSent + RATE_LIMIT_MS - Date.now());
    timer = setTimeout(() => {
      timer = null;
      const entry = pending.shift();
      if (!entry) { schedule(); return; }
      lastSent = Date.now();
      originalSay(...entry.args)
        .then(entry.resolve)
        .catch(entry.reject)
        .finally(schedule);
    }, wait);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) =>
    new Promise<void>((resolve, reject) => {
      pending.push({ args, resolve, reject });
      schedule();
    })) as F;
}
