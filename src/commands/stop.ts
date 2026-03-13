import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const stopCommand = createBotCommand('qstop', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  const { queue, readyup } = getChannelState(ctx.broadcasterName);
  readyup.cancelAll();
  queue.stopAnnounce();
  queue.close();
  console.log(`[cmd] ${ctx.userName} closed queue in #${ctx.broadcasterName}`);
  await ctx.say('> queue closed');
});
