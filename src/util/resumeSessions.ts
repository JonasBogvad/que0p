import { getChannelState, RestoredSession } from '../state/perChannel.js';
import { createAnnounceTick, queueOpenMessage, modeName } from './queueWatchdog.js';
import { sayInChannel, isChannelLive } from '../botActions.js';

/**
 * Called once the bot is connected after a restart. For every channel whose
 * queue was open when the process died: restart the announce loop and tell
 * chat the queue is back, naming anyone who was mid ready-up.
 */
export async function resumeRestoredSessions(sessions: readonly RestoredSession[]): Promise<void> {
  for (const session of sessions) {
    const { channel, mode, returnedToFront } = session;
    const { queue } = getChannelState(channel);
    if (!queue.isQueueOpen()) continue;

    const announce = queueOpenMessage(mode);
    queue.startAnnounce(createAnnounceTick(
      channel,
      () => sayInChannel(channel, announce),
      msg => sayInChannel(channel, msg),
    ));

    const size = queue.size();
    console.log(`[restore] Resumed open queue in #${channel} (${size} in queue, ${returnedToFront.length} returned to front)`);

    // Offline streams get no notice: the watchdog closes the queue shortly anyway.
    if (await isChannelLive(channel) === false) continue;
    sayInChannel(channel, `> bot restarted — queue restored [${modeName(mode)}], ${size} in queue`);
    if (returnedToFront.length > 0) {
      const names = returnedToFront.map(l => `@${l}`).join(', ');
      const where = mode === 'seq' ? 'returned to front of queue' : 'back in the queue';
      sayInChannel(channel, `> ${names} were waiting to ready up — ${where}, !qdraw to redraw`);
    }
  }
}
