# que0p — CLAUDE.md

AI agent instructions for working in this codebase. Read this before making any changes.

---

## What this project is

**que0p** is a Twitch chat queue bot for streamers. It manages a viewer queue, draws players, runs a ready-up system, and tracks a confirmed lobby. It works across multiple channels simultaneously. It is game-agnostic — not CS-specific.

Live at: **https://que0p.stream**

---

## Tech stack

| Layer | Tech |
|---|---|
| Bot backend | Node.js, TypeScript, `@twurple/easy-bot`, `@twurple/auth` |
| Web server | Express (port 8080), serves frontend + REST API |
| Landing page | React + Vite + Tailwind + shadcn/ui (`frontend/`) |
| Static pages | Plain HTML + `shared.css` (`frontend/public/`) |
| Deployment | Fly.io (`twitch-que` app), region `ord` |
| Persistent data | Fly volume mounted at `/data` |
| CI/CD | GitHub Actions → `fly deploy` on push to `master` |
| Pre-commit hook | Husky runs `npm run build` (tsc) before every commit |

---

## Architecture overview

```
Twitch chat
    ↕ IRC (twurple)
Bot process (src/index.ts)
    ├── Commands → per-channel state (queue, readyup, lobby, activity, cooldown)
    ├── helixSay → Twitch Helix API (bot badge messages, rate limited)
    └── Express web server (:8080)
            ├── GET /api/*          → reads per-channel state
            ├── GET /add-channel    → Twitch OAuth redirect
            ├── GET /callback       → OAuth exchange → joins channel
            └── Static files        → frontend/dist/ + frontend/public/

Browser (viewers/streamer)
    ├── que0p.stream/               → React landing page (Vite build)
    ├── que0p.stream/queue.html     → polls /api/queue/:channel every 3s
    ├── que0p.stream/channels.html  → polls /api/channels
    └── que0p.stream/faq.html       → static accordion

Fly.io
    ├── Machine (ord region, 256mb)
    ├── Volume bot_data → /data     → tokens.json, channels.json, approved.json, queue-*.json
    └── TLS cert (Let's Encrypt via fly certs)

DNS (Cloudflare)
    ├── A    que0p.stream → 66.241.125.53
    └── AAAA que0p.stream → 2a09:8280:1::e2:5889:0
```

---

## Repository structure

```
/                           — project root
  CLAUDE.md                 — this file
  package.json              — backend deps + scripts (build, start, setup)
  tsconfig.json             — TypeScript config
  Dockerfile                — production image
  fly.toml                  — Fly.io app config
  .github/workflows/        — CI/CD (fly deploy on push to master)
  .husky/pre-commit         — runs npm run build before every commit

src/
  index.ts              — entry point, wires bot + web server
  config.ts             — env var validation
  auth.ts               — Twitch OAuth token loading + refresh
  botActions.ts         — joinChannel / leaveChannel / sayInChannel
  paths.ts              — file paths for persisted data

  state/
    channels.ts         — active + approved channel lists (persisted)
    perChannel.ts       — per-channel state factory (queue, readyup, activity, cooldown, lobby)
    queue.ts            — queue state (join, leave, draw, persist)
    readyup.ts          — ready-up state machine (draw batch, timer, events)
    activity.ts         — tracks last chat message time per user (10min window)
    cooldown.ts         — per-user per-command cooldown tracker
    stats.ts            — persistent global counters (queuesStarted, playersJoined, channelsAllTime)

  commands/
    join.ts             — !qjoin
    leave.ts            — !qleave
    position.ts         — !qpos
    open.ts             — !qopen seq/ran
    stop.ts             — !qstop
    draw.ts             — !qdraw [1-5]
    ready.ts            — !qready
    skip.ts             — !qskip
    reset.ts            — !qreset
    nextround.ts        — !qnext
    queue.ts            — !qlist
    remove.ts           — !qremove <user> (mod+)
    ban.ts              — !qban <user>, !qunban <user>, !qbanlist (mod+)
    help.ts             — !qhelp
    allowchannel.ts     — !qallow (owner channel only)
    removechannel.ts    — !qpart (any channel, mod+)
    approvedlist.ts     — !qapproved (owner channel only)

  util/
    helixSay.ts         — sends messages via Twitch Helix API (gets bot badge)
    rateLimiter.ts      — queues messages with 1200ms gap to avoid rate limits

  web/
    server.ts           — Express server, REST API, OAuth callback

frontend/
  index.html            — landing page shell (OG/SEO tags)
  src/
    App.tsx             — React landing page
    index.css           — Tailwind + custom keyframes (cursor blink)
  public/
    shared.css          — shared CSS for all static HTML pages
    queue.html          — live queue viewer (polling every 3s)
    channels.html       — lists all active channels
    faq.html            — FAQ accordion page
    success.html        — OAuth success page
    error.html          — OAuth error page
    og-image.svg        — OG social card image
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TWITCH_CLIENT_ID` | Yes | Twitch app client ID |
| `TWITCH_CLIENT_SECRET` | Yes | Twitch app client secret |
| `TWITCH_CHANNEL` | Yes | Owner's channel login (e.g. `swisz`) |
| `BOT_USER_ID` | Yes | Numeric Twitch user ID of the bot account |
| `TWITCH_BOT_TOKENS` | Yes | JSON (or base64 JSON) of OAuth tokens for the bot |
| `APP_URL` | No | Public URL of the app (default: `http://localhost:8080`) |
| `TWITCH_WHITELIST` | No | Comma-separated logins allowed to add the bot |

Set on Fly.io with `fly secrets set KEY=value`.

---

## Persisted data (Fly volume at `/data`)

| File | Contents |
|---|---|
| `tokens.json` | Bot OAuth tokens (access + refresh), updated on each refresh |
| `channels.json` | List of active channel logins |
| `approved.json` | List of approved channel logins (whitelist) |
| `queue-{channel}.json` | Persisted queue for each channel |
| `stats.json` | Global counters: queuesStarted, playersJoined, channelsAllTime |

In development, data files are written to the project root (`.`).

---

## Per-channel state

Every active channel has isolated state created by `getChannelState(channel)`:

- **queue** — ordered list of players; supports sequential and random draw; persisted to disk
- **readyup** — state machine for the draw/ready-up cycle; tracks current winner, pending list, drawn batch, last event (ready/lost/skip)
- **activity** — records last chat message time per user; used to filter AFK players on draw (10min window)
- **cooldown** — prevents users from spamming commands
- **lobby** — in-memory list of confirmed (readied) players; only cleared on `!qreset` or `!qnext`

---

## Queue flow

1. `!qopen seq` or `!qopen ran` — opens queue, starts 60s announce loop
2. Viewers type `!qjoin` — added to queue (blocked if banned)
3. `!qdraw [n]` — draws up to 5 players (filtered by activity); removed from queue immediately
4. Each drawn player gets 30s to type `!qready` or `!qskip`
   - `!qready` → added to lobby, removed from draw batch
   - `!qskip` → requeued at end, removed from draw batch
   - timeout → requeued at end, slot lost
5. `!qstop` — closes queue; players and lobby stay intact
6. `!qnext` — clears lobby, requeues lobby players at end of queue
7. `!qreset` — wipes queue, lobby, and draw state entirely

---

## Chat message style

All bot messages use terminal-style output:

- `>` for output (responses, confirmations, state changes)
- `>_` for prompts waiting for user input (queue open announce, ready-up prompt)

No emojis except where noted. No game-specific language — this is game-agnostic.

Examples:
```
> @swisz joined [#1 of 5]
> @swisz #3 of 12
>_ queue open [sequential] — type !qjoin to enter
>_ @swisz — type !qready within 30s or !qskip to pass
> @swisz ready — slot confirmed
> @swisz — slot lost [30s]
> queue wiped
> round over — swisz, player2 requeued
```

---

## Web server (Express)

Runs on port 8080. Key routes:

| Route | Description |
|---|---|
| `GET /` | Serves React landing page (built frontend) |
| `GET /api/channels` | Lists active channels with queue size and open status |
| `GET /api/queue/:channel` | Full queue state: players, lobby, readyup, mode |
| `GET /api/stats` | Global stats: queuesStarted, playersJoined, channelsAllTime |
| `GET /health` | Health check (`{ status: 'ok', uptime }`) |
| `GET /add-channel` | Redirects to Twitch OAuth authorization |
| `GET /callback` | OAuth callback: exchanges code, resolves login, joins channel |

The callback flow:
1. Exchange code for token via Twitch
2. Resolve broadcaster login via Helix `/users`
3. Check whitelist (env var) or approved list (approved.json)
4. Call `addActive`, `initChannelState`, `joinChannel`
5. Redirect to `/success.html?channel=...` or `/error.html?reason=...`

Redirect from `twitch-que.fly.dev` to `que0p.stream` is handled via hostname check middleware.

---

## Frontend (React landing page)

Built with Vite + Tailwind + shadcn/ui. Output goes to `frontend/dist/`, served as static by Express.

Key components in `App.tsx`:
- `TypedTwitch` — Twitch logo fades in, then "Twitch" types out character by character
- `TypedPrompt` — section prompts type out when scrolled into view (IntersectionObserver, fires once)
- Blinking `_` cursor after hero tagline
- `useStats` hook — fetches `/api/stats` on mount, displays live counters in hero (channels · queues run · players joined)

Build: `cd frontend && npm run build`

---

## Static HTML pages

All use `frontend/public/shared.css` — no inline styles allowed. CSS custom properties defined in `:root`:

```css
--bg, --fg, --muted, --subtle, --border, --green, --red, --blue, --yellow, --purple, --font
```

Pages: `queue.html`, `channels.html`, `faq.html`, `success.html`, `error.html`

The queue page (`queue.html`) polls `/api/queue/:channel` every 3s and diffs state client-side to drive the activity log. It shows: queue list, lobby, ready-up banner with countdown, activity log.

---

## Sending messages (helixSay + rate limiter)

Bot messages go through:
1. `createHelixSay(authProvider)` — sends via Twitch Helix `POST /helix/chat/messages` (gives bot badge in chat)
2. `createRateLimitedSay()` — queues messages with 1200ms minimum gap

The bot's `.say()` method is patched at startup to use this pipeline.

`helixSay` calls `authProvider.getAccessTokenForUser(botUserId)` on every message — twurple refreshes the token automatically if expired, so stale token 401s are not possible. Do NOT revert to a cached `_accessToken` snapshot — that was the old approach and caused 401s on cold start.

---

## Auth flow

Tokens are loaded from `/data/tokens.json` (Fly volume) on startup. If missing, falls back to `TWITCH_BOT_TOKENS` env var (base64 or raw JSON) — used for first cold start. Tokens auto-refresh via `RefreshingAuthProvider` and are written back to disk on each refresh.

To set up tokens locally: `npm run setup` (runs `src/setup-tokens.ts`).

---

## Deployment

GitHub Actions deploys automatically on every push to `master`. To deploy manually or manage the app:

```bash
# Deploy
fly deploy

# App status and machine state
fly status

# Live logs
fly logs

# SSH into the running machine
fly ssh console

# List / set / delete secrets (env vars)
fly secrets list
fly secrets set KEY=value
fly secrets unset KEY

# Persistent volume
fly volumes list
fly volumes show bot_data

# Scaling
fly scale count 1        # ensure exactly 1 machine running
fly scale memory 256     # set memory in MB

# Custom domain / TLS
fly certs add que0p.stream
fly certs check que0p.stream
fly certs list

# IP addresses
fly ips list
fly ips allocate-v6      # needed for custom domain cert verification

# Health check
curl https://que0p.stream/health
```

`fly.toml` notes:
- `APP_URL` in `[env]` is stale — the real value is set via `fly secrets set APP_URL=https://que0p.stream`
- Volume `bot_data` → `/data` for persistent state
- Health check on `/health` with 20s grace period
- `auto_stop_machines = false` — bot must stay running at all times
- Region: `ord` (Chicago)
- Machine: 256mb RAM, shared CPU

DNS is on Cloudflare (proxy ON — orange cloud):
- `A    que0p.stream → 66.241.125.53`
- `AAAA que0p.stream → 2a09:8280:1::e2:5889:0`
- SSL mode: **Full (Strict)**
- TLS cert on Fly is a Cloudflare Origin Certificate (15yr), imported via `fly certs import que0p.stream --fullchain cert.pem --private-key key.pem`

Old domain `twitch-que.fly.dev` 301-redirects to `que0p.stream` via middleware in `src/web/server.ts`.

---

## Adding a new command

1. Create `src/commands/yourcommand.ts` — export `yourCommand = createBotCommand('qname', handler)` (all commands use `q` prefix)
2. Import and register in `src/index.ts` commands array
3. Add to `!qhelp` message in `src/commands/help.ts`
4. Add to mod or viewer commands table in `frontend/src/App.tsx`
5. Add FAQ entry if behaviour is non-obvious

---

## Key design decisions

- **Players requeued on skip/timeout** — drawn players are removed from queue on draw; if they skip or time out they are put back at the end automatically
- **Lobby only clears on !qreset or !qnext** — persists across multiple draw rounds so streamer always knows who's confirmed
- **Activity check on draw** — players who haven't chatted in 10min are skipped silently (stay in queue)
- **!qstop vs !qreset** — stop closes queue but preserves everything; reset wipes everything
- **!qnext** — moves lobby players to end of queue, clears lobby; for between-game transitions
- **Sequential draw removes in order** — first joined = first drawn; random picks uniformly
- **Rate limit 1200ms** — prevents Twitch rate limit errors during large draw batches
- **Helix API for messages** — gives the bot its verified badge in chat
- **Queue auto-close watchdog** (`src/util/queueWatchdog.ts`) — runs on the 60s announce tick; closes the queue (like `!qstop`, players kept) when the stream has been offline ~10 consecutive minutes or there's been no queue activity (open/join/leave/draw) for 2h. Announce is suppressed while the stream is offline. Live status via Helix; API errors are treated as "unknown" (fail open — keeps announcing, offline count preserved)
