import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const COOLDOWN_MS = 3000;

export const leaveCommand = createBotCommand('leave', async (_params, ctx) => {
  const { queue, cooldown } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'leave', COOLDOWN_MS)) return;
  const removed = queue.leave(ctx.userName);
  if (removed) {
    await ctx.say(`✅ @${ctx.userName} you've been removed from the queue.`);
  } else {
    await ctx.say(`❌ @${ctx.userName} you're not in the queue.`);
  }
});
