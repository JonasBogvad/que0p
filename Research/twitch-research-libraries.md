# Twitch Chat Bot Library Research
> Researched March 2026 — for a CS queue/lottery bot (Node.js / TypeScript)

---

## 1. tmi.js

**NPM:** `tmi.js` | **Latest stable:** `1.8.5` | **Last publish:** August 18, 2021 (~4.5 years ago)
**GitHub:** [tmijs/tmi.js](https://github.com/tmijs/tmi.js) | **Stars:** ~1,600 | **Open issues:** 26 | **Language:** JavaScript (100%)
**Weekly downloads:** ~7,245

### Maintenance status: STALLED

The last npm release was August 2021. The GitHub repo shows occasional commits since then but no feature releases — maintenance-only activity. The library is written in plain JavaScript; TypeScript types are provided only through the third-party `@types/tmi.js` package on DefinitelyTyped, meaning types can lag behind the actual library.

**Why it stalled:** In February 2023, Twitch deprecated IRC chat commands (other than `/me`), breaking a significant portion of tmi.js functionality. The maintainers planned a full rewrite, which led to the new scoped package `@tmi.js/chat` (see below).

### Feature breakdown

| Feature | Support |
|---|---|
| TypeScript | Via `@types/tmi.js` (third-party, not bundled) |
| Auto token refresh | ❌ None — fully manual |
| Chatter tracking | IRC JOIN/PART (unreliable above ~1,000 viewers) |
| Command listening | `client.on('message', (channel, tags, message, self) => { ... })` |
| Node version | Any |

### Pros
- Extremely simple API — lowest barrier to entry
- Large body of tutorials and Stack Overflow answers (historical)
- Still works for basic message reading

### Cons
- Functionally unmaintained on npm for 4.5 years
- No automatic token refresh — you manage OAuth entirely yourself
- Third-party types that often lag
- IRC foundation is being phased out by Twitch
- No path forward without migrating off the package entirely

---

## 2. @tmi.js/chat (the rewrite)

**NPM:** `@tmi.js/chat` | **Latest:** v0.7.5 | **Last publish:** ~16 days ago (March 2026)
**GitHub:** [tmijs/chat](https://github.com/tmijs/chat) | **Language:** TypeScript

This is the active rewrite of tmi.js by the same org. It is **pre-1.0 with an unstable API** — breaking changes between minor versions are expected. Not recommended for a production bot today, but worth watching.

---

## 3. Twurple (@twurple/*)

**GitHub:** [twurple/twurple](https://github.com/twurple/twurple) | **Stars:** 731 | **Open issues:** 11 | **Language:** TypeScript (99.9%)
**Latest version:** `8.0.2` | **Last publish:** ~December 2025 (v8.0.0) + patch since
**Total commits:** 2,509 | **Releases:** 257
**@twurple/chat weekly downloads:** ~2,238

### Maintenance status: ACTIVELY MAINTAINED

v8.0.0 released December 3, 2025. The monorepo is written entirely in TypeScript — no `@types/*` needed. All packages must be pinned to the same version (monorepo constraint).

### Package breakdown

| Package | Purpose |
|---|---|
| `@twurple/auth` | OAuth token management with **automatic refresh** |
| `@twurple/api` | Full Twitch Helix REST API wrapper |
| `@twurple/chat` | IRC-over-WebSocket chat client (low-level) |
| `@twurple/easy-bot` | High-level bot framework wrapping auth + chat |
| `@twurple/eventsub-ws` | EventSub over WebSocket (subs, raids, redemptions — NOT chat messages) |
| `@twurple/eventsub-http` | EventSub over HTTP/webhooks (requires public server) |
| `@twurple/auth-tmi` | Injects Twurple auth into legacy tmi.js |

### Feature breakdown

| Feature | Support |
|---|---|
| TypeScript | ✅ Native — library written in TypeScript, types bundled |
| Auto token refresh | ✅ `RefreshingAuthProvider` — fully transparent, `onRefresh` callback to persist |
| Chatter tracking | IRC JOIN/PART (unreliable at scale); Helix API polling available |
| Command listening | `createBotCommand()` (easy-bot) or `chatClient.onMessage()` |
| Node version | 20+ required |

### Pros
- Native TypeScript, zero type lag
- `RefreshingAuthProvider` makes OAuth set-and-forget
- `@twurple/easy-bot` provides `createBotCommand()` for clean command registration
- `@twurple/api` gives direct access to Get Chatters, user info, etc.
- Already supports the `channel.chat.message` EventSub type — future-proof
- Actively maintained with regular releases

### Cons
- More complex initial setup vs tmi.js (multiple packages to wire)
- Smaller historical community (fewer tutorials)
- v8 requires Node 20+
- v8 dropped PubSub support (Twitch killed PubSub entirely)
- All packages must be on the same version

---

## 4. @twurple/chat vs @twurple/eventsub-ws — Key Distinction

These are **not alternatives** — they serve entirely different purposes:

### @twurple/chat
Connects to Twitch via the **IRC protocol over WebSocket**. This is the correct choice for a chat bot that reads messages. It can:
- Read every chat message in real time (`onMessage`)
- React to joins/parts (`onJoin`, `onPart`) — unreliable for large channels
- Send messages, timeouts, bans
- Track chatters via IRC `NAMES` list (limited, unreliable at scale)

### @twurple/eventsub-ws
Connects to Twitch's **EventSub system via WebSocket**. Used for reacting to platform events that are NOT chat messages:
- New subscribers, resubs, gift subs
- Channel point redemptions
- Follows, raids, hype trains
- `channel.chat.message` — Twitch's new EventSub-based chat (the future replacement for IRC reading)

**For a CS queue/lottery bot:** use `@twurple/chat` (or `@twurple/easy-bot`). Add EventSub alongside it only if you also want to react to subscriptions or redemptions.

### The IRC → EventSub future
Twitch is actively rolling out `channel.chat.message` via EventSub as the long-term replacement for IRC. Twurple already supports it in `@twurple/eventsub-ws`. Within 1–2 years, IRC-based chat reading may be deprecated. Twurple is already positioned for this transition; tmi.js is not.

---

## 5. User Activity / Chatter Presence Tracking

**No library provides this natively.** This is a Twitch platform limitation:

| Method | Details |
|---|---|
| IRC JOIN/PART | Only sent in channels with **fewer than 1,000 chatters** — useless at scale |
| Get Chatters API | `GET /helix/chat/chatters` — polling, up to 1,000/page, requires `moderator:read:chatters` scope, caller must be moderator or broadcaster |
| EventSub "user joined" | ❌ Does not exist — only `channel.chat.message` |

### Recommended approach: self-track via message events

```typescript
const lastMessage = new Map<string, number>(); // userName → timestamp ms

bot.onMessage((channel, user, text, msg) => {
  lastMessage.set(msg.userInfo.userName, Date.now());
});

// On !draw: filter queue to users active in the last 10 minutes
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
const eligible = queue.filter(u =>
  (Date.now() - (lastMessage.get(u) ?? 0)) < ACTIVE_WINDOW_MS
);
```

This approach is:
- Zero extra API calls
- Zero rate limit risk
- Works at any channel size
- Naturally reflects who is *actually participating* in chat

**Alternative:** Poll `GET /helix/chat/chatters` every 60s for a hard presence check. Useful if you want to validate that a drawn winner is still in chat at draw time, not just that they spoke recently.

---

## Comparison Table

| Feature | tmi.js | @twurple/chat | @twurple/easy-bot |
|---|---|---|---|
| Latest version | 1.8.5 | 8.0.2 | 8.0.2 |
| Last npm publish | Aug 2021 | Dec 2025 | Dec 2025 |
| Weekly downloads | ~7,245 | ~2,238 | ~296 |
| TypeScript | Via `@types/tmi.js` | ✅ Native | ✅ Native |
| Auto token refresh | ❌ | ✅ (`@twurple/auth`) | ✅ (built in) |
| Command handling | Manual string parsing | `onMessage` + manual | `createBotCommand()` |
| Chatter presence | JOIN/PART (unreliable) | JOIN/PART (unreliable) | JOIN/PART (unreliable) |
| Maintenance | Stalled | Active | Active |
| Node version | Any | 20+ | 20+ |
| Setup complexity | Low | Medium | Low–Medium |
| EventSub future-proof | ❌ | ✅ | ✅ |

---

## Recommendation

### Use `@twurple/easy-bot` + `@twurple/auth` + `@twurple/api`

```bash
npm install @twurple/auth @twurple/easy-bot @twurple/api
```

**Why:**
- `@twurple/easy-bot` provides `createBotCommand()` — the cleanest API for registering `!join`, `!leave`, `!draw`, etc.
- `@twurple/auth` with `RefreshingAuthProvider` handles OAuth completely — set up once, never think about tokens again. Use the `onRefresh` callback to persist the refreshed token to disk.
- `@twurple/api` gives access to `Get Chatters` if you need hard presence validation at draw time.
- Native TypeScript, actively maintained, already on the EventSub migration path.

**Do not use tmi.js** for a new project in 2026. Its npm package is 4.5 years stale, provides no token refresh, and has no clear upgrade path. The download numbers are entirely legacy inertia.

### Minimal bot skeleton

```typescript
import { RefreshingAuthProvider } from '@twurple/auth';
import { Bot, createBotCommand } from '@twurple/easy-bot';
import { promises as fs } from 'fs';

const TOKEN_FILE = './tokens.json';

async function main() {
  const tokenData = JSON.parse(await fs.readFile(TOKEN_FILE, 'utf-8'));

  const authProvider = new RefreshingAuthProvider({ clientId: process.env.CLIENT_ID!, clientSecret: process.env.CLIENT_SECRET! });
  authProvider.onRefresh(async (_userId, newTokenData) => {
    await fs.writeFile(TOKEN_FILE, JSON.stringify(newTokenData, null, 2));
  });
  await authProvider.addUserForToken(tokenData, ['chat']);

  const lastMessage = new Map<string, number>();
  const queue: string[] = [];

  const bot = new Bot({
    authProvider,
    channels: ['your_channel'],
    commands: [
      createBotCommand('join', (params, { userName, say }) => {
        if (!queue.includes(userName)) {
          queue.push(userName);
          say(`@${userName} added to the queue! Position: ${queue.length}`);
        } else {
          say(`@${userName} you're already in the queue.`);
        }
      }),
      createBotCommand('leave', (params, { userName, say }) => {
        const idx = queue.indexOf(userName);
        if (idx !== -1) {
          queue.splice(idx, 1);
          say(`@${userName} removed from the queue.`);
        }
      }),
      createBotCommand('draw', (params, { say, checkVip, checkMod }) => {
        // Only mods/broadcaster can draw
        if (!checkMod()) return;
        const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
        const eligible = queue.filter(u => (Date.now() - (lastMessage.get(u) ?? 0)) < ACTIVE_WINDOW_MS);
        if (eligible.length === 0) { say('No eligible players in the queue.'); return; }
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        queue.splice(queue.indexOf(winner), 1);
        say(`🎉 @${winner} wins! Congratulations!`);
      }),
    ],
  });

  bot.onMessage((channel, user, text, msg) => {
    lastMessage.set(msg.userInfo.userName, Date.now());
  });
}

main();
```

---

## Sources

- [tmi.js GitHub](https://github.com/tmijs/tmi.js)
- [@tmi.js/chat GitHub (rewrite)](https://github.com/tmijs/chat)
- [twurple/twurple GitHub](https://github.com/twurple/twurple)
- [Twurple official docs](https://twurple.js.org/)
- [Twurple easy-bot example](https://twurple.js.org/docs/examples/chat/basic-bot.html)
- [@twurple/easy-bot on npm](https://www.npmjs.com/package/@twurple/easy-bot)
- [Twitch: IRC migration guide](https://dev.twitch.tv/docs/chat/irc-migration/)
- [Twitch: channel.chat.message via EventSub announcement](https://discuss.dev.twitch.com/t/available-today-twitch-chat-on-eventsub-an-api-for-sending-chat-and-the-conduit-transport-method-for-eventsub/54596)
- [Twitch: Get Chatters API reference](https://dev.twitch.tv/docs/api/reference/#get-chatters)
