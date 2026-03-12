import { createBotCommand } from '@twurple/easy-bot';
import * as queue from '../state/queue.js';
import * as readyup from '../state/readyup.js';

export const stopCommand = createBotCommand('stop', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  readyup.cancelAll();
  queue.stopAnnounce();
  queue.close();
  await ctx.say('📋 Queue closed.');
});
