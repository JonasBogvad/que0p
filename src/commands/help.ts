import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const COOLDOWN_MS = 30_000;

export const helpCommand = createBotCommand('qhelp', async (_params, ctx) => {
  const { cooldown } = getChannelState(ctx.broadcasterName);
  if (!cooldown.checkCooldown(ctx.userName, 'qhelp', COOLDOWN_MS)) return;
  await ctx.say(
    '> cmds: !qjoin !qleave !qpos !qready !qskip | mods: !qopen seq/ran !qstop !qdraw !qlist !qremove !qnext !qreset !qban !qunban | que0p.stream',
  );
});
