import { getChannelState } from '../state/perChannel.js';
import { isChannelLive } from '../botActions.js';

// Announce ticks fire every 60s (see queue.startAnnounce), so ticks ≈ minutes.
const OFFLINE_TICKS_TO_CLOSE = 10;
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export type SayFn = (msg: string) => void;

/**
 * Wraps the queue-open announce loop with auto-close guards:
 * - stream offline for ~10 consecutive minutes → close queue
 * - no queue activity (open/join/leave/draw) for 2h → close queue
 * While the stream is offline the periodic announce is suppressed so the
 * bot never spams an empty chat during the grace period.
 */
export function createAnnounceTick(channel: string, announce: () => void, say: SayFn): () => void {
  let _offlineTicks = 0;

  function autoClose(reason: string): void {
    const { queue, readyup } = getChannelState(channel);
    readyup.cancelAll();
    queue.stopAnnounce();
    queue.close();
    console.log(`[watchdog] Auto-closed queue in #${channel} (${reason})`);
    say(`> queue auto-closed [${reason}]`);
  }

  async function tick(): Promise<void> {
    const { queue } = getChannelState(channel);
    if (!queue.isQueueOpen()) {
      queue.stopAnnounce();
      return;
    }

    if (Date.now() - queue.getLastActivityAt() >= INACTIVITY_TIMEOUT_MS) {
      autoClose('inactive 2h');
      return;
    }

    const gen = queue.getAnnounceGen();
    const live = await isChannelLive(channel);
    // The queue may have been stopped (or stopped and reopened) while we
    // awaited — a stale tick must not touch the new session's state.
    if (queue.getAnnounceGen() !== gen || !queue.isQueueOpen()) return;

    if (live === false) {
      _offlineTicks++;
      if (_offlineTicks >= OFFLINE_TICKS_TO_CLOSE) {
        autoClose('stream offline');
      }
      return;
    }

    // live === null (status unknown) keeps the current offline count.
    if (live === true) _offlineTicks = 0;
    announce();
  }

  let _inFlight = false;
  return () => {
    if (_inFlight) return;
    _inFlight = true;
    tick()
      .catch(err => console.error(`[watchdog] Tick failed for #${channel}:`, err))
      .finally(() => { _inFlight = false; });
  };
}
