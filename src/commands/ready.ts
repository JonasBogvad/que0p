import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

export const readyCommand = createBotCommand('qready', async (_params, ctx) => {
  const { readyup, lobby } = getChannelState(ctx.broadcasterName);
  if (!readyup.isWaitingForReady()) return;
  const confirmed = readyup.confirmReady(ctx.userName, ctx.say);
  if (confirmed) lobby.add(ctx.userName);
});
