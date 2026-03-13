import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const COOLDOWN_MS = 30_000;

export const helpCommand = createBotCommand('help', async (_params, ctx) => {
  const { cooldown } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'help', COOLDOWN_MS)) return;
  await ctx.say(
    '>_ cmds: !join !leave !pos !ready !skip | mods: !open seq/ran !stop !draw !queue !nextround !reset | que0p.stream',
  );
});
