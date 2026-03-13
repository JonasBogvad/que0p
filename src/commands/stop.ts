import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const stopCommand = createBotCommand('stop', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  const { queue, readyup } = getChannelState(ctx.broadcasterName);
  readyup.cancelAll();
  queue.stopAnnounce();
  queue.close();
  await ctx.say('🚫 Queue closed. GGs!');
});
