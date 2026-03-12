import { createBotCommand } from '@twurple/easy-bot';
import * as queue from '../state/queue.js';
import * as readyup from '../state/readyup.js';

export const resetCommand = createBotCommand('reset', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  readyup.cancelAll();
  queue.stopAnnounce();
  queue.close();
  queue.clear();
  await ctx.say('✅ Queue has been reset and any pending ready-up cancelled.');
});
