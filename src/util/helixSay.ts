import { getAccessToken, getBotUserId } from '../auth.js';
import { config } from '../config.js';

// Cache channel login → numeric broadcaster ID (never changes)
const _broadcasterIds = new Map<string, string>();

async function getBroadcasterId(channel: string, accessToken: string): Promise<string | null> {
  const cached = _broadcasterIds.get(channel);
  if (cached) return cached;

  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': config.clientId,
      },
    },
  );

  if (!res.ok) {
    console.error(`[helix] Failed to look up broadcaster ID for ${channel}: ${res.status}`);
    return null;
  }

  const data = await res.json() as { data: Array<{ id: string }> };
  const id = data.data[0]?.id ?? null;
  if (id) _broadcasterIds.set(channel, id);
  return id;
}

export function createHelixSay(
  fallback: (channel: string, message: string) => Promise<void>,
): (channel: string, message: string) => Promise<void> {
  return async function helixSay(channel: string, message: string): Promise<void> {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        console.error('[helix] No access token — falling back to IRC');
        await fallback(channel, message);
        return;
      }

      const broadcasterId = await getBroadcasterId(channel, accessToken);
      if (!broadcasterId) {
        console.error(`[helix] No broadcaster ID for ${channel} — falling back to IRC`);
        await fallback(channel, message);
        return;
      }

      const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': config.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcaster_id: broadcasterId,
          sender_id: getBotUserId(),
          message,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[helix] Failed to send message to #${channel}: ${res.status} ${body} — falling back to IRC`);
        await fallback(channel, message);
      }
    } catch (err) {
      console.error(`[helix] Unexpected error sending to #${channel}:`, err);
      await fallback(channel, message);
    }
  };
}
