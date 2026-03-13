import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';
import { incrementPlayersJoined } from '../state/stats.js';

const COOLDOWN_MS = 3000;

export const joinCommand = createBotCommand('qjoin', async (_params, ctx) => {
  const { queue, cooldown, banlist } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'qjoin', COOLDOWN_MS)) return;
  if (banlist.isBanned(ctx.userName)) {
    await ctx.say(`> @${ctx.userName} you are banned from this queue`);
    return;
  }
  if (!queue.isQueueOpen()) {
    await ctx.say(`> @${ctx.userName} queue is closed`);
    return;
  }
  const position = queue.join(ctx.userName);
  if (position === null) {
    await ctx.say(`> @${ctx.userName} already in queue`);
  } else {
    void incrementPlayersJoined();
    await ctx.say(`> @${ctx.userName} joined [#${position} of ${queue.size()}]`);
  }
});
