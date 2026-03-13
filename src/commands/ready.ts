import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const readyCommand = createBotCommand('ready', async (_params, ctx) => {
  const { readyup } = getChannelState(ctx.broadcasterName);
  if (!readyup.isWaitingForReady()) return;
  readyup.confirmReady(ctx.userName, ctx.say);
});
