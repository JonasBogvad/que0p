import { writeFile, readFile, rename } from 'node:fs/promises';

export type QueueMode = 'seq' | 'ran';

/**
 * Everything about a channel's queue session that must survive a restart.
 * Persisted as `queue-{channel}.json`. Older files hold a bare string[] of
 * players; `readSnapshot` upgrades those transparently.
 */
export interface ChannelSnapshot {
  players: string[];
  open: boolean;
  mode: QueueMode | null;
  lobby: string[];
  pending: string[];
  banned: string[];
  lastActivityAt: number | null;
}

export const EMPTY_SNAPSHOT: Readonly<ChannelSnapshot> = Object.freeze({
  players: [],
  open: false,
  mode: null,
  lobby: [],
  pending: [],
  banned: [],
  lastActivityAt: null,
});

export function emptySnapshot(): ChannelSnapshot {
  return { players: [], open: false, mode: null, lobby: [], pending: [], banned: [], lastActivityAt: null };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function toSnapshot(data: unknown): ChannelSnapshot | null {
  if (Array.isArray(data)) {
    return { ...emptySnapshot(), players: stringList(data) };
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  return {
    players: stringList(d.players),
    open: d.open === true,
    mode: d.mode === 'seq' || d.mode === 'ran' ? d.mode : null,
    lobby: stringList(d.lobby),
    pending: stringList(d.pending),
    banned: stringList(d.banned),
    lastActivityAt: typeof d.lastActivityAt === 'number' && Number.isFinite(d.lastActivityAt)
      ? d.lastActivityAt
      : null,
  };
}

/** Returns null when the file is missing or unreadable; a corrupt file is logged, never thrown. */
export async function readSnapshot(file: string): Promise<ChannelSnapshot | null> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[store] Failed to read ${file}:`, err);
    }
    return null;
  }
  try {
    return toSnapshot(JSON.parse(raw));
  } catch (err) {
    console.error(`[store] Corrupt snapshot in ${file}, starting fresh:`, err);
    return null;
  }
}

export interface SnapshotWriter {
  /** Fire-and-forget. Rapid calls coalesce: only the latest snapshot reaches disk. */
  write(snapshot: ChannelSnapshot): void;
  /** Resolves once nothing is in flight or queued. */
  idle(): Promise<void>;
}

export function createSnapshotWriter(file: string): SnapshotWriter {
  let _inFlight: Promise<void> | null = null;
  let _queued: ChannelSnapshot | null = null;

  async function flushOnce(snapshot: ChannelSnapshot): Promise<void> {
    const tmp = `${file}.tmp`;
    try {
      // Write-then-rename so a crash mid-write never leaves a half-written file behind.
      await writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf-8');
      await rename(tmp, file);
    } catch (err) {
      console.error(`[store] Failed to persist ${file}:`, err);
    }
  }

  function start(snapshot: ChannelSnapshot): void {
    _inFlight = flushOnce(snapshot).then(() => {
      _inFlight = null;
      if (_queued) {
        const next = _queued;
        _queued = null;
        start(next);
      }
    });
  }

  return {
    write(snapshot) {
      if (_inFlight) {
        _queued = snapshot;
      } else {
        start(snapshot);
      }
    },
    async idle() {
      while (_inFlight) await _inFlight;
    },
  };
}
