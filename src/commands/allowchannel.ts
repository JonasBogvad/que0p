import { createBotCommand } from '@twurple/easy-bot';
import { config } from '../config.js';
import * as channels from '../state/channels.js';

export const allowChannelCommand = createBotCommand('qallow', async (params, ctx) => {
  // Only works in the owner's channel
  if (ctx.broadcasterName !== config.channel.toLowerCase()) return;
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const target = params[0]?.toLowerCase();
  if (!target) {
    await ctx.say('> usage: !qallow <username>');
    return;
  }

  await channels.approve(target);
  await ctx.say(`> ${target} approved — ${config.appUrl}/add-channel`);
});
