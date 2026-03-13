import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const nextroundCommand = createBotCommand('qnext', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;
  const { queue, readyup, lobby } = getChannelState(ctx.broadcasterName);

  const players = lobby.list();
  if (players.length === 0) {
    await ctx.say('> lobby is empty');
    return;
  }

  readyup.cancelAll();
  players.forEach(login => queue.join(login));
  lobby.clear();

  console.log(`[cmd] ${ctx.userName} nextround in #${ctx.broadcasterName} — requeued: ${players.join(', ')}`);
  await ctx.say(`> round over — ${players.join(', ')} requeued`);
});
