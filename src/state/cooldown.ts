// Per-user, per-command cooldown tracking.
// checkCooldown returns true (allowed) or false (still on cooldown).
const _cooldowns = new Map<string, Map<string, number>>();

export function checkCooldown(login: string, command: string, cooldownMs: number): boolean {
  const now = Date.now();
  let userMap = _cooldowns.get(login);
  if (!userMap) {
    userMap = new Map();
    _cooldowns.set(login, userMap);
  }
  const last = userMap.get(command) ?? 0;
  if (now - last < cooldownMs) return false;
  userMap.set(command, now);
  return true;
}
