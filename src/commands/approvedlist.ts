import { createBotCommand } from '@twurple/easy-bot';
import { config } from '../config.js';
import * as channels from '../state/channels.js';

export const approvedListCommand = createBotCommand('qapproved', async (_params, ctx) => {
  if (ctx.broadcasterName !== config.channel.toLowerCase()) return;
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const list = channels.getApproved();
  if (list.length === 0) {
    await ctx.say('> no approved channels yet — use !qallow <username>');
    return;
  }
  await ctx.say(`> approved (${list.length}): ${list.join(', ')}`);
});
