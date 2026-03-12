# Twitch CS Queue / Lottery Bot

A Twitch chat bot for managing viewer queues and running lottery draws. Built with TypeScript, Node.js, and [Twurple](https://twurple.js.org/).

## Features

- **Queue management** — viewers use `!join`, `!leave`, and `!pos` to manage their spot
- **Queue visibility** — `!queue` shows the current queue
- **Mod controls** — `!open` / `!close` to control queue access, `!reset` to clear
- **Lottery draw** — `!draw` picks a random winner from the queue
- **Activity filtering** — only viewers who chatted in the last 10 minutes are eligible for draws
- **Ready-up system** — drawn winners must type `!ready` within 75 seconds or get auto-skipped
- **Auto re-draw** — if a winner times out, the bot automatically draws again
- **Help command** — `!help` lists all available commands (30s cooldown)
- **Cooldown system** — 3-second per-user cooldown on viewer commands (silently ignored if too fast)
- **Message rate limiter** — 1.1-second minimum gap between bot messages to avoid Twitch throttling
- **Chat formatting** — emoji prefixes for readability (⚔️ draws, 📋 queue, ✅/❌ confirmations)
- **Queue persistence** — the queue survives bot restarts via `queue.json`
- **Automatic OAuth token refresh** — tokens are refreshed and saved automatically

## Prerequisites

- **Node.js 20+**
- A **Twitch account** for the bot (can be your own account)
- A Twitch application registered at [dev.twitch.tv/console](https://dev.twitch.tv/console)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd twitch-que
npm install
```

### 2. Register a Twitch application

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console) and create a new application
2. Set the **OAuth Redirect URL** to `http://localhost:3000` (or any URL you control)
3. Note your **Client ID** and generate a **Client Secret**

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_CHANNEL=your_channel_name
BOT_USER_ID=numeric_bot_user_id
```

- `TWITCH_CHANNEL` — the channel the bot joins (lowercase, no `#` prefix)
- `BOT_USER_ID` — the numeric Twitch user ID of the bot account (use the [Twitch ID lookup](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) or the Twitch API)

### 4. Generate initial tokens

Run the built-in setup script to authorize the bot and generate `tokens.json`:

```bash
npm run setup
```

This opens a browser for Twitch OAuth, then saves the tokens locally. The bot will automatically refresh and update this file going forward.

> **Manual alternative:** create a `tokens.json` file in the project root with a user access token (`chat:read` + `chat:edit` scopes) obtained via the [Twitch Token Generator](https://twitchtokengenerator.com/) or the Twitch CLI:
>
> ```json
> {
>   "accessToken": "your_access_token",
>   "refreshToken": "your_refresh_token",
>   "expiresIn": 0,
>   "obtainmentTimestamp": 0
> }
> ```

### 5. Run the bot

**Development** (auto-reload on changes):

```bash
npm run dev
```

**Production**:

```bash
npm run build
npm start
```

## Commands

| Command | Who | Description |
|---------|-----|-------------|
| `!join` | Everyone | Join the queue |
| `!leave` | Everyone | Leave the queue |
| `!pos` | Everyone | Check your position |
| `!queue` | Everyone | View the current queue |
| `!help` | Everyone | Show available commands (30s cooldown) |
| `!ready` | Drawn user | Confirm within 75 seconds after being drawn |
| `!open` | Mod / Broadcaster | Open the queue for joins |
| `!close` | Mod / Broadcaster | Close the queue |
| `!draw` | Mod / Broadcaster | Draw a random eligible winner |
| `!skip` | Mod / Broadcaster | Skip the current pending winner |
| `!reset` | Mod / Broadcaster | Clear the entire queue |

## Project Structure

```
src/
  index.ts          — entry point, bot setup
  config.ts         — environment variable loading
  auth.ts           — OAuth token management
  state/
    queue.ts        — queue data + persistence
    activity.ts     — chat activity tracking (10 min window)
    readyup.ts      — ready-up timer logic
  commands/
    join.ts         — !join
    leave.ts        — !leave
    position.ts     — !pos
    queue.ts        — !queue
    draw.ts         — !draw
    open.ts         — !open
    close.ts        — !close
    ready.ts        — !ready
    skip.ts         — !skip
    reset.ts        — !reset
    help.ts         — !help
```

## Deployment (Fly.io)

The bot runs as an always-on container on [Fly.io](https://fly.io) (free tier).

### Prerequisites

- [flyctl CLI](https://fly.io/docs/flyctl/install/) installed
- Fly.io account (`fly auth login`)

### First-time setup

1. Create the app and volume:

```bash
fly apps create twitch-que
fly volumes create bot_data --region ord --size 1
```

2. Set your secrets (these replace .env on Fly):

```bash
fly secrets set TWITCH_CLIENT_ID=your_client_id
fly secrets set TWITCH_CLIENT_SECRET=your_client_secret
fly secrets set TWITCH_CHANNEL=your_channel
fly secrets set BOT_USER_ID=your_bot_user_id
```

3. Upload your tokens.json to the volume:

```bash
# First deploy to create the machine
fly deploy

# Then copy tokens.json to the persistent volume
fly ssh console -C "cat > /data/tokens.json" < tokens.json
```

4. Restart to pick up tokens:

```bash
fly apps restart twitch-que
```

### Updating

```bash
fly deploy
```

### Monitoring

```bash
fly logs            # Live logs
fly status          # Machine status
fly ssh console     # SSH into the container
curl https://twitch-que.fly.dev/health  # Health check
```

### Notes

- Queue data and tokens persist on a Fly volume at `/data/`
- The bot auto-restarts if it crashes
- Health endpoint on port 8080 reports connection status
- Free tier: 3 shared-cpu-1x VMs with 256MB RAM each — this bot only needs 1

## License

ISC
