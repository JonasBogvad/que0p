import type { Bot } from '@twurple/easy-bot';

let _bot: Bot | null = null;

export function setBotInstance(bot: Bot): void {
  _bot = bot;
}

export async function joinChannel(channel: string): Promise<void> {
  if (!_bot) throw new Error('Bot not initialized');
  await _bot.join(channel);
}

export function leaveChannel(channel: string): void {
  if (!_bot) return;
  _bot.leave(channel);
}

export function sayInChannel(channel: string, text: string): void {
  if (!_bot) return;
  void _bot.say(channel, text);
}
