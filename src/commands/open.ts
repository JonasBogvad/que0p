import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';
import { incrementQueuesStarted } from '../state/stats.js';
import { createAnnounceTick } from '../util/queueWatchdog.js';

export const openCommand = createBotCommand('qopen', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const arg = params[0]?.toLowerCase();
  if (arg !== 'seq' && arg !== 'ran') {
    await ctx.say('> usage: !qopen seq or !qopen ran');
    return;
  }

  const { queue } = getChannelState(ctx.broadcasterName);
  if (queue.isQueueOpen()) {
    await ctx.say('> queue already open');
    return;
  }

  queue.open(arg);
  void incrementQueuesStarted();
  const modeName = arg === 'seq' ? 'sequential' : 'random';
  console.log(`[cmd] ${ctx.userName} opened queue in #${ctx.broadcasterName} (${modeName})`);
  const announceMsg = `>_ queue open [${modeName}] — type !qjoin to enter`;
  await ctx.say(announceMsg);

  queue.startAnnounce(createAnnounceTick(
    ctx.broadcasterName,
    () => { void ctx.say(announceMsg); },
    msg => { void ctx.say(msg); },
  ));
});
