# que0p

**A free, open-source Twitch queue bot for playing games with your viewers.**

Viewers join a queue from chat, que0p draws players fairly, runs automated
ready-up timers, skips AFK players, and tracks a confirmed lobby — with a
transparent OBS overlay to show it all on stream. Works for any game.

**You don't need to run any of this code.** Add the hosted bot to your channel
in one click at **[que0p.stream](https://que0p.stream)**, then type
`/mod que0p` in your chat. Done.

```
streamer: !qopen seq
   que0p: >_ queue open [sequential] — type !qjoin to enter
     zoe: !qjoin
   que0p: > @zoe joined [#1]
streamer: !qdraw
   que0p: >_ @zoe — type !qready within 30s or !qskip to pass
     zoe: !qready
   que0p: > @zoe ready — slot confirmed
```

## Features

- **Fair draws** — sequential (first-come first-served) or random
- **Automated ready-up** — drawn players get 30 seconds to `!qready`; no-shows are requeued automatically and the next player is prompted
- **AFK check** — players who haven't chatted in 10 minutes are skipped on draw (they stay in queue)
- **Lobby tracking** — confirmed players persist across draw rounds so you always know who's in
- **OBS overlay** — transparent browser source with queue, lobby, and live countdown: `que0p.stream/overlay.html?channel=you` (340×620)
- **Live queue page** — viewers follow along at `que0p.stream/queue.html?channel=you`
- **Auto-close** — queues close themselves when the stream goes offline or after 2h of inactivity
- **Multi-channel** — one hosted instance serves every channel

## Commands

| Viewers | |
|---|---|
| `!qjoin` / `!qleave` | Enter / leave the queue |
| `!qpos` | Check your position |
| `!qready` / `!qskip` | Accept or pass when drawn |
| `!qhelp` | Show all commands |

| Mods / Broadcaster | |
|---|---|
| `!qopen seq` / `!qopen ran` | Open the queue (sequential / random) |
| `!qstop` | Close the queue (players kept) |
| `!qdraw [1-5]` | Draw players |
| `!qlist` | View the queue |
| `!qremove <user>` | Remove a player |
| `!qban` / `!qunban` / `!qbanlist` | Manage banned players |
| `!qnext` | New round — lobby back to queue |
| `!qreset` | Wipe queue + lobby |
| `!qpart` | Remove the bot from your channel |

## Safety

Adding que0p asks for a single Twitch permission — `channel:bot` — which lets
it join and send messages in your channel. No access to your account, email,
or streaming controls. Remove it anytime with `!qpart`.

---

## For developers

**Stack:** Node.js + TypeScript, [Twurple](https://twurple.js.org/) (chat + Helix),
Express web server, React + Vite + Tailwind landing page, deployed on Fly.io
with GitHub Actions CI/CD.

```
src/
  index.ts            — entry point: bot + web server
  botActions.ts       — join/leave/say + live-status checks
  auth.ts             — OAuth token load + refresh
  state/              — per-channel state: queue, ready-up, activity, cooldown, stats
  commands/           — one file per !q command
  util/               — helixSay (bot badge), rate limiter, queue watchdog
  web/server.ts       — Express: REST API, OAuth add-channel flow, static hosting
frontend/
  src/App.tsx         — React landing page
  public/             — static pages: queue viewer, overlay, FAQ, channels
```

### Run it yourself

```bash
npm install
cp .env.example .env    # fill in Twitch app credentials (see below)
npm run setup           # OAuth flow → writes tokens.json
npm run dev             # bot + web server on :8080
```

Required env vars: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNEL`
(owner channel), `BOT_USER_ID`. Register an app at
[dev.twitch.tv/console](https://dev.twitch.tv/console). Optional: `APP_URL`
(public URL for the OAuth redirect, default `http://localhost:8080`).

The frontend builds separately: `cd frontend && npm install && npm run build` —
Express serves `frontend/dist/`.

### Deployment

Pushes to `master` deploy automatically to Fly.io via GitHub Actions. Queue
state, tokens, and channel lists persist on a Fly volume at `/data`. See
[CLAUDE.md](CLAUDE.md) for the full architecture and operations reference.

## License

[ISC](LICENSE) — © Jonas Bøgvad ([swisz](https://twitch.tv/swisz))
