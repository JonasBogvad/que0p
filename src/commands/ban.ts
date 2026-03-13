import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const banCommand = createBotCommand('qban', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const target = params[0]?.toLowerCase().replace(/^@/, '');
  if (!target) {
    await ctx.say('> usage: !qban <user>');
    return;
  }

  const { queue, banlist } = getChannelState(ctx.broadcasterName);
  banlist.ban(target);
  queue.leave(target); // remove from queue if already in it

  console.log(`[cmd] ${ctx.userName} banned ${target} from queue in #${ctx.broadcasterName}`);
  await ctx.say(`> ${target} banned from queue`);
});

export const unbanCommand = createBotCommand('qunban', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const target = params[0]?.toLowerCase().replace(/^@/, '');
  if (!target) {
    await ctx.say('> usage: !qunban <user>');
    return;
  }

  const { banlist } = getChannelState(ctx.broadcasterName);
  banlist.unban(target);

  console.log(`[cmd] ${ctx.userName} unbanned ${target} in #${ctx.broadcasterName}`);
  await ctx.say(`> ${target} unbanned`);
});

export const banlistCommand = createBotCommand('qbanlist', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const { banlist } = getChannelState(ctx.broadcasterName);
  const list = banlist.list();

  if (list.length === 0) {
    await ctx.say('> ban list is empty');
  } else {
    await ctx.say(`> banned (${list.length}): ${list.join(', ')}`);
  }
});
