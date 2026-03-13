import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const drawCommand = createBotCommand('draw', async (params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  let n = 1;
  if (params.length > 0 && params[0] !== '') {
    const parsed = parseInt(params[0], 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
      await ctx.say('Usage: !draw or !draw 1-5');
      return;
    }
    n = parsed;
  }

  const { queue, activity, readyup } = getChannelState(ctx.broadcasterName);

  if (readyup.isWaitingForReady()) {
    await ctx.say(`💣 Still waiting for @${readyup.getPendingWinner()} to ready up!`);
    return;
  }

  const mode = queue.getMode();
  if (!mode) {
    await ctx.say('❌ Queue is not open. Use !open seq or !open ran first.');
    return;
  }

  const filterFn = (login: string) => activity.isActive(login);
  const winners: string[] = [];

  for (let i = 0; i < n; i++) {
    const winner = mode === 'seq'
      ? queue.drawSequential(filterFn)
      : queue.drawRandom(filterFn);
    if (!winner) break;
    winners.push(winner);
  }

  if (winners.length === 0) {
    await ctx.say('💤 No active players in the queue. (Must have chatted in the last 10 min)');
    return;
  }

  if (winners.length < n) {
    await ctx.say(
      `⚔️ Only ${winners.length} eligible player${winners.length === 1 ? '' : 's'} found. Drawing ${winners.length}.`,
    );
  }

  console.log(`[cmd] ${ctx.userName} drew ${winners.length} player(s) in #${ctx.broadcasterName}: ${winners.join(', ')}`);
  readyup.startMultiReadyUp(
    winners,
    (login) => { console.log(`[readyup] Slot lost: ${login} in #${ctx.broadcasterName}`); },
    (login) => { console.log(`[readyup] Ready: ${login} in #${ctx.broadcasterName}`); },
    ctx.say,
  );
});
