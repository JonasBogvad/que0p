# Twitch CS Queue/Lottery Bot — Architecture Decision

> Based on research in `twitch-research-auth.md` + `twitch-research-libraries.md` — March 2026

---

## Tech Stack Decision

**Use: `@twurple/easy-bot` + `@twurple/auth` + `@twurple/api`** (TypeScript, Node 20+)

```bash
npm install @twurple/auth @twurple/easy-bot @twurple/api
```

**Why Twurple over tmi.js:**

| | tmi.js | Twurple |
|---|---|---|
| Last release | Aug 2021 (~4.5 yr stale) | Dec 2025 (active) |
| TypeScript | Third-party `@types` (lags) | Native, bundled |
| Token refresh | Manual | `RefreshingAuthProvider` (automatic) |
| EventSub path | Dead end | Already supported |

tmi.js is dead for new projects. Its download numbers are legacy inertia.

**Why `easy-bot` over raw `@twurple/chat`:** `createBotCommand()` gives clean per-command registration with built-in `checkMod()` / `checkVip()` guards — no string parsing boilerplate.

**Do NOT use `@twurple/eventsub-ws` for chat reading.** It covers subs/raids/redemptions — not chat messages. That's `@twurple/chat` territory (which `easy-bot` wraps).

---

## Project Structure

```
twitch-bot/
├── src/
│   ├── index.ts            ← entry: wire auth + bot, start loop
│   ├── auth.ts             ← RefreshingAuthProvider setup, token file I/O
│   ├── commands/
│   │   ├── join.ts         ← !join command
│   │   ├── leave.ts        ← !leave command
│   │   ├── position.ts     ← !pos — show queue position
│   │   ├── draw.ts         ← !draw — mod-only lottery pick
│   │   ├── queue.ts        ← !queue — display current queue
│   │   └── clear.ts        ← !clearqueue — mod-only full reset
│   ├── state/
│   │   ├── queue.ts        ← queue CRUD: join, leave, pick, list
│   │   ├── activity.ts     ← lastMessage Map + ACTIVE_WINDOW_MS tracking
│   │   └── readyup.ts      ← ready-up state machine (see below)
│   └── config.ts           ← env vars: CLIENT_ID, CLIENT_SECRET, CHANNEL, etc.
├── tokens.json             ← persisted OAuth tokens (gitignored)
├── .env                    ← CLIENT_ID, CLIENT_SECRET, CHANNEL
└── tsconfig.json
```

---

## Key Design Patterns

### 1. Auth — Set Once, Never Touch Again

```typescript
// auth.ts
const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });
authProvider.onRefresh(async (userId, newToken) => {
  await fs.writeFile('./tokens.json', JSON.stringify(newToken, null, 2));
});
await authProvider.addUserForToken(tokenData, ['chat']);
```

First run: do the Authorization Code flow manually (or write a tiny Express `/callback` route), save `tokens.json`. After that, Twurple refreshes silently. Token expiry is never your problem again.

### 2. Activity Tracking — Track Via Messages, Not the API

The `GET /helix/chat/chatters` endpoint requires the bot to be a moderator. Don't depend on it for the core eligibility check.

```typescript
// state/activity.ts
const lastMessage = new Map<string, number>(); // login → timestamp ms
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;      // 10 min window

export function recordActivity(login: string) {
  lastMessage.set(login, Date.now());
}

export function isActive(login: string): boolean {
  return (Date.now() - (lastMessage.get(login) ?? 0)) < ACTIVE_WINDOW_MS;
}
```

Wire `bot.onMessage()` to call `recordActivity()` for every message. Zero API calls, zero rate limit risk, works at any channel size.

**Optional hard check at draw time:** Poll `GET /helix/chat/chatters` (via `@twurple/api`) to confirm the drawn winner is still in the viewer list. Use as a secondary filter only — `isActive()` is the primary gate.

### 3. Queue State

Plain in-memory array + Set for O(1) duplicate checks. Persist to a JSON file on every mutation if you want crash resilience.

```typescript
// state/queue.ts
const queue: string[] = [];       // ordered list for positional draw
const inQueue = new Set<string>(); // fast membership check

export function join(login: string): number | null {
  if (inQueue.has(login)) return null;
  queue.push(login);
  inQueue.add(login);
  return queue.length;
}

export function leave(login: string): boolean {
  const idx = queue.indexOf(login);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  inQueue.delete(login);
  return true;
}

export function draw(activeOnly = true): string | null {
  const eligible = activeOnly ? queue.filter(isActive) : queue;
  if (eligible.length === 0) return null;
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  leave(winner);
  return winner;
}
```

### 4. Ready-Up Flow (State Machine)

After `!draw`, the winner gets 60–90 seconds to type `!ready`. Bot enters a "waiting" state:

```
IDLE → DRAWING → WAITING_READY → (timeout) → DRAWING again (next eligible)
                               → (ready) → IDLE
```

```typescript
// state/readyup.ts
type ReadyState = 'idle' | 'waiting';
let state: ReadyState = 'idle';
let pendingWinner: string | null = null;
let readyTimer: ReturnType<typeof setTimeout> | null = null;
const READY_TIMEOUT_MS = 75_000;

export function startReadyUp(winner: string, onTimeout: () => void, say: (msg: string) => void) {
  state = 'waiting';
  pendingWinner = winner;
  say(`@${winner} — you were drawn! Type !ready within 75 seconds to confirm.`);
  readyTimer = setTimeout(() => {
    say(`@${winner} did not respond. Drawing again...`);
    state = 'idle';
    pendingWinner = null;
    onTimeout(); // caller re-draws
  }, READY_TIMEOUT_MS);
}

export function confirmReady(login: string, say: (msg: string) => void): boolean {
  if (state !== 'waiting' || login !== pendingWinner) return false;
  clearTimeout(readyTimer!);
  state = 'idle';
  pendingWinner = null;
  say(`@${login} confirmed! GL HF!`);
  return true;
}
```

`!ready` command checks `confirmReady()`. `!draw` command calls `startReadyUp()`.

---

## OAuth Setup (One-Time)

Scopes to request on the bot's user access token:

```
user:bot
user:read:chat
user:write:chat
moderator:read:chatters   ← only if you want hard presence validation at draw time
```

Broadcaster separately grants `channel:bot` via their own OAuth (one-time, for the bot badge).

Write a small Express `/callback` route for the initial Authorization Code exchange — run it once locally, save `tokens.json`, then delete the route. Twurple handles all subsequent refreshes.

---

## Risks & Gotchas

### Rate Limits
- **1 msg/sec per channel** — queue the `say()` calls if commands fire rapidly. Add a 1.1s minimum gap between bot messages.
- Global: 20 msg/30s (unmodded bot). If you mod your bot in the channel, this increases to 100 msg/30s.
- Message max length: 500 chars. Truncate queue dumps.

### IRC → EventSub Migration
`@twurple/chat` uses IRC internally. Twitch is rolling out EventSub-based chat (`channel.chat.message`) as the eventual replacement. Twurple already supports it in `@twurple/eventsub-ws`, but the `easy-bot` wrapper doesn't expose it yet. When Twitch deprecates IRC chat reading (1–2 year horizon), Twurple will handle the migration. tmi.js will not.

### `moderator:read:chatters` Requires Mod Status
The Get Chatters endpoint only works if the bot is actually modded in the channel. Don't gate core functionality on it — use it only as a soft presence check at draw time.

### Token File Security
`tokens.json` contains a live access token + refresh token. `.gitignore` it. Consider restricting file permissions (`chmod 600`) on Linux.

### Crash Recovery
In-memory queue resets on restart. If this is a problem, write queue to `queue.json` on every mutation and reload on startup. Use synchronous writes or a queue-of-writes to avoid partial state.

### `@tmi.js/chat` (the rewrite) — Not Yet
v0.7.5, pre-1.0, breaking changes between minor versions. Good to watch for 2027, not for a bot you run today.

---

## Summary

| Decision | Choice | Reason |
|---|---|---|
| Library | `@twurple/easy-bot` | Native TS, active, auto-refresh, clean command API |
| Chat protocol | IRC via Twurple | EventSub chat not yet in easy-bot wrapper |
| Activity tracking | Self-track via `onMessage` | No API calls, no mod requirement, works at scale |
| Presence at draw | Optional `Get Chatters` poll | Secondary check only, requires mod |
| State persistence | JSON files on mutation | Simple, crash-safe, no DB needed |
| Ready-up | setTimeout state machine | Simple, no library needed |
