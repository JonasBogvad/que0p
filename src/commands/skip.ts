import { createBotCommand } from '@twurple/easy-bot';
import * as readyup from '../state/readyup.js';

export const skipCommand = createBotCommand('skip', async (_params, ctx) => {
  if (!readyup.isWaitingForReady()) return;

  const pending = readyup.getPendingWinner();

  if (ctx.userName === pending) {
    // Drawn viewer self-skips (declines their slot)
    readyup.skipCurrent(ctx.say);
  } else if (ctx.msg.userInfo.isMod || ctx.msg.userInfo.isBroadcaster) {
    // Mod/broadcaster force-skips the current pending winner
    readyup.skipCurrent(ctx.say);
  }
  // Everyone else: silently ignore
});
