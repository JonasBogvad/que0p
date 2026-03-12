import { join } from 'node:path';

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : '.';

export const TOKENS_PATH = join(DATA_DIR, 'tokens.json');
export const QUEUE_FILE = join(DATA_DIR, 'queue.json');
