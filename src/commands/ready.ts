import { createBotCommand } from '@twurple/easy-bot';
import * as readyup from '../state/readyup.js';

export const readyCommand = createBotCommand('ready', async (_params, ctx) => {
  // Silently ignore if no ready-up is in progress
  if (!readyup.isWaitingForReady()) return;
  // confirmReady handles the say() itself on success; silently ignore wrong users
  readyup.confirmReady(ctx.userName, ctx.say);
});
