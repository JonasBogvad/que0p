import { createBotCommand } from '@twurple/easy-bot';
import * as queue from '../state/queue.js';
import { checkCooldown } from '../state/cooldown.js';

const COOLDOWN_MS = 3000;

export const joinCommand = createBotCommand('join', async (_params, ctx) => {
  if (!checkCooldown(ctx.userName, 'join', COOLDOWN_MS)) return;
  if (!queue.isQueueOpen()) {
    await ctx.say(`❌ @${ctx.userName} the queue is currently closed.`);
    return;
  }
  const position = queue.join(ctx.userName);
  if (position === null) {
    await ctx.say(`❌ @${ctx.userName} you're already in the queue.`);
  } else {
    await ctx.say(`✅ @${ctx.userName} joined the queue! Position: ${position} of ${queue.size()}`);
  }
});
