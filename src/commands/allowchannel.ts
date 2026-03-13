import { createBotCommand } from '@twurple/easy-bot';
import { config } from '../config.js';
import * as channels from '../state/channels.js';

export const allowChannelCommand = createBotCommand('allowchannel', async (params, ctx) => {
  // Only works in the owner's channel
  if (ctx.broadcasterName !== config.channel.toLowerCase()) return;
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const target = params[0]?.toLowerCase();
  if (!target) {
    await ctx.say('Usage: !allowchannel <username>');
    return;
  }

  await channels.approve(target);
  await ctx.say(
    `✅ ${target} is now approved. They can add the bot at: ${config.appUrl}/add-channel`,
  );
});
