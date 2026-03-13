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
    await ctx.say('❌ Queue is already open.');
    return;
  }

  queue.open(arg);
  const modeName = arg === 'seq' ? 'Sequential' : 'Random';
  await ctx.say(`✅ Queue is now open! Type !join to enter. (${modeName} mode)`);

  queue.startAnnounce(() => {
    void ctx.say(`📋 The queue is open! Type !join to enter. (${modeName} mode)`);
  });
});
