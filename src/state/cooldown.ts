export interface CooldownState {
  checkCooldown(login: string, command: string, cooldownMs: number): boolean;
}

export function createCooldownState(): CooldownState {
  const _cooldowns = new Map<string, Map<string, number>>();
  return {
    checkCooldown(login, command, cooldownMs) {
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
    },
  };
}
