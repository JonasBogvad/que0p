import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const removeCommand = createBotCommand('remove', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const target = params[0]?.toLowerCase().replace(/^@/, '');
  if (!target) {
    await ctx.say('> usage: !remove <user>');
    return;
  }

  const { queue } = getChannelState(ctx.broadcasterName);
  const removed = queue.leave(target);

  if (removed) {
    console.log(`[cmd] ${ctx.userName} removed ${target} from queue in #${ctx.broadcasterName}`);
    await ctx.say(`> ${target} removed from queue`);
  } else {
    await ctx.say(`> ${target} is not in the queue`);
  }
});
