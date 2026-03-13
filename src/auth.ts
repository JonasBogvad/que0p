import { RefreshingAuthProvider } from '@twurple/auth';
import { readFile, writeFile } from 'fs/promises';
import { config } from './config.js';
import { TOKENS_PATH } from './paths.js';

// Latest access token and resolved bot user ID
let _accessToken: string | null = null;
let _botUserId: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getBotUserId(): string | null {
  return _botUserId;
}

async function resolveUserId(accessToken: string): Promise<string> {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { 'Authorization': `OAuth ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Token validation failed: ${res.status}`);
  const data = await res.json() as { user_id: string; login: string };
  console.log(`[auth] Bot user: ${data.login} (${data.user_id})`);
  return data.user_id;
}

async function loadTokenData(): Promise<unknown> {
  // Always try the file first — on Fly the volume (/data/tokens.json) holds the
  // latest refreshed token, which is more up-to-date than the TWITCH_BOT_TOKENS
  // secret (which is only set once at deploy time).
  try {
    return JSON.parse(await readFile(TOKENS_PATH, 'utf-8'));
  } catch {
    // File doesn't exist yet — fall back to the env var (first cold start on Fly)
    if (process.env.TWITCH_BOT_TOKENS) {
      // Try plain JSON first, fall back to base64-encoded JSON
      try {
        return JSON.parse(process.env.TWITCH_BOT_TOKENS);
      } catch {
        const raw = Buffer.from(process.env.TWITCH_BOT_TOKENS, 'base64').toString('utf-8');
        return JSON.parse(raw);
      }
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
    _accessToken = newTokenData.accessToken;
    await writeFile(TOKENS_PATH, JSON.stringify(newTokenData, null, 2), 'utf-8');
    // Re-resolve user ID on refresh (login doesn't change but keeps _botUserId fresh)
    _botUserId = await resolveUserId(_accessToken);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenData = await loadTokenData() as any;
  _accessToken = tokenData.accessToken as string;
  _botUserId = await resolveUserId(_accessToken);
  await authProvider.addUserForToken(tokenData, ['chat']);

  return authProvider;
}
