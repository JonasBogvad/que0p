import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const openCommand = createBotCommand('open', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const arg = params[0]?.toLowerCase();
  if (arg !== 'seq' && arg !== 'ran') {
    await ctx.say('Usage: !open seq or !open ran');
    return;
  }

  const { queue } = getChannelState(ctx.broadcasterName);
  if (queue.isQueueOpen()) {
    await ctx.say('> queue already open');
    return;
  }

  queue.open(arg);
  const modeName = arg === 'seq' ? 'sequential' : 'random';
  console.log(`[cmd] ${ctx.userName} opened queue in #${ctx.broadcasterName} (${modeName})`);
  await ctx.say(`> queue open [${modeName}] — type !join to enter`);

  queue.startAnnounce(() => {
    void ctx.say(`> queue open [${modeName}] — type !join to enter`);
  });
});
