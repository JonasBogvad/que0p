import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  clientId: requireEnv('TWITCH_CLIENT_ID'),
  clientSecret: requireEnv('TWITCH_CLIENT_SECRET'),
  channel: requireEnv('TWITCH_CHANNEL'),
  botUserId: requireEnv('BOT_USER_ID'),
  whitelist: (process.env['TWITCH_WHITELIST'] ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  appUrl: process.env['APP_URL'] ?? 'http://localhost:8080',
};
