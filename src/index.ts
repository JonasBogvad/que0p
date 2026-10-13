import 'dotenv/config';
import { Bot } from '@twurple/easy-bot';
import { createAuthProvider } from './auth.js';
import { config } from './config.js';
import * as channels from './state/channels.js';
import { loadStats, incrementCommandsUsed } from './state/stats.js';
import { initChannelState, getAllChannelStates, RestoredSession } from './state/perChannel.js';
import { resumeRestoredSessions } from './util/resumeSessions.js';
import { setBotInstance } from './botActions.js';
import { createRateLimitedSay } from './util/rateLimiter.js';
import { createHelixSay } from './util/helixSay.js';
import { startWebServer } from './web/server.js';
import { joinCommand } from './commands/join.js';
import { leaveCommand } from './commands/leave.js';
import { positionCommand } from './commands/position.js';
import { drawCommand } from './commands/draw.js';
import { queueCommand } from './commands/queue.js';
import { openCommand } from './commands/open.js';
import { stopCommand } from './commands/stop.js';
import { readyCommand } from './commands/ready.js';
import { skipCommand } from './commands/skip.js';
import { resetCommand } from './commands/reset.js';
import { nextroundCommand } from './commands/nextround.js';
import { removeCommand } from './commands/remove.js';
import { banCommand, unbanCommand, banlistCommand } from './commands/ban.js';
import { helpCommand } from './commands/help.js';
import { allowChannelCommand } from './commands/allowchannel.js';
import { approvedListCommand } from './commands/approvedlist.js';
import { removeChannelCommand } from './commands/removechannel.js';

async function loadAuth() {
  try {
    return await createAuthProvider();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.error('❌ tokens.json not found. Run `npm run setup` first to authorize the bot.');
    } else {
      console.error('❌ Failed to load auth tokens:', err);
    }
    process.exit(1);
  }
}

async function main() {
  console.log('Bot starting...');

  // Load persisted channel lists (owner channel always included)
  await channels.loadChannels();
  await loadStats();

  // Init per-channel state for all active channels (loads persisted sessions).
  // Queues that were open when the process died are resumed once connected.
  const activeChannels = channels.getActive();
  const restoredSessions = (await Promise.all(activeChannels.map(ch => initChannelState(ch))))
    .filter((s): s is RestoredSession => s !== null);

  const authProvider = await loadAuth();

  const bot = new Bot({
    authProvider,
    // Pass a resolver, not a static array: ircv3 re-resolves it on every (re)connect,
    // so channels added via /add-channel after boot are rejoined after a socket drop.
    channels: () => channels.getActive(),
    emitCommandMessageEvents: true,
    commands: [
      joinCommand,
      leaveCommand,
      positionCommand,
      drawCommand,
      queueCommand,
      openCommand,
      stopCommand,
      readyCommand,
      skipCommand,
      resetCommand,
      nextroundCommand,
      removeCommand,
      banCommand,
      unbanCommand,
      banlistCommand,
      helpCommand,
      allowChannelCommand,
      approvedListCommand,
      removeChannelCommand,
    ],
  });

  // Patch bot.say to send via Helix API (gets the bot badge) with a rate limiter.
  // authProvider.getAccessTokenForUser() always returns a valid/refreshed token.
  const helixSay = createHelixSay(authProvider);
  (bot as unknown as { say: typeof bot.say }).say = createRateLimitedSay(
    (channel: string, text: string) => helixSay(channel, text),
  ) as typeof bot.say;

  setBotInstance(bot);

  bot.onMessage(event => {
    const state = getAllChannelStates().get(event.broadcasterName);
    if (state) state.activity.recordActivity(event.userName);
    if (event.text.startsWith('!q')) void incrementCommandsUsed();
  });

  let resumed = false;
  bot.onConnect(() => {
    console.log(`[bot] Connected — joining ${channels.getActive().map(c => '#' + c).join(', ')}`);
    // onConnect also fires on every reconnect; only the first connect resumes sessions.
    if (!resumed) {
      resumed = true;
      void resumeRestoredSessions(restoredSessions);
    }
  });

  bot.onDisconnect((manually, reason) => {
    if (!manually) {
      console.error('[bot] Disconnected unexpectedly:', reason);
    }
  });

  startWebServer();

  const shutdown = () => {
    console.log('\n[bot] Shutting down...');
    for (const ch of channels.getActive()) {
      bot.leave(ch);
    }
    // Let in-flight snapshot writes land so the next boot sees the latest state.
    Promise.all([...getAllChannelStates().values()].map(s => s.flush()))
      .catch(err => console.error('[bot] Flush on shutdown failed:', err))
      .finally(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
