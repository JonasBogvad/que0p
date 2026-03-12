# Spec: Queue v2 — Mode System, Multi-Draw, and UX Improvements

## Overview

Rework the queue bot to support two distinct modes (**sequential** and **random**), allow drawing multiple winners at once, shorten the ready-up window, let drawn viewers decline, and auto-announce while the queue is open.

---

## Queue Modes

The queue now operates in one of two modes, set when opened:

| Mode | Trigger | Draw behavior |
|------|---------|---------------|
| **Sequential** (`seq`) | `!open seq` | `!draw` picks the **next person in queue order** (FIFO) |
| **Random** (`ran`) | `!open ran` | `!draw` picks a **random eligible viewer** (current behavior) |

- Only **one** mode can be active at a time.
- The mode is locked for the duration of the session (until `!stop`).
- `!open` with no argument should reply with usage: `"Usage: !open seq or !open ran"`.

---

## Commands

### Viewer commands (3s per-user cooldown, silent ignore)

| Command | Description |
|---------|-------------|
| `!join` | Join the queue. Rejected if queue is closed. |
| `!leave` | Leave the queue. |
| `!pos` | Show your position in the queue. |
| `!help` | Show available commands (30s cooldown). |
| `!ready` | Confirm you're ready after being drawn (30s window). |
| `!decline` | Decline after being drawn — skips you, triggers next draw. |

### Mod / Broadcaster commands (no cooldown)

| Command | Syntax | Description |
|---------|--------|-------------|
| `!open` | `!open seq` or `!open ran` | Open the queue in sequential or random mode. Starts the 60s auto-announce loop. |
| `!stop` | `!stop` | Close the queue, cancel any pending ready-up, stop auto-announce. **Replaces `!close`.** |
| `!draw` | `!draw` or `!draw <N>` | Draw 1–5 winners. `N` defaults to 1 if omitted. |
| `!queue` | `!queue` | Show the current queue and its mode. |
| `!skip` | `!skip` | Skip the current pending winner(s) and re-draw. |
| `!reset` | `!reset` | Clear the entire queue, cancel everything. |

---

## Detailed Behavior Changes

### 1. `!open seq` / `!open ran`

- **Current:** `!open` takes no args, opens queue with random draw.
- **New:** Requires `seq` or `ran` argument. No argument → show usage message.
- Queue state stores the active mode (`"seq"` | `"ran"`).
- On open, start a **60-second repeating announce** in chat:
  > `"📋 The queue is open! Type !join to enter. ([Sequential/Random] mode)"`
- The announce loop stops when `!stop` or `!reset` is called.

### 2. `!stop` (replaces `!close`)

- Closes the queue.
- Cancels any pending ready-up timers.
- Stops the 60s auto-announce loop.
- Remove the `!close` command entirely.

### 3. `!draw <N>` — multi-draw

- `N` is optional, defaults to `1`. Valid range: `1–5`.
- If `N > queue size`, draw everyone available (don't error).
- **Sequential mode:** draws the next `N` viewers in queue order (FIFO). Activity check still applies — skip inactive viewers silently.
- **Random mode:** draws `N` random eligible viewers (chatted in last 10 min).
- Each drawn viewer enters the ready-up flow **one at a time, sequentially**:
  1. Announce first winner → wait for `!ready` / `!decline` / timeout.
  2. Once resolved, announce second winner → wait... and so on.
  3. If a winner times out or declines, they are skipped (no re-draw for that slot — the slot is simply lost).
- If no eligible viewers remain mid-draw, announce it and stop.

### 4. Ready-up: 30 seconds + `!decline`

- **Current:** 75-second timeout, auto re-draw on timeout.
- **New:**
  - **30-second** timeout.
  - On timeout: winner is skipped, **no automatic re-draw** (slot is lost in multi-draw context).
  - New `!decline` command: the drawn viewer can explicitly decline. Same effect as timeout — skipped, move to next slot.
  - `!ready` confirms as before.
  - `!skip` (mod) still force-skips the current pending winner.

### 5. `!queue` — mod/broadcaster only

- **Current:** anyone can use (with cooldown).
- **New:** restricted to **mod / broadcaster only**.
- Show the mode in output: `"📋 Queue [Open – Random] (5): 1. user1, 2. user2, ..."`

### 6. Auto-announce loop

- When queue opens, bot sends a message every **60 seconds** reminding chat to join.
- Uses the existing message rate limiter (1.1s gap).
- Stops on `!stop` or `!reset`.
- Does **not** announce if the queue is empty (optional — could still announce to attract joiners).

---

## Commands Removed

| Command | Replacement |
|---------|-------------|
| `!close` | `!stop` |

---

## State Changes

The queue state module needs to track:
- `mode: 'seq' | 'ran' | null` — current mode, `null` when closed
- `announceTimer: ReturnType<typeof setInterval> | null` — the 60s loop handle

The ready-up state module needs:
- Timeout changed from `75_000` → `30_000`
- On timeout: call a "slot lost" callback instead of auto re-draw
- Support a pending *list* of winners (for multi-draw), processed sequentially

---

## Edge Cases

- `!draw 3` when only 2 eligible viewers exist → draw 2, announce "only 2 eligible"
- `!draw` while a ready-up is pending → reject with current message
- `!open ran` while already open → reject: "Queue is already open"
- `!join` after being drawn (removed from queue) → allowed, re-enters queue
- `!stop` while draws are in progress → cancel all pending ready-ups, close queue
- `!decline` from a non-pending user → silently ignored
- `!draw` with `N=0` or `N>5` or non-numeric → reply with usage: `"Usage: !draw or !draw 1-5"`
