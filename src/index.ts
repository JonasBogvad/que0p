import 'dotenv/config';
import { createServer } from 'node:http';
import { Bot } from '@twurple/easy-bot';
import { createAuthProvider } from './auth.js';
import { config } from './config.js';
import * as activity from './state/activity.js';
import * as queue from './state/queue.js';
import { loadPersistedQueue } from './state/queue.js';
import { createRateLimitedSay } from './util/rateLimiter.js';
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

function startHealthServer(isConnected: () => boolean): void {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const body = JSON.stringify({
        status: 'ok',
        connected: isConnected(),
        uptime: process.uptime(),
        queueSize: queue.size(),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(8080, () => {
    console.log('[health] Server listening on :8080');
  });
}

async function main() {
  console.log('Bot starting...');

  await loadPersistedQueue();
  const authProvider = await loadAuth();

  let botConnected = false;

  const bot = new Bot({
    authProvider,
    channel: config.channel,
    // Emit onMessage even for command messages so activity tracking fires for everyone.
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
    ],
  });

  // Patch bot.say with a rate limiter (1.1s minimum gap).
  // ctx.say in every command calls this._bot.say(), so all outgoing messages are covered.
  (bot as unknown as { say: typeof bot.say }).say = createRateLimitedSay(bot.say.bind(bot));

  bot.onMessage(event => {
    activity.recordActivity(event.userName);
  });

  bot.onConnect(() => {
    botConnected = true;
    console.log(`[bot] Connected to #${config.channel}`);
  });

  bot.onDisconnect((manually, reason) => {
    botConnected = false;
    if (!manually) {
      console.error('[bot] Disconnected unexpectedly:', reason);
    }
  });

  startHealthServer(() => botConnected);

  const shutdown = () => {
    console.log('\n[bot] Shutting down...');
    bot.leave(config.channel);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
