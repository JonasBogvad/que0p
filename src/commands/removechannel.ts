import { createBotCommand } from '@twurple/easy-bot';
import { config } from '../config.js';
import * as channels from '../state/channels.js';
import { leaveChannel } from '../botActions.js';

export const removeChannelCommand = createBotCommand('removechannel', async (_params, ctx) => {
  // Cannot remove the owner's channel
  if (ctx.broadcasterName === config.channel) return;
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const ch = ctx.broadcasterName;
  await channels.removeActive(ch);
  await ctx.say('👋 Bot is leaving this channel. Goodbye!');
  leaveChannel(ch);
});
