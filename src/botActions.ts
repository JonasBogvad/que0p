import type { Bot } from '@twurple/easy-bot';

let _bot: Bot | null = null;

export function setBotInstance(bot: Bot): void {
  _bot = bot;
}

export async function joinChannel(channel: string, firstJoin = false): Promise<void> {
  if (!_bot) throw new Error('Bot not initialized');
  await _bot.join(channel);
  if (firstJoin) {
    // Small delay to ensure the bot is ready to send messages
    setTimeout(() => {
      void _bot!.say(channel, '> que0p connected — type !qhelp for commands');
    }, 3000);
  }
}

export function leaveChannel(channel: string): void {
  if (!_bot) return;
  _bot.leave(channel);
}

export function sayInChannel(channel: string, text: string): void {
  if (!_bot) return;
  void _bot.say(channel, text);
}

/**
 * Which of the given logins are live right now, in one Helix call.
 * Returns null when status can't be determined (bot not ready / API error).
 */
export async function getLiveChannels(logins: readonly string[]): Promise<Set<string> | null> {
  if (logins.length === 0) return new Set();
  if (!_bot) return null;
  try {
    const streams = await _bot.api.streams.getStreamsByUserNames([...logins]);
    return new Set(streams.map(s => s.userName));
  } catch (err) {
    console.error('[deploy] Live check failed:', err);
    return null;
  }
}

// Returns null when status can't be determined (bot not ready / API error) —
// callers must treat null as "unknown", not as offline.
export async function isChannelLive(channel: string): Promise<boolean | null> {
  if (!_bot) return null;
  try {
    const stream = await _bot.api.streams.getStreamByUserName(channel);
    return stream !== null;
  } catch (err) {
    console.error(`[watchdog] Live check failed for #${channel}:`, err);
    return null;
  }
}
