import { RefreshingAuthProvider } from '@twurple/auth';
import { readFile, writeFile } from 'fs/promises';
import { config } from './config.js';
import { TOKENS_PATH } from './paths.js';

// Resolved bot user ID (set after token validation on startup)
let _botUserId: string | null = null;

export function getBotUserId(): string | null {
  return _botUserId;
}

async function validateToken(accessToken: string): Promise<{ user_id: string; login: string } | null> {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { 'Authorization': `OAuth ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ user_id: string; login: string }>;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string }>;
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
    await writeFile(TOKENS_PATH, JSON.stringify(newTokenData, null, 2), 'utf-8');
    console.log('[auth] Token refreshed and persisted');
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenData = await loadTokenData() as any;
  const storedAccessToken = tokenData.accessToken as string;

  // Validate the stored token — if expired, refresh it before proceeding
  let userData = await validateToken(storedAccessToken);
  if (!userData) {
    console.log('[auth] Access token expired, refreshing...');
    const refreshed = await refreshAccessToken(tokenData.refreshToken as string);
    tokenData.accessToken = refreshed.access_token;
    tokenData.refreshToken = refreshed.refresh_token;
    tokenData.obtainmentTimestamp = Date.now();
    await writeFile(TOKENS_PATH, JSON.stringify(tokenData, null, 2), 'utf-8');
    userData = await validateToken(tokenData.accessToken as string);
    if (!userData) throw new Error('Token refresh succeeded but validation still failed.');
  }

  _botUserId = userData.user_id;
  console.log(`[auth] Bot user: ${userData.login} (${userData.user_id})`);

  await authProvider.addUserForToken(tokenData, ['chat']);

  return authProvider;
}
