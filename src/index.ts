import 'dotenv/config';
import { Bot } from '@twurple/easy-bot';
import { createAuthProvider } from './auth.js';
import { config } from './config.js';
import * as channels from './state/channels.js';
import { initChannelState, getAllChannelStates } from './state/perChannel.js';
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
import { helpCommand } from './commands/help.js';
import { allowChannelCommand } from './commands/allowchannel.js';
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

  // Init per-channel state for all active channels (loads persisted queues)
  const activeChannels = channels.getActive();
  await Promise.all(activeChannels.map(ch => initChannelState(ch)));

  const authProvider = await loadAuth();

  const bot = new Bot({
    authProvider,
    channels: activeChannels,
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
      helpCommand,
      allowChannelCommand,
      removeChannelCommand,
    ],
  });

  // Patch bot.say to send via Helix API (gets the bot badge) with a rate limiter.
  const helixSay = createHelixSay();
  (bot as unknown as { say: typeof bot.say }).say = createRateLimitedSay(
    (channel: string, text: string) => helixSay(channel, text),
  ) as typeof bot.say;

  setBotInstance(bot);

  bot.onMessage(event => {
    const state = getAllChannelStates().get(event.broadcasterName);
    if (state) state.activity.recordActivity(event.userName);
  });

  bot.onConnect(() => {
    console.log(`[bot] Connected to ${activeChannels.map(c => '#' + c).join(', ')}`);
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
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
