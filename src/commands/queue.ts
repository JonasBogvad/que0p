import { createBotCommand } from '@twurple/easy-bot';
import { getChannelState } from '../state/perChannel.js';

const MAX_LENGTH = 500;

export const queueCommand = createBotCommand('queue', async (_params, ctx) => {
  if (!ctx.msg.userInfo.isMod && !ctx.msg.userInfo.isBroadcaster) return;

  const { queue } = getChannelState(ctx.broadcasterName);
  const list = queue.list();
  const mode = queue.getMode();
  const statusStr =
    mode === 'seq' ? 'Open – Sequential' :
    mode === 'ran' ? 'Open – Random' :
    'Closed';

  if (list.length === 0) {
    await ctx.say(`📋 Queue [${statusStr}] is empty.`);
    return;
  }

  const prefix = `📋 Queue [${statusStr}] (${list.length}): `;
  const names = list.map((u, i) => `${i + 1}. ${u}`).join(', ');
  let message = prefix + names;
  if (message.length > MAX_LENGTH) {
    message = message.substring(0, MAX_LENGTH - 3) + '...';
  }
  await ctx.say(message);
});
