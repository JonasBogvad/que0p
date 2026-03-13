import { join } from 'node:path';

export const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : '.';

export const TOKENS_PATH = join(DATA_DIR, 'tokens.json');
export const CHANNELS_FILE = join(DATA_DIR, 'channels.json');
export const APPROVED_FILE = join(DATA_DIR, 'approved.json');

export function queueFile(channel: string): string {
  return join(DATA_DIR, `queue-${channel}.json`);
}
