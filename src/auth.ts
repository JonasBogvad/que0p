import { RefreshingAuthProvider } from '@twurple/auth';
import { readFile, writeFile } from 'fs/promises';
import { config } from './config.js';
import { TOKENS_PATH } from './paths.js';

async function loadTokenData(): Promise<unknown> {
  // Always try the file first — on Fly the volume (/data/tokens.json) holds the
  // latest refreshed token, which is more up-to-date than the TWITCH_BOT_TOKENS
  // secret (which is only set once at deploy time).
  try {
    return JSON.parse(await readFile(TOKENS_PATH, 'utf-8'));
  } catch {
    // File doesn't exist yet — fall back to the env var (first cold start on Fly)
    if (process.env.TWITCH_BOT_TOKENS) {
      return JSON.parse(process.env.TWITCH_BOT_TOKENS);
    }
    throw new Error(`No tokens found. Run \`npm run setup\` to authorize the bot.`);
  }
}

export async function createAuthProvider(): Promise<RefreshingAuthProvider> {
  const authProvider = new RefreshingAuthProvider({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  authProvider.onRefresh(async (_userId, newTokenData) => {
    // Always persist refreshed tokens to file (works locally and on Fly volume)
    await writeFile(TOKENS_PATH, JSON.stringify(newTokenData, null, 2), 'utf-8');
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenData = await loadTokenData() as any;
  await authProvider.addUserForToken(tokenData, ['chat']);

  return authProvider;
}
