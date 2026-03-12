import { createBotCommand } from '@twurple/easy-bot';
import * as queue from '../state/queue.js';

export const openCommand = createBotCommand('open', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const arg = params[0]?.toLowerCase();
  if (arg !== 'seq' && arg !== 'ran') {
    await ctx.say('Usage: !open seq or !open ran');
    return;
  }

  if (queue.isQueueOpen()) {
    await ctx.say('❌ Queue is already open.');
    return;
  }

  queue.open(arg);
  const modeName = arg === 'seq' ? 'Sequential' : 'Random';
  await ctx.say(`✅ Queue is now open! Type !join to enter. (${modeName} mode)`);

  // Start 60s auto-announce. ctx.say persists (calls this._bot.say internally).
  queue.startAnnounce(() => {
    void ctx.say(`📋 The queue is open! Type !join to enter. (${modeName} mode)`);
  });
});
