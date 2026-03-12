/**
 * One-time OAuth setup script.
 * Run with: npm run setup
 *
 * Step 1 — Log in as the BOT account → saves tokens.json
 * Step 2 — Log in as YOUR STREAMER account → grants channel:bot (enables bot badge)
 *
 * Prerequisites:
 *   - Register http://localhost:3000/callback as a redirect URI in your
 *     Twitch app at dev.twitch.tv/console/apps
 *   - Fill in TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env
 */
import 'dotenv/config';
import express from 'express';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const BOT_SCOPES = 'chat:read chat:edit user:bot';
const BROADCASTER_SCOPES = 'channel:bot';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('❌ TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env');
  console.error('   Copy .env.example to .env and fill in your app credentials from dev.twitch.tv/console');
  process.exit(1);
}

function buildAuthUrl(scopes: string, state: string): string {
  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('client_id', clientId!);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  // force_verify ensures Twitch shows the account switcher even if already logged in
  url.searchParams.set('force_verify', 'true');
  return url.toString();
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, err => {
    if (err) console.warn('   (Could not open browser automatically — visit the URL above manually)');
  });
}

const app = express();

app.get('/callback', async (req, res) => {
  const code = req.query['code'];
  const state = req.query['state'];

  if (typeof code !== 'string') {
    res.status(400).send(page('❌ Authorization cancelled', 'Did you deny the request? Close this tab and re-run <code>npm run setup</code>.'));
    return;
  }

  // ── Step 1: Bot account ──────────────────────────────────────────────────
  if (state === 'bot') {
    try {
      const params = new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      });

      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Token exchange failed (${response.status}): ${body}`);
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope: string[];
      };

      // Save in Twurple's expected camelCase format
      const tokenData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        obtainmentTimestamp: Date.now(),
        scope: data.scope,
      };

      await writeFile('./tokens.json', JSON.stringify(tokenData, null, 2), 'utf-8');
      console.log('✅ Step 1 complete — bot tokens saved to tokens.json');

      // Kick off step 2
      const broadcasterUrl = buildAuthUrl(BROADCASTER_SCOPES, 'broadcaster');
      console.log('');
      console.log('─────────────────────────────────────────────────────');
      console.log('Step 2 of 2 — Broadcaster grant');
      console.log('Log in as YOUR STREAMER ACCOUNT (not the bot account)');
      console.log('─────────────────────────────────────────────────────');
      console.log(`Opening browser...\n  ${broadcasterUrl}`);
      openBrowser(broadcasterUrl);

      res.send(page(
        '✅ Step 1 complete — bot authorized',
        'Now log in as your <strong>streamer account</strong> in the new browser window to complete setup.',
      ));
    } catch (err) {
      console.error('❌ Bot token exchange failed:', err);
      res.status(500).send(page('❌ Token exchange failed', 'Check the console for details.'));
    }
    return;
  }

  // ── Step 2: Broadcaster grant ────────────────────────────────────────────
  if (state === 'broadcaster') {
    // We don't need to save anything — Twitch records the channel:bot grant.
    // Optionally we could exchange the code but it's not required for the badge.
    console.log('✅ Step 2 complete — broadcaster granted channel:bot');
    console.log('');
    console.log('🎉 Setup complete! You can now run the bot with `npm run dev`');

    res.send(page(
      '🎉 Setup complete!',
      'Both steps done. You can close this tab and run <code>npm run dev</code> to start the bot.',
    ));

    server.close(() => process.exit(0));
    return;
  }

  res.status(400).send(page('❌ Unknown state', 'Unexpected callback. Re-run <code>npm run setup</code>.'));
});

// ── Start: open bot auth ───────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const botUrl = buildAuthUrl(BOT_SCOPES, 'bot');
  console.log('');
  console.log('─────────────────────────────────────────────────────');
  console.log('Step 1 of 2 — Bot account auth');
  console.log('Log in as YOUR BOT ACCOUNT (not your streamer account)');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Opening browser...\n  ${botUrl}`);
  openBrowser(botUrl);
});

// ── HTML helper ───────────────────────────────────────────────────────────
function page(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:sans-serif;max-width:500px;margin:80px auto;padding:0 20px}
h2{margin-bottom:8px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px}</style>
</head><body><h2>${title}</h2><p>${body}</p></body></html>`;
}
