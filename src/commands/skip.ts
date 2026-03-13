import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const skipCommand = createBotCommand('qskip', async (_params, ctx) => {
  const { readyup } = getChannelState(ctx.broadcasterName);
  if (!readyup.isWaitingForReady()) return;

  const pending = readyup.getPendingWinner();
  if (ctx.userName === pending) {
    readyup.skipCurrent(ctx.say);
  } else if (ctx.msg.userInfo.isMod || ctx.msg.userInfo.isBroadcaster) {
    readyup.skipCurrent(ctx.say);
  }
});
