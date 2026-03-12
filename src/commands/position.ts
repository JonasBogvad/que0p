import { createBotCommand } from '@twurple/easy-bot';
import * as queue from '../state/queue.js';
import { checkCooldown } from '../state/cooldown.js';

const COOLDOWN_MS = 3000;

export const positionCommand = createBotCommand('pos', async (_params, ctx) => {
  if (!checkCooldown(ctx.userName, 'pos', COOLDOWN_MS)) return;
  const list = queue.list();
  const idx = list.indexOf(ctx.userName);
  if (idx === -1) {
    await ctx.say(`📋 @${ctx.userName} you're not in the queue.`);
  } else {
    await ctx.say(`📋 @${ctx.userName} you're #${idx + 1} of ${list.length} in the queue.`);
  }
});
