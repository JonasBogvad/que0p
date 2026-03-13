import { writeFile, readFile } from 'fs/promises';
import { STATS_FILE } from '../paths.js';

interface Stats {
  queuesStarted: number;
  playersConfirmed: number;
  channelsAllTime: number;
}

let _stats: Stats = {
  queuesStarted: 0,
  playersConfirmed: 0,
  channelsAllTime: 0,
};

async function persist(): Promise<void> {
  await writeFile(STATS_FILE, JSON.stringify(_stats, null, 2), 'utf-8');
}

export async function loadStats(): Promise<void> {
  try {
    const data = JSON.parse(await readFile(STATS_FILE, 'utf-8')) as unknown;
    if (data && typeof data === 'object') {
      _stats = { ..._stats, ...(data as Partial<Stats>) };
    }
  } catch { /* start fresh */ }
}

export function getStats(): Stats {
  return { ..._stats };
}

export async function incrementQueuesStarted(): Promise<void> {
  _stats.queuesStarted++;
  await persist();
}

export async function incrementPlayersConfirmed(): Promise<void> {
  _stats.playersConfirmed++;
  await persist();
}

export async function incrementChannelsAllTime(): Promise<void> {
  _stats.channelsAllTime++;
  await persist();
}
