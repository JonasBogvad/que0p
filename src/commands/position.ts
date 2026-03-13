import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const COOLDOWN_MS = 3000;

export const positionCommand = createBotCommand('qpos', async (_params, ctx) => {
  const { queue, cooldown } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'qpos', COOLDOWN_MS)) return;
  const list = queue.list();
  const idx = list.indexOf(ctx.userName);
  if (idx === -1) {
    await ctx.say(`> @${ctx.userName} not in queue — type !qjoin`);
  } else {
    await ctx.say(`> @${ctx.userName} #${idx + 1} of ${list.length}`);
  }
});
