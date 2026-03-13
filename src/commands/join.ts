import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const COOLDOWN_MS = 3000;

export const joinCommand = createBotCommand('join', async (_params, ctx) => {
  const { queue, cooldown } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'join', COOLDOWN_MS)) return;
  if (!queue.isQueueOpen()) {
    await ctx.say(`❌ @${ctx.userName} queue is closed — no lobby right now!`);
    return;
  }
  const position = queue.join(ctx.userName);
  if (position === null) {
    await ctx.say(`❌ @${ctx.userName} you're already in the queue, chill!`);
  } else {
    await ctx.say(`☠️ @${ctx.userName} locked and loaded! You're #${position} of ${queue.size()} in the queue.`);
  }
});
