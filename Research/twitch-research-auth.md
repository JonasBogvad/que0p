# Twitch Chat Bot — Developer Research Notes

> Researched from official Twitch Developer docs (dev.twitch.tv) — March 2026

---

## 1. App Registration (Prerequisite)

Before any OAuth flow, register an application at [dev.twitch.tv/console](https://dev.twitch.tv/console):

- Gives you a `client_id` and `client_secret`
- Set a redirect URI (e.g. `http://localhost:3000/callback` for local dev)
- No special "bot" app type — just a regular application

No special bot account registration is required to start. Any Twitch account acting as the bot + a registered app is enough.

---

## 2. Authentication / OAuth

### Recommended Flow: Authorization Code Grant

For server-side bots (server can store a secret and make server-to-server calls):

```
1. Redirect bot account owner to:
   https://id.twitch.tv/oauth2/authorize
     ?client_id=<CLIENT_ID>
     &redirect_uri=<REDIRECT_URI>
     &response_type=code
     &scope=user:bot+user:read:chat+user:write:chat

2. Exchange code for tokens:
   POST https://id.twitch.tv/oauth2/token
     client_id=<CLIENT_ID>
     &client_secret=<CLIENT_SECRET>
     &code=<CODE>
     &grant_type=authorization_code
     &redirect_uri=<REDIRECT_URI>

3. Response: { access_token, refresh_token, expires_in, scope, token_type }
```

Validate tokens before use:
```
GET https://id.twitch.tv/oauth2/validate
Authorization: OAuth <access_token>
```

### App Access Token (Client Credentials)

Used for EventSub **webhook** transport (not WebSocket). Not needed for a WebSocket-based bot.

```
POST https://id.twitch.tv/oauth2/token
  client_id=<CLIENT_ID>
  &client_secret=<CLIENT_SECRET>
  &grant_type=client_credentials
```

### Token Types Summary

| Token Type | When to Use |
|---|---|
| **User Access Token** | Sending chat, reading chat via EventSub WebSocket, chatters list |
| **App Access Token** | EventSub webhook subscriptions, endpoints not requiring user permission |

---

## 3. OAuth Scopes

### Core Bot Scopes (on the bot's User Access Token)

| Scope | Purpose |
|---|---|
| `user:bot` | Bot appears with bot badge; joins channels as a bot identity |
| `user:read:chat` | Receive chat messages and notifications via EventSub |
| `user:write:chat` | Send chat messages via the REST API (`POST /helix/chat/messages`) |

### Broadcaster-Granted Scope

| Scope | Who Grants | Purpose |
|---|---|---|
| `channel:bot` | **Broadcaster** (separate OAuth flow) | Authorizes bot in their channel; required for the bot badge to display |

The broadcaster must complete their own OAuth to grant `channel:bot` to your bot's `client_id`.

### Legacy IRC Scopes (only if using old IRC path)

| Scope | Purpose |
|---|---|
| `chat:read` | Read chat via IRC connection |
| `chat:edit` | Send chat messages via IRC |

### Moderation Scopes (optional, for chatters list)

| Scope | Purpose |
|---|---|
| `moderator:read:chatters` | View chatters list in a channel where you are a moderator |
| `moderator:manage:chat_messages` | Delete chat messages |
| `moderator:read:chat_settings` | View chat room settings |
| `moderator:manage:chat_settings` | Manage chat room settings |

---

## 4. Chat Connection — EventSub vs IRC

### Twitch's Official Recommendation

> "The preferred method of viewing and sending chats on Twitch is through **EventSub and the Twitch API**."

IRC is described as a **legacy option with limited features**. All new bots should use EventSub + the REST API.

---

### Modern Approach: EventSub WebSocket (Recommended)

#### Reading Chat

Connect to the EventSub WebSocket:
```
wss://eventsub.wss.twitch.tv/ws
```

On connect, you receive a `session_welcome` message with a `session_id`. Use that to subscribe:

```
POST https://api.twitch.tv/helix/eventsub/subscriptions
Authorization: Bearer <user_access_token>
Client-Id: <CLIENT_ID>
Content-Type: application/json

{
  "type": "channel.chat.message",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "<CHANNEL_USER_ID>",
    "user_id": "<BOT_USER_ID>"
  },
  "transport": {
    "method": "websocket",
    "session_id": "<SESSION_ID>"
  }
}
```

Required scopes: `user:read:chat` (on bot token) + `user:bot` + broadcaster must have granted `channel:bot`.

#### Sending Chat

```
POST https://api.twitch.tv/helix/chat/messages
Authorization: Bearer <user_access_token>
Client-Id: <CLIENT_ID>
Content-Type: application/json

{
  "broadcaster_id": "<CHANNEL_USER_ID>",
  "sender_id": "<BOT_USER_ID>",
  "message": "Hello chat!"
}
```

- Max message length: **500 characters**
- Required scope: `user:write:chat`
- `sender_id` must match the user ID of the access token

---

### EventSub Subscription Types for Chat

| Type | Trigger | Required Scope |
|---|---|---|
| `channel.chat.message` | Any user sends a message | `user:read:chat` |
| `channel.chat.notification` | Sub, gift sub, raid, etc. | `user:read:chat` |
| `channel.chat.clear` | Chat cleared by mod/bot | `user:read:chat` |
| `channel.chat.clear_user_messages` | Mod clears specific user's messages | `user:read:chat` |
| `channel.chat.message_delete` | Specific message deleted by mod | `user:read:chat` |
| `channel.chat_settings.update` | Chat settings changed | `user:read:chat` |
| `channel.chat.user_message_hold` | Message caught by AutoMod | `user:read:chat` + `user:bot` |
| `channel.chat.user_message_update` | AutoMod status update | `user:read:chat` |

All types support both **WebSocket** and **Webhook** transport.

For app access tokens (webhook), additionally required: `user:bot` on bot + either `channel:bot` granted by broadcaster or bot has moderator role.

---

### Legacy IRC (Still Works, Not Recommended)

```
# Connect
irc.chat.twitch.tv:6667       # plain text
irc.chat.twitch.tv:6697       # TLS

# Auth sequence
PASS oauth:<user_access_token>
NICK <bot_username>
JOIN #<channel_name>

# Send message
PRIVMSG #<channel_name> :Hello chat!

# Request Twitch-specific IRC capabilities
CAP REQ :twitch.tv/membership   # JOIN/PART events
CAP REQ :twitch.tv/tags         # message metadata (badges, emotes, etc.)
CAP REQ :twitch.tv/commands     # CLEARCHAT, USERNOTICE, etc.
```

IRC limitations vs EventSub:
- Fewer events/metadata available
- No built-in reconnect guarantees
- Twitch is not actively developing IRC features

---

## 5. Checking User Presence (Chatters List)

### Endpoint

```
GET https://api.twitch.tv/helix/chat/chatters
  ?broadcaster_id=<CHANNEL_USER_ID>
  &moderator_id=<BOT_OR_MOD_USER_ID>
  &first=100          # optional, 1-100, default 20
  &after=<cursor>     # optional, pagination
```

**Required scope**: `moderator:read:chatters`
**Auth**: User Access Token where the token's user ID = `moderator_id`

**Critical constraint**: `moderator_id` must be a user who is actually a **moderator** (or the broadcaster) in that channel. Your bot must be modded to use this endpoint.

### Response

```json
{
  "data": [
    { "user_id": "12345", "user_login": "someuser", "user_name": "SomeUser" }
  ],
  "pagination": { "cursor": "eyJ..." },
  "total": 42
}
```

Returns all users currently **connected** to the chat session (not just actively chatting).

---

## 6. Rate Limits

### Message Rate Limits

| Bot Status | Global Rate | Per-Channel Rate | Max Concurrent Channels | Join Rate |
|---|---|---|---|---|
| **Regular / Unverified** | 20 msg / 30s | 1 msg / sec | 100 | 20 joins / 10s |
| **Moderator / VIP / Broadcaster** | 100 msg / 30s | 1 msg / sec | — | — |
| **Verified Bot** | 7,500 msg / 30s | 1 msg / sec | — | 2,000 joins / 10s |

### REST API Rate Limits

- General Twitch API: **800 requests / 60s** per client-id + token pair
- `POST /helix/chat/messages` has its **own separate rate limit bucket** (independent from the general 800/60s limit)
- `429 Too Many Requests` response when exceeded; check `Ratelimit-Reset` header

### EventSub Limits

- Max **3 subscriptions per unique topic** (broadcaster+bot pair)
- Max **300 total subscriptions** per client-id
- WebSocket connections: up to **100 subscriptions per WebSocket session**

---

## 7. Bot Registration & Verification

### Starting Out (No Special Registration)

1. Create a Twitch account to serve as the bot identity
2. Register an app at dev.twitch.tv/console
3. Complete OAuth for the bot account
4. Start sending/receiving — no approval needed

### Verified Bot Status (Higher Rate Limits)

Verified bots get 7,500 msg/30s and 2,000 joins/10s.

**Current status**: Twitch has **temporarily paused** verification reviews:
> "Reviews for chatbot verification continue to be temporarily paused while we revise our processes."

When available again: submit a request form on the IRC Command and Message Rate page once your bot is approaching rate limits.

### Bot Badge in Chat

For the bot to appear with the wrench/bot badge:
1. Bot token must include `user:bot` scope
2. Broadcaster must authorize the bot with `channel:bot` scope (they complete their own OAuth)
3. Use an **App Access Token** (not User Access Token) when creating the EventSub subscription for the badge to display correctly

---

## 8. Recommended Architecture for a New Bot

```
┌─────────────────────────────────────────────────────────┐
│ Startup                                                  │
│  1. Auth Code flow → User Access Token for bot account  │
│     Scopes: user:bot, user:read:chat, user:write:chat   │
│  2. Broadcaster completes OAuth → grants channel:bot    │
│     (one-time setup per channel)                        │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│ Reading Messages                                        │
│  → Connect to wss://eventsub.wss.twitch.tv/ws           │
│  → Subscribe to channel.chat.message via REST           │
│  → Handle session_keepalive, reconnect events           │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│ Sending Messages                                        │
│  → POST /helix/chat/messages                            │
│  → Respect 1 msg/sec per-channel + 20 msg/30s global   │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│ Checking Chatters (optional)                            │
│  → GET /helix/chat/chatters                             │
│  → Bot must be modded in the channel                   │
│  → Scope: moderator:read:chatters                       │
└─────────────────────────────────────────────────────────┘
```

### Summary: Don't Use IRC for New Bots

| Feature | IRC | EventSub + REST API |
|---|---|---|
| Read chat | `chat:read` scope | `user:read:chat` scope |
| Send chat | `chat:edit` scope | `user:write:chat` scope |
| Rich metadata | Partial (CAP tags) | Full (EventSub payload) |
| Sub/raid events | USERNOTICE (limited) | `channel.chat.notification` |
| Twitch support | Legacy, limited | Actively developed |
| Reconnect handling | Manual | Built-in (reconnect events) |

---

## 9. Key API Endpoints Reference

| Action | Method | Endpoint |
|---|---|---|
| Send message | POST | `/helix/chat/messages` |
| Get chatters | GET | `/helix/chat/chatters` |
| Get chat settings | GET | `/helix/chat/settings` |
| Update chat settings | PATCH | `/helix/chat/settings` |
| Delete message | DELETE | `/helix/moderation/chat` |
| Create EventSub sub | POST | `/helix/eventsub/subscriptions` |
| List EventSub subs | GET | `/helix/eventsub/subscriptions` |
| Validate token | GET | `https://id.twitch.tv/oauth2/validate` |
| Get users (resolve username→id) | GET | `/helix/users?login=<name>` |

All `/helix/` endpoints require:
- `Authorization: Bearer <token>`
- `Client-Id: <client_id>`
