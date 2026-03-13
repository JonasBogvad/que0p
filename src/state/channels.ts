import { writeFile, readFile } from 'fs/promises';
import { CHANNELS_FILE, APPROVED_FILE } from '../paths.js';
import { config } from '../config.js';

let _active: string[] = [];
let _approved = new Set<string>();

async function persistActive(): Promise<void> {
  await writeFile(CHANNELS_FILE, JSON.stringify(_active, null, 2), 'utf-8');
}

async function persistApproved(): Promise<void> {
  await writeFile(APPROVED_FILE, JSON.stringify([..._approved], null, 2), 'utf-8');
}

export async function loadChannels(): Promise<void> {
  try {
    const data = JSON.parse(await readFile(CHANNELS_FILE, 'utf-8')) as unknown;
    if (Array.isArray(data)) _active = data as string[];
  } catch { /* start fresh */ }

  try {
    const data = JSON.parse(await readFile(APPROVED_FILE, 'utf-8')) as unknown;
    if (Array.isArray(data)) _approved = new Set(data as string[]);
  } catch { /* start fresh */ }

  // Owner channel is always active
  const owner = config.channel.toLowerCase();
  if (!_active.includes(owner)) {
    _active.push(owner);
  }
}

export function getActive(): string[] {
  return [..._active];
}

export function isApproved(channel: string): boolean {
  return _approved.has(channel.toLowerCase());
}

export function getApproved(): string[] {
  return [..._approved];
}

export async function approve(channel: string): Promise<void> {
  _approved.add(channel.toLowerCase());
  await persistApproved();
}

export async function revoke(channel: string): Promise<void> {
  _approved.delete(channel.toLowerCase());
  await persistApproved();
}

export async function addActive(channel: string): Promise<void> {
  const ch = channel.toLowerCase();
  if (!_active.includes(ch)) {
    _active.push(ch);
    await persistActive();
  }
}

export async function removeActive(channel: string): Promise<void> {
  const ch = channel.toLowerCase();
  _active = _active.filter(c => c !== ch);
  await persistActive();
}
