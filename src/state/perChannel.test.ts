import { describe, it, expect, vi } from 'vitest';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const { dir } = await vi.hoisted(async () => {
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  return { dir: await mkdtemp(join(tmpdir(), 'que0p-chan-')) };
});

vi.mock('../paths.js', async () => {
  const { join } = await import('node:path');
  return { queueFile: (channel: string) => join(dir, `queue-${channel}.json`) };
});

const { initChannelState, getChannelState } = await import('./perChannel.js');

const fileOf = (ch: string) => join(dir, `queue-${ch}.json`);

describe('per-channel state persistence', () => {
  it('starts empty and writes nothing until something changes', async () => {
    const restored = await initChannelState('fresh');
    expect(restored).toBeNull();
    const s = getChannelState('fresh');
    expect(s.queue.list()).toEqual([]);
    await s.flush();
    await expect(stat(fileOf('fresh'))).rejects.toThrow();
  });

  it('restores players from a legacy array file and reports nothing to resume', async () => {
    await writeFile(fileOf('legacy'), JSON.stringify(['a', 'b']));
    expect(await initChannelState('legacy')).toBeNull();
    const s = getChannelState('legacy');
    expect(s.queue.list()).toEqual(['a', 'b']);
    expect(s.queue.isQueueOpen()).toBe(false);
  });

  it('restores an open session, returns mid-ready-up players to the front, and rewrites the file', async () => {
    await writeFile(fileOf('live'), JSON.stringify({
      players: ['a'], open: true, mode: 'seq', lobby: ['d'], pending: ['b', 'c'], banned: ['e'], lastActivityAt: 123,
    }));
    const restored = await initChannelState('live');
    expect(restored).toEqual({ channel: 'live', mode: 'seq', size: 3, returnedToFront: ['b', 'c'] });

    const s = getChannelState('live');
    expect(s.queue.list()).toEqual(['b', 'c', 'a']);
    expect(s.queue.isQueueOpen()).toBe(true);
    expect(s.queue.getLastActivityAt()).toBe(123);
    expect(s.lobby.list()).toEqual(['d']);
    expect(s.banlist.isBanned('e')).toBe(true);
    expect(s.readyup.isWaitingForReady()).toBe(false);

    await s.flush();
    const onDisk = JSON.parse(await readFile(fileOf('live'), 'utf-8'));
    expect(onDisk.players).toEqual(['b', 'c', 'a']);
    expect(onDisk.pending).toEqual([]);
    expect(onDisk.open).toBe(true);
  });

  it('persists queue, lobby, bans and pending ready-ups as one snapshot', async () => {
    await initChannelState('session');
    const s = getChannelState('session');
    s.queue.open('ran');
    s.queue.join('p1');
    s.queue.join('p2');
    s.lobby.add('l1');
    s.banlist.ban('bad');
    s.readyup.startMultiReadyUp(['w1', 'w2'], () => {}, () => {}, () => {});
    await s.flush();

    const onDisk = JSON.parse(await readFile(fileOf('session'), 'utf-8'));
    expect(onDisk).toMatchObject({
      players: ['p1', 'p2'], open: true, mode: 'ran', lobby: ['l1'], banned: ['bad'], pending: ['w1', 'w2'],
    });
    expect(typeof onDisk.lastActivityAt).toBe('number');
    s.readyup.cancelAll();
  });
});

describe('per-channel restore edge cases', () => {
  it('does not hand a queue spot to someone already in the lobby', async () => {
    await writeFile(fileOf('overlap'), JSON.stringify({
      players: [], open: true, mode: 'ran', lobby: ['b'], pending: ['b', 'c'], banned: [], lastActivityAt: 1,
    }));
    const restored = await initChannelState('overlap');
    expect(restored).toEqual({ channel: 'overlap', mode: 'ran', size: 1, returnedToFront: ['c'] });
    expect(getChannelState('overlap').lobby.list()).toEqual(['b']);
  });

  it('leaves live state alone when init runs again for the same channel', async () => {
    await initChannelState('again');
    const s = getChannelState('again');
    s.queue.open('seq');
    s.queue.join('live-player');
    await s.flush();
    await writeFile(fileOf('again'), JSON.stringify(['from-disk']));
    expect(await initChannelState('again')).toBeNull();
    expect(s.queue.list()).toEqual(['live-player']);
    expect(s.queue.isQueueOpen()).toBe(true);
  });
});
