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
      res.status(400).send('Authorization denied or failed.');
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
        res.status(500).send('Failed to exchange authorization code.');
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
        res.status(500).send('Failed to fetch user info.');
        return;
      }

      const userData = await userRes.json() as { data: Array<{ login: string }> };
      const login = userData.data[0]?.login?.toLowerCase();

      if (!login) {
        res.status(500).send('Could not determine your Twitch username.');
        return;
      }

      // Check whitelist (empty whitelist = open to all)
      const isWhitelisted =
        config.whitelist.length === 0 ||
        config.whitelist.includes(login) ||
        channels.isApproved(login);

      if (!isWhitelisted) {
        res
          .status(403)
          .send(
            `Sorry, <b>${login}</b> is not on the approved list. ` +
            `Ask the bot owner to run <code>!allowchannel ${login}</code> in their channel.`,
          );
        return;
      }

      // Already active?
      if (channels.getActive().includes(login)) {
        res.send(`✅ Bot is already in your channel, <b>${login}</b>!`);
        return;
      }

      await channels.addActive(login);
      await initChannelState(login);
      await joinChannel(login);

      res.send(
        `✅ Bot joined your channel, <b>${login}</b>! ` +
        `Type <code>!help</code> in chat to see commands.`,
      );
    } catch (err) {
      console.error('[web] /callback error:', err);
      res.status(500).send('An unexpected error occurred.');
    }
  });

  app.listen(8080, () => {
    console.log('[web] Server listening on :8080');
  });
}
