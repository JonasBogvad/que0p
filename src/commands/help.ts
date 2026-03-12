import { createBotCommand } from '@twurple/easy-bot';
import { checkCooldown } from '../state/cooldown.js';

const COOLDOWN_MS = 30_000;

export const helpCommand = createBotCommand('help', async (_params, ctx) => {
  if (!checkCooldown(ctx.userName, 'help', COOLDOWN_MS)) return;
  await ctx.say(
    '📋 Commands: !join, !leave, !pos, !ready, !skip | Mods: !open seq/ran, !stop, !draw, !queue, !skip, !reset',
  );
});
