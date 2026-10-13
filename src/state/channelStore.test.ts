import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSnapshot, createSnapshotWriter, EMPTY_SNAPSHOT, ChannelSnapshot } from './channelStore.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'que0p-store-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe('readSnapshot', () => {
  it('returns null when the file is missing', async () => {
    expect(await readSnapshot(join(dir, 'nope.json'))).toBeNull();
  });

  it('returns null on corrupt JSON', async () => {
    const f = join(dir, 'bad.json');
    await writeFile(f, '{ not json');
    expect(await readSnapshot(f)).toBeNull();
  });

  it('upgrades the legacy plain-array format to a snapshot', async () => {
    const f = join(dir, 'legacy.json');
    await writeFile(f, JSON.stringify(['alice', 'bob', 42, null]));
    expect(await readSnapshot(f)).toEqual({ ...EMPTY_SNAPSHOT, players: ['alice', 'bob'] });
  });

  it('fills defaults for missing fields and drops invalid values', async () => {
    const f = join(dir, 'partial.json');
    await writeFile(f, JSON.stringify({ players: ['a'], open: 'yes', mode: 'bogus', lobby: 'x', lastActivityAt: '1' }));
    expect(await readSnapshot(f)).toEqual({ ...EMPTY_SNAPSHOT, players: ['a'] });
  });

  it('round-trips a full snapshot', async () => {
    const f = join(dir, 'full.json');
    const snap: ChannelSnapshot = {
      players: ['a', 'b'], open: true, mode: 'ran', lobby: ['c'], pending: ['d'], banned: ['e'], lastActivityAt: 1234,
    };
    await writeFile(f, JSON.stringify(snap));
    expect(await readSnapshot(f)).toEqual(snap);
  });
});

describe('createSnapshotWriter', () => {
  it('writes the latest snapshot when called rapidly and leaves no temp file', async () => {
    const f = join(dir, 'queue-x.json');
    const w = createSnapshotWriter(f);
    for (let i = 0; i < 5; i++) w.write({ ...EMPTY_SNAPSHOT, players: [`p${i}`] });
    await w.idle();
    const onDisk = JSON.parse(await readFile(f, 'utf-8')) as ChannelSnapshot;
    expect(onDisk.players).toEqual(['p4']);
    expect(await readdir(dir)).toEqual(['queue-x.json']);
  });

  it('idle resolves immediately when nothing is pending', async () => {
    const w = createSnapshotWriter(join(dir, 'never.json'));
    await expect(w.idle()).resolves.toBeUndefined();
    expect(await readdir(dir)).toEqual([]);
  });
});
