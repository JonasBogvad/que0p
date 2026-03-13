import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const resetCommand = createBotCommand('reset', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  const { queue, readyup } = getChannelState(ctx.broadcasterName);
  readyup.cancelAll();
  queue.stopAnnounce();
  queue.close();
  queue.clear();
  console.log(`[cmd] ${ctx.userName} reset queue in #${ctx.broadcasterName}`);
  await ctx.say('🔄 Queue wiped. Starting fresh!');
});
