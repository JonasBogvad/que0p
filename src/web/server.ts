import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import * as channels from '../state/channels.js';
import { joinChannel } from '../botActions.js';
import { initChannelState } from '../state/perChannel.js';

export function startWebServer(): void {
  const app = express();

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self'",
        "img-src 'self' data:",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    next();
  });

  // Serve the React landing page (built frontend)
  const frontendDist = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/add-channel', (_req, res) => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.appUrl}/callback`,
      response_type: 'code',
      scope: 'channel:bot',
      force_verify: 'true',
    });
    res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
  });

  app.get('/callback', async (req, res) => {
    const code = req.query['code'] as string | undefined;
    const error = req.query['error'] as string | undefined;

    if (error || !code) {
      console.log(`[web] /callback denied — error: ${error}`);
      res.redirect('/error.html?reason=Authorization+denied+or+failed.');
      return;
    }

    try {
      // Exchange code for token
      const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${config.appUrl}/callback`,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error(`[web] /callback token exchange failed: ${tokenRes.status} — ${body}`);
        res.redirect('/error.html?reason=Failed+to+exchange+authorization+code.');
        return;
      }

      const tokenData = await tokenRes.json() as { access_token: string };

      // Get broadcaster's login
      const userRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Client-Id': config.clientId,
        },
      });

      if (!userRes.ok) {
        res.redirect('/error.html?reason=Failed+to+fetch+user+info.');
        return;
      }

      const userData = await userRes.json() as { data: Array<{ login: string }> };
      const login = userData.data[0]?.login?.toLowerCase();

      if (!login) {
        console.log('[web] /callback — could not resolve login from Twitch');
        res.redirect('/error.html?reason=Could+not+determine+your+Twitch+username.');
        return;
      }

      console.log(`[web] /callback — login: ${login}`);

      // Check whitelist (empty whitelist = open to all)
      const isWhitelisted =
        config.whitelist.length === 0 ||
        config.whitelist.includes(login) ||
        channels.isApproved(login);

      if (!isWhitelisted) {
        console.log(`[web] /callback — ${login} not whitelisted (approved: ${channels.isApproved(login)}, whitelist: ${config.whitelist})`);
        res.redirect(`/error.html?reason=${encodeURIComponent(`${login} is not on the approved list.`)}`);
        return;
      }

      // Already active?
      if (channels.getActive().includes(login)) {
        console.log(`[web] /callback — ${login} already active`);
        res.redirect(`/success.html?channel=${encodeURIComponent(login)}`);
        return;
      }

      await channels.addActive(login);
      await initChannelState(login);
      await joinChannel(login);

      console.log(`[web] /callback — bot joined ${login}`);
      res.redirect(`/success.html?channel=${encodeURIComponent(login)}`);
    } catch (err) {
      console.error('[web] /callback error:', err);
      res.redirect('/error.html?reason=An+unexpected+error+occurred.');
    }
  });

  app.listen(8080, () => {
    console.log('[web] Server listening on :8080');
  });
}
