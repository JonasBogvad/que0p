import { describe, it, expect, vi } from 'vitest';
import { computeDeployStatus, createDeployStatusProvider, ChannelActivity } from './deployStatus.js';

const idle: ChannelActivity = { channel: 'idle', open: false, waitingForReady: false };
const open: ChannelActivity = { channel: 'open', open: true, waitingForReady: false };
const drawing: ChannelActivity = { channel: 'drawing', open: true, waitingForReady: true };

describe('computeDeployStatus', () => {
  it('is not busy when no channel has a session in progress', () => {
    const s = computeDeployStatus([idle], new Set(['idle']), 0);
    expect(s).toEqual({ busy: false, liveStatus: 'known', busyChannels: [], checkedAt: '1970-01-01T00:00:00.000Z' });
  });

  it('is not busy when sessions exist but nobody is live', () => {
    expect(computeDeployStatus([open, drawing], new Set()).busy).toBe(false);
  });

  it('reports live channels with a session, naming the reason', () => {
    const s = computeDeployStatus([idle, open, drawing], new Set(['idle', 'open', 'drawing']));
    expect(s.busy).toBe(true);
    expect(s.busyChannels).toEqual([
      { channel: 'open', reason: 'queue open' },
      { channel: 'drawing', reason: 'ready-up in progress' },
    ]);
  });

  it('fails open when live status is unknown', () => {
    const s = computeDeployStatus([open], null);
    expect(s).toMatchObject({ busy: false, liveStatus: 'unknown', busyChannels: [] });
  });
});

describe('createDeployStatusProvider', () => {
  it('skips the Twitch call when no channel has a session', async () => {
    const fetchLive = vi.fn(async () => new Set<string>());
    const status = createDeployStatusProvider(() => [idle], fetchLive);
    expect((await status()).busy).toBe(false);
    expect(fetchLive).not.toHaveBeenCalled();
  });

  it('only asks Twitch about channels with a session, and caches the answer', async () => {
    let t = 1_000;
    const fetchLive = vi.fn(async (logins: string[]) => new Set(logins));
    const status = createDeployStatusProvider(() => [idle, open, drawing], fetchLive, { cacheMs: 30_000, now: () => t });

    const first = await status();
    expect(fetchLive).toHaveBeenCalledTimes(1);
    expect(fetchLive).toHaveBeenCalledWith(['open', 'drawing']);
    expect(first.busyChannels.map(c => c.channel)).toEqual(['open', 'drawing']);

    t += 10_000;
    expect(await status()).toBe(first);
    expect(fetchLive).toHaveBeenCalledTimes(1);

    t += 30_000;
    await status();
    expect(fetchLive).toHaveBeenCalledTimes(2);
  });
});
